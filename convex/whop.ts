import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";

// Owned by the lead. Whop Season Pass (PLAN §10, step 4). Phase 0: signature only.

/** Asks Whop for a Season Pass checkout tagged with this player, and returns its URL. */
export const createCheckout = action({
  args: { token: v.string() },
  returns: v.object({ url: v.string() }),
  handler: async () => {
    throw new ConvexError("The Season Pass isn't set up yet.");
  },
});
