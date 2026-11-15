import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";

// Owned by Track C. Phase 0: signatures only. See docs/PLAN.md §8 (Track C).

/**
 * Builds a round from the previous game day's prompt answers. Returns null when
 * fewer than three members answered, and the clock falls back to Blur.
 */
export async function createWhoSaidItGame(
  ctx: MutationCtx,
  args: { groupId: Id<"groups">; week: number; day: number; multiplier: number },
): Promise<Id<"games"> | null> {
  void ctx;
  void args;
  return null; // Track C. Until then every odd day falls back to Blur.
}

const optionV = v.object({ memberId: v.id("members"), name: v.string(), emoji: v.string() });

/** Never returns who wrote a quote. Null when the caller can't play this game. */
export const get = query({
  args: { token: v.string(), gameId: v.id("games") },
  returns: v.union(
    v.null(),
    v.object({
      quotes: v.array(
        v.object({ answerId: v.id("answers"), text: v.string(), options: v.array(optionV) }),
      ),
    }),
  ),
  handler: async () => null,
});

export const submit = mutation({
  args: {
    token: v.string(),
    gameId: v.id("games"),
    picks: v.array(v.object({ answerId: v.id("answers"), memberId: v.id("members") })),
  },
  returns: v.object({
    correct: v.number(),
    asked: v.number(),
    points: v.number(),
    reveal: v.array(
      v.object({
        answerId: v.id("answers"),
        authorId: v.id("members"),
        authorName: v.string(),
        authorEmoji: v.string(),
      }),
    ),
  }),
  handler: async () => {
    throw new ConvexError("Who Said It isn't built yet.");
  },
});
