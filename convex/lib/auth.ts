import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { TOKEN_MIN_LENGTH } from "./constants";

// Frozen in Phase 0. Owned by the lead. See docs/PLAN.md §6.4.
// Only this file and convex/users.ts read the users table. Everything else
// gets a Profile, which never carries the device token.

type Ctx = QueryCtx | MutationCtx;

export type Profile = {
  userId: Id<"users">;
  name: string;
  emoji: string;
  isBot: boolean;
  hasPass: boolean;
};

export async function findUser(ctx: Ctx, token: string): Promise<Profile | null> {
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
    isBot: user.isBot,
    hasPass: user.hasPass,
  };
}

/** For internal developer tools only, never a public function: a user's Profile by id. */
export async function profileById(ctx: Ctx, userId: Id<"users">): Promise<Profile | null> {
  const user = await ctx.db.get("users", userId);
  if (!user) return null;
  return {
    userId: user._id,
    name: user.name,
    emoji: user.emoji,
    isBot: user.isBot,
    hasPass: user.hasPass,
  };
}

export async function requireUser(ctx: Ctx, token: string): Promise<Profile> {
  const user = await findUser(ctx, token);
  if (!user) throw new ConvexError("Set your name first.");
  return user;
}

export async function findMember(
  ctx: Ctx,
  token: string,
  groupId: Id<"groups">,
): Promise<Doc<"members"> | null> {
  const user = await findUser(ctx, token);
  if (!user) return null;
  return await ctx.db
    .query("members")
    .withIndex("by_groupId_and_userId", (q) => q.eq("groupId", groupId).eq("userId", user.userId))
    .unique();
}

export async function requireMember(
  ctx: Ctx,
  token: string,
  groupId: Id<"groups">,
): Promise<Doc<"members">> {
  const member = await findMember(ctx, token, groupId);
  if (!member) throw new ConvexError("You're not in this group.");
  return member;
}
