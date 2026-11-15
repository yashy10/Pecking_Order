import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { findUser } from "./lib/auth";

// Owned by the lead. The Whop Season Pass (PLAN §10, step 4). Free and cosmetic only.
//
// 1. The app calls createCheckout. Whop gets a checkout for the free Season Pass,
//    tagged with this player's user id in metadata, and the app opens its URL.
// 2. Whop calls POST /whop/webhook (convex/http.ts) when the membership activates.
//    The signature is checked, then grantPass turns the ring on everywhere, live.
//
// Needs WHOP_API_KEY on the deployment. Run `npx convex run whop:registerWebhook`
// once to create the webhook; its signing secret is stored in `settings`.

const WHOP_API = "https://api.whop.com/api/v1";
const SEASON_PASS_VARIANT = "plan_VOxo9WDC7oEtO"; // "Pecking Order Season Pass", Free
const WEB_URL = "https://pecking-order.expo.app";
const SECRET_SETTING = "whopWebhookSecret";
const HOOK_SETTING = "whopWebhookId";

export const profileFor = internalQuery({
  args: { token: v.string() },
  returns: v.union(v.null(), v.object({ userId: v.id("users"), hasPass: v.boolean() })),
  handler: async (ctx, { token }) => {
    const user = await findUser(ctx, token);
    return user ? { userId: user.userId, hasPass: user.hasPass } : null;
  },
});

/** A checkout for the free Season Pass, tagged with this player. Returns its URL. */
export const createCheckout = action({
  args: { token: v.string() },
  returns: v.object({ url: v.string() }),
  handler: async (ctx, { token }) => {
    const profile = await ctx.runQuery(internal.whop.profileFor, { token });
    if (!profile) throw new ConvexError("Set your name first.");
    if (profile.hasPass) throw new ConvexError("You already have the Season Pass.");
    const apiKey = process.env.WHOP_API_KEY;
    if (!apiKey) throw new ConvexError("The Season Pass isn't connected to Whop yet.");

    const res = await fetch(`${WHOP_API}/checkout_configurations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        variant_id: process.env.WHOP_VARIANT_ID ?? SEASON_PASS_VARIANT,
        metadata: { po_user: profile.userId },
        redirect_url: `${process.env.WEB_URL ?? WEB_URL}/pass`,
      }),
    });
    const json = (await res.json().catch(() => null)) as { purchase_url?: string } | null;
    if (!res.ok || !json?.purchase_url) {
      console.error("Whop checkout failed", res.status, JSON.stringify(json)?.slice(0, 500));
      throw new ConvexError("Whop couldn't open a checkout. Try again in a moment.");
    }
    return { url: json.purchase_url };
  },
});

/** One-off: creates the Whop webhook that points at this deployment and stores its secret. */
export const registerWebhook = internalAction({
  args: {},
  returns: v.object({ id: v.string(), url: v.string() }),
  handler: async (ctx) => {
    const apiKey = process.env.WHOP_API_KEY;
    if (!apiKey) throw new Error("Set WHOP_API_KEY on the deployment first.");
    const url = `${process.env.CONVEX_SITE_URL}/whop/webhook`;
    const res = await fetch(`${WHOP_API}/webhooks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, events: ["membership.activated", "membership.went_valid"] }),
    });
    const json = (await res.json().catch(() => null)) as { id?: string; webhook_secret?: string } | null;
    if (!res.ok || !json?.id || !json.webhook_secret) {
      throw new Error(`Whop refused the webhook (${res.status}): ${JSON.stringify(json)?.slice(0, 300)}`);
    }
    await ctx.runMutation(internal.whop.saveSetting, { key: SECRET_SETTING, value: json.webhook_secret });
    await ctx.runMutation(internal.whop.saveSetting, { key: HOOK_SETTING, value: json.id });
    return { id: json.id, url };
  },
});

export const saveSetting = internalMutation({
  args: { key: v.string(), value: v.string() },
  returns: v.null(),
  handler: async (ctx, { key, value }) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (existing) await ctx.db.patch("settings", existing._id, { value });
    else await ctx.db.insert("settings", { key, value });
    return null;
  },
});

/** The signing secret: WHOP_WEBHOOK_SECRET if set (a dashboard-made webhook), else the stored one. */
export const webhookSecret = internalQuery({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) => {
    if (process.env.WHOP_WEBHOOK_SECRET) return process.env.WHOP_WEBHOOK_SECRET;
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", SECRET_SETTING))
      .unique();
    return row?.value ?? null;
  },
});

/** Turns the ring on for a player and every membership they have. Idempotent. */
export const grantPass = internalMutation({
  args: { userId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { userId }) => {
    const id = ctx.db.normalizeId("users", userId);
    if (!id) return false;
    const user = await ctx.db.get("users", id);
    if (!user) return false;
    if (!user.hasPass) await ctx.db.patch("users", id, { hasPass: true });
    const memberships = await ctx.db
      .query("members")
      .withIndex("by_userId", (q) => q.eq("userId", id))
      .take(100);
    for (const m of memberships) {
      if (!m.hasPass) await ctx.db.patch("members", m._id, { hasPass: true });
    }
    return true;
  },
});
