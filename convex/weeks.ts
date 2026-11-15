import { v } from "convex/values";
import { query } from "./_generated/server";
import { findMember } from "./lib/auth";

// Owned by Track D. Phase 0: working version. The only way full standings reach a client.

export const finale = query({
  args: { token: v.string(), groupId: v.id("groups") },
  returns: v.union(
    v.null(),
    v.object({
      week: v.number(),
      myMemberId: v.id("members"),
      standings: v.array(
        v.object({
          memberId: v.id("members"),
          name: v.string(),
          emoji: v.string(),
          points: v.number(),
          hasPass: v.boolean(),
        }),
      ),
    }),
  ),
  handler: async (ctx, { token, groupId }) => {
    const group = await ctx.db.get("groups", groupId);
    if (!group || group.phase !== "finale") return null;
    const me = await findMember(ctx, token, groupId);
    if (!me) return null;
    const result = await ctx.db
      .query("weekResults")
      .withIndex("by_groupId_and_week", (q) => q.eq("groupId", groupId).eq("week", group.week))
      .first();
    if (!result) return null;
    return { week: group.week, myMemberId: me._id, standings: result.standings };
  },
});
