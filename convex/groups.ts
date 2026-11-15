import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { startDay } from "./clock";
import { findUser, requireUser } from "./lib/auth";
import { dayLabel, GROUP_NAME_MAX_CHARS } from "./lib/constants";
import { membersOf, newMemberDoc } from "./lib/day";
import { phaseV } from "./schema";

// Owned by Track A. Phase 0: working version.

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 5;

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

async function groupByCode(ctx: QueryCtx | MutationCtx, code: string) {
  return await ctx.db
    .query("groups")
    .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code.trim().toUpperCase()))
    .unique();
}

export const preview = query({
  args: { code: v.string() },
  returns: v.union(
    v.null(),
    v.object({ name: v.string(), memberCount: v.number(), emojis: v.array(v.string()) }),
  ),
  handler: async (ctx, { code }) => {
    const group = await groupByCode(ctx, code);
    if (!group) return null;
    const members = await membersOf(ctx, group._id);
    return {
      name: group.name,
      memberCount: members.length,
      emojis: members.slice(0, 8).map((m) => m.emoji),
    };
  },
});

export const create = mutation({
  args: { token: v.string(), name: v.string() },
  returns: v.object({ groupId: v.id("groups"), inviteCode: v.string() }),
  handler: async (ctx, args) => {
    const profile = await requireUser(ctx, args.token);
    const name = args.name.trim();
    if (name.length < 1 || name.length > GROUP_NAME_MAX_CHARS) {
      throw new ConvexError(`Group names need 1 to ${GROUP_NAME_MAX_CHARS} characters.`);
    }
    let inviteCode = randomCode();
    for (let tries = 0; tries < 10 && (await groupByCode(ctx, inviteCode)); tries++) {
      inviteCode = randomCode();
    }
    const groupId = await ctx.db.insert("groups", {
      name,
      inviteCode,
      week: 1,
      day: 0,
      phase: "open",
      autoClock: false,
    });
    await ctx.db.insert("members", newMemberDoc(groupId, profile));
    await startDay(ctx, groupId, 1, 0);
    return { groupId, inviteCode };
  },
});

/** Idempotent: joining twice does nothing. New members get the welcome kit. */
export const join = mutation({
  args: { token: v.string(), code: v.string() },
  returns: v.object({ groupId: v.id("groups") }),
  handler: async (ctx, args) => {
    const profile = await requireUser(ctx, args.token);
    const group = await groupByCode(ctx, args.code);
    if (!group) throw new ConvexError("No group has that code.");
    const existing = await ctx.db
      .query("members")
      .withIndex("by_groupId_and_userId", (q) =>
        q.eq("groupId", group._id).eq("userId", profile.userId),
      )
      .unique();
    if (!existing) await ctx.db.insert("members", newMemberDoc(group._id, profile));
    return { groupId: group._id };
  },
});

export const mine = query({
  args: { token: v.string() },
  returns: v.array(
    v.object({ groupId: v.id("groups"), name: v.string(), dayLabel: v.string(), phase: phaseV }),
  ),
  handler: async (ctx, { token }) => {
    const user = await findUser(ctx, token);
    if (!user) return [];
    const memberships = await ctx.db
      .query("members")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId))
      .take(50);
    const groups = [];
    for (const m of memberships) {
      const group = await ctx.db.get("groups", m.groupId);
      if (group) {
        groups.push({
          groupId: group._id,
          name: group.name,
          dayLabel: dayLabel(group.day),
          phase: group.phase,
        });
      }
    }
    return groups;
  },
});
