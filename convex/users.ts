import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { NAME_MAX_CHARS, TOKEN_MIN_LENGTH } from "./lib/constants";

// Owned by Track A. Players sign in with Google; the device token stays the session.
//
// Continue with Google, start to finish:
//   1. startGoogleSignIn: the app sends a secret `verifier` and gets Google's sign-in URL.
//   2. Google sends the browser to /auth/google/callback (convex/http.ts), which swaps the
//      code for the Google account and records it under a one-time `claim`.
//   3. The callback redirects back into the app with `?claim=…`.
//   4. finishGoogleSignIn: the app sends claim + verifier + its device token, and the device
//      becomes that Google account's player.
// Google needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET set on the deployment.

const LOGIN_TTL_MS = 10 * 60 * 1000;
const CLAIM_TTL_MS = 5 * 60 * 1000;
const DEFAULT_EMOJI = "🐣";

export const me = query({
  args: { token: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      userId: v.id("users"),
      name: v.string(),
      emoji: v.string(),
      hasPass: v.boolean(),
      /** Linked to a Google account, or playing as a guest. Anyone else goes through onboarding. */
      signedIn: v.boolean(),
      /** A guest: no Google account, so this device is the only way back in. */
      guest: v.boolean(),
      /** A new Google player who hasn't picked their name and bird yet. */
      needsProfile: v.boolean(),
    }),
  ),
  handler: async (ctx, { token }) => {
    if (token.length < TOKEN_MIN_LENGTH) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!user) return null;
    return {
      userId: user._id,
      name: user.name,
      emoji: user.emoji,
      hasPass: user.hasPass,
      signedIn: user.googleSub !== undefined || user.guest === true,
      guest: user.googleSub === undefined && user.guest === true,
      needsProfile: user.needsProfile === true,
    };
  },
});

/** Updates the name and emoji everywhere. The player is created by Continue with Google. */
export const saveProfile = mutation({
  args: { token: v.string(), name: v.string(), emoji: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const emoji = args.emoji.trim();
    if (args.token.length < TOKEN_MIN_LENGTH) throw new ConvexError("This device has no sign-in yet.");
    if (name.length < 1 || name.length > NAME_MAX_CHARS) {
      throw new ConvexError(`Your name needs 1 to ${NAME_MAX_CHARS} characters.`);
    }
    if (emoji.length < 1 || emoji.length > 16) throw new ConvexError("Pick an emoji.");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!existing) throw new ConvexError("Continue with Google first.");
    await ctx.db.patch("users", existing._id, { name, emoji, needsProfile: false });
    const memberships = await ctx.db
      .query("members")
      .withIndex("by_userId", (q) => q.eq("userId", existing._id))
      .take(100);
    for (const m of memberships) await ctx.db.patch("members", m._id, { name, emoji });
    return null;
  },
});

/**
 * Signs this device out. The player keeps their name, bird and groups: Continue with Google
 * on any device brings them back. A player who never linked Google can't sign out, because
 * nothing could bring them back.
 */
export const signOut = mutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, { token }) => {
    if (token.length < TOKEN_MIN_LENGTH) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!user) return null;
    if (user.googleSub === undefined) {
      throw new ConvexError("Continue with Google first, so you can sign back in.");
    }
    await retireToken(ctx, user);
    return null;
  },
});

/**
 * Play as a guest: no Google, the same game. Creates a player tied to this device's token;
 * they pick a name and bird next (needsProfile), like a new Google player. Safe to call twice.
 */
export const startAsGuest = mutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, { token }) => {
    if (token.length < TOKEN_MIN_LENGTH) throw new ConvexError("This device has no sign-in yet.");
    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (existing) {
      // A player from before Google sign-in: keep their name, bird and groups, as a guest.
      if (existing.googleSub === undefined && existing.guest !== true) {
        await ctx.db.patch("users", existing._id, { guest: true });
      }
      return null;
    }
    await ctx.db.insert("users", {
      token,
      name: "Guest",
      emoji: DEFAULT_EMOJI,
      isBot: false,
      hasPass: false,
      guest: true,
      needsProfile: true,
    });
    return null;
  },
});

