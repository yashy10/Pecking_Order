import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { powerTypeV } from "./schema";

// Owned by Track D. Phase 0: signature only. See docs/PLAN.md §6.3 and §8 (Track D).
// At most one of each per day, lasts until the next day drops, not during the finale.

export const use = mutation({
  args: { token: v.string(), groupId: v.id("groups"), type: powerTypeV },
  returns: v.null(),
  handler: async () => {
    throw new ConvexError("Powers aren't built yet.");
  },
});
