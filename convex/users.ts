import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { findUser } from "./lib/auth";
import { NAME_MAX_CHARS, TOKEN_MIN_LENGTH } from "./lib/constants";

// Owned by Track A. Phase 0: working version.

export const me = query({
  args: { token: v.string() },
  returns: v.union(
    v.null(),
    v.object({ userId: v.id("users"), name: v.string(), emoji: v.string(), hasPass: v.boolean() }),
  ),
  handler: async (ctx, { token }) => {
    const user = await findUser(ctx, token);
    if (!user) return null;
    return { userId: user.userId, name: user.name, emoji: user.emoji, hasPass: user.hasPass };
  },
});

/** Creates the user on first call; later calls update the name and emoji everywhere. */
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
    if (!existing) {
      await ctx.db.insert("users", { token: args.token, name, emoji, isBot: false, hasPass: false });
      return null;
    }
    await ctx.db.patch("users", existing._id, { name, emoji });
    const memberships = await ctx.db
      .query("members")
      .withIndex("by_userId", (q) => q.eq("userId", existing._id))
      .take(100);
    for (const m of memberships) await ctx.db.patch("members", m._id, { name, emoji });
    return null;
  },
});