/** Step 1: returns the Google sign-in page for this attempt. */
export const startGoogleSignIn = mutation({
  args: { token: v.string(), verifier: v.string(), returnTo: v.string() },
  returns: v.object({ url: v.string() }),
  handler: async (ctx, args) => {
    if (args.token.length < TOKEN_MIN_LENGTH) throw new ConvexError("This device has no sign-in yet.");
    if (args.verifier.length < 32 || args.verifier.length > 200) throw new ConvexError("Try signing in again.");
    if (!isAllowedReturn(args.returnTo)) throw new ConvexError("This app can't sign in from here.");
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const site = process.env.CONVEX_SITE_URL;
    if (!clientId || !site) throw new ConvexError("Google sign-in isn't set up on this server yet.");

    const now = Date.now();
    const stale = await ctx.db
      .query("googleLogins")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", now))
      .take(20);
    for (const row of stale) await ctx.db.delete("googleLogins", row._id);

    const state = crypto.randomUUID().replace(/-/g, "");
    await ctx.db.insert("googleLogins", {
      state,
      verifier: args.verifier,
      returnTo: args.returnTo,
      expiresAt: now + LOGIN_TTL_MS,
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${site}/auth/google/callback`,
      response_type: "code",
      scope: "openid profile",
      state,
      prompt: "select_account",
    });
    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
  },
});

/** Step 2, called by the HTTP callback: records the Google account under a one-time claim. */
export const recordGoogleSignIn = internalMutation({
  args: { state: v.string(), claim: v.string(), googleSub: v.string(), givenName: v.string() },
  returns: v.union(v.null(), v.object({ returnTo: v.string() })),
  handler: async (ctx, args) => {
    const login = await ctx.db
      .query("googleLogins")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .unique();
    if (!login || login.claim !== undefined || login.expiresAt < Date.now()) return null;
    await ctx.db.patch("googleLogins", login._id, {
      claim: args.claim,
      googleSub: args.googleSub,
      givenName: args.givenName,
      expiresAt: Date.now() + CLAIM_TTL_MS,
    });
    return { returnTo: login.returnTo };
  },
});

/** The player cancelled at Google, or Google refused: drop the attempt, return to the app. */
export const cancelGoogleSignIn = internalMutation({
  args: { state: v.string() },
  returns: v.union(v.null(), v.object({ returnTo: v.string() })),
  handler: async (ctx, { state }) => {
    const login = await ctx.db
      .query("googleLogins")
      .withIndex("by_state", (q) => q.eq("state", state))
      .unique();
    if (!login) return null;
    await ctx.db.delete("googleLogins", login._id);
    return { returnTo: login.returnTo };
  },
});

/** Step 4: this device becomes the Google account's player. */
export const finishGoogleSignIn = mutation({
  args: { token: v.string(), claim: v.string(), verifier: v.string() },
  returns: v.object({ needsProfile: v.boolean() }),
  handler: async (ctx, args) => {
    if (args.token.length < TOKEN_MIN_LENGTH) throw new ConvexError("This device has no sign-in yet.");
    const login = await ctx.db
      .query("googleLogins")
      .withIndex("by_claim", (q) => q.eq("claim", args.claim))
      .unique();
    if (!login || login.verifier !== args.verifier || login.googleSub === undefined) {
      throw new ConvexError("That sign-in didn't start on this device. Try again.");
    }
    await ctx.db.delete("googleLogins", login._id);
    if (login.expiresAt < Date.now()) throw new ConvexError("That sign-in took too long. Try again.");
    const googleSub = login.googleSub;

    const byGoogle = await ctx.db
      .query("users")
      .withIndex("by_googleSub", (q) => q.eq("googleSub", googleSub))
      .unique();
    const byToken = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    // Returning player: move their seat to this device. One device at a time.
    if (byGoogle) {
      if (byToken && byToken._id !== byGoogle._id) await retireToken(ctx, byToken);
      if (byGoogle.token !== args.token) await ctx.db.patch("users", byGoogle._id, { token: args.token });
      return { needsProfile: byGoogle.needsProfile === true };
    }

    // A player from before Google sign-in keeps their name, bird and groups.
    if (byToken && byToken.googleSub === undefined) {
      await ctx.db.patch("users", byToken._id, { googleSub });
      return { needsProfile: false };
    }

    // This device was another Google account's: that account keeps its data, signed out here.
    if (byToken) await retireToken(ctx, byToken);
    const name = (login.givenName ?? "").trim().slice(0, NAME_MAX_CHARS) || "Player";
    await ctx.db.insert("users", {
      token: args.token,
      name,
      emoji: DEFAULT_EMOJI,
      isBot: false,
      hasPass: false,
      googleSub,
      needsProfile: true,
    });
    return { needsProfile: true };
  },
});

/** Signs a player out of a device by giving them a token nobody holds. */
async function retireToken(ctx: MutationCtx, user: Doc<"users">) {
  const dead = `retired_${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  await ctx.db.patch("users", user._id, { token: dead });
}

/** Where the Google callback may send the browser back to: this app, never another site. */
function isAllowedReturn(raw: string): boolean {
  if (raw.length > 500) return false;
  if (/^(peckingorder|exp|exps):\/\//.test(raw)) return true;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) return true;
  if (url.protocol !== "https:") return false;
  // The production web app and its EAS Hosting preview deployments.
  if (/^pecking-order(--[a-z0-9-]+)?\.expo\.app$/.test(url.hostname)) return true;
  const extra = (process.env.APP_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return extra.includes(url.origin);
}
