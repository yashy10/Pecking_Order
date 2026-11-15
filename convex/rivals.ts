import { v } from "convex/values";
import { query } from "./_generated/server";
import { findMember } from "./lib/auth";
import { activePowers, membersOf } from "./lib/day";
import { neighbours } from "./lib/standings";

// Owned by Track D. Phase 0: the query is wired; neighbours() is the stub to fill in.
// Hidden-board rules (PLAN §6.1): no rank, no count, no one but your neighbours.

const slotV = v.union(
  v.object({
    kind: v.literal("rival"),
    memberId: v.id("members"),
    name: v.string(),
    emoji: v.string(),
    hasPass: v.boolean(),
    gap: v.number(),
    moved: v.union(v.literal("passedYou"), v.literal("youPassed"), v.null()),
  }),
  v.object({ kind: v.literal("fog") }),
);

export const view = query({
  args: { token: v.string(), groupId: v.id("groups") },
  returns: v.union(
    v.null(),
    v.object({
      me: v.object({
        memberId: v.id("members"),
        name: v.string(),
        emoji: v.string(),
        hasPass: v.boolean(),
        weekPoints: v.number(),
        lastDelta: v.number(),
        streak: v.number(),
        ghost: v.number(),
        spy: v.number(),
        ghostActive: v.boolean(),
        spyActive: v.boolean(),
      }),
      above: v.array(slotV), // nearest first
      below: v.array(slotV),
    }),
  ),
  handler: async (ctx, { token, groupId }) => {
    const group = await ctx.db.get("groups", groupId);
    if (!group) return null;
    const me = await findMember(ctx, token, groupId);
    if (!me) return null;
    const members = await membersOf(ctx, groupId);
    const { ghosted, spying } = await activePowers(ctx, groupId, group.week, group.day);
    const rows = members.map((m) => ({
      memberId: m._id,
      name: m.name,
      emoji: m.emoji,
      hasPass: m.hasPass,
      weekPoints: m.weekPoints,
      prevWeekPoints: m.prevWeekPoints,
      joinedAt: m._creationTime,
    }));
    const { above, below } = neighbours(rows, me._id, {
      ghosted,
      spyActive: spying.has(me._id),
    });
    return {
      me: {
        memberId: me._id,
        name: me.name,
        emoji: me.emoji,
        hasPass: me.hasPass,
        weekPoints: me.weekPoints,
        lastDelta: me.lastDelta,
        streak: me.streak,
        ghost: me.ghost,
        spy: me.spy,
        ghostActive: ghosted.has(me._id),
        spyActive: spying.has(me._id),
      },
      above,
      below,
    };
  },
});
