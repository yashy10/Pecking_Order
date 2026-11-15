import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireMember } from "./lib/auth";
import { activePowers } from "./lib/day";
import { powerTypeV } from "./schema";

// Owned by Track D. See docs/PLAN.md §6.3.
// At most one of each per day, lasts until the next day drops, not during the finale.

export const use = mutation({
  args: { token: v.string(), groupId: v.id("groups"), type: powerTypeV },
  returns: v.null(),
  handler: async (ctx, { token, groupId, type }) => {
    const me = await requireMember(ctx, token, groupId);
    const group = await ctx.db.get("groups", groupId);
    if (!group) throw new ConvexError("That group doesn't exist.");
    if (group.phase === "finale") throw new ConvexError("No powers during the finale.");
    const name = type === "ghost" ? "Ghost" : "Spy";
    const inventory = type === "ghost" ? me.ghost : me.spy;
    if (inventory < 1) throw new ConvexError(`You don't have a ${name} to use.`);
    const { ghosted, spying } = await activePowers(ctx, groupId, group.week, group.day);
    if ((type === "ghost" ? ghosted : spying).has(me._id)) {
      throw new ConvexError(`Your ${name} is already on until tomorrow.`);
    }
    await ctx.db.insert("powerUses", {
      groupId,
      week: group.week,
      day: group.day,
      memberId: me._id,
      type,
    });
    await ctx.db.patch("members", me._id, type === "ghost" ? { ghost: me.ghost - 1 } : { spy: me.spy - 1 });
    return null;
  },
});
