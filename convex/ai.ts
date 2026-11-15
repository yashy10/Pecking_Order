"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

// Owned by Track C. Phase 0: signature only. See docs/PLAN.md §8 (Track C).
// One OpenAI call per prompt rewrites every answer into a neutral voice, saved
// through internal.prompts.saveRewrites. Any failure leaves the raw text in play.

export const rewriteAnswers = internalAction({
  args: { promptId: v.id("prompts") },
  returns: v.null(),
  handler: async () => null,
});
