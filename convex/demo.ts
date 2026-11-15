import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { advanceGroup } from "./clock";

// Owned by the lead. Demo controls (PLAN §9). Every function needs DEMO_KEY,
// set with `npx convex env set DEMO_KEY <words>`; without it a curious judge
// could jump the group to Sunday.

function checkDemoKey(demoKey: string): void {
  const expected = process.env.DEMO_KEY;
  if (!expected) throw new ConvexError("DEMO_KEY isn't set on this deployment.");
  if (demoKey !== expected) throw new ConvexError("Wrong demo key.");
}

/** Next ▶: one step of the clock. */
export const advance = mutation({
  args: { demoKey: v.string(), groupId: v.id("groups") },
  returns: v.null(),
  handler: async (ctx, { demoKey, groupId }) => {
    checkDemoKey(demoKey);
    await advanceGroup(ctx, groupId);
    return null;
  },
});
