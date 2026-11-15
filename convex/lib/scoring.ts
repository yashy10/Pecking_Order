import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

// Frozen in Phase 0. Owned by the lead.

/**
 * Finishes a play. Applies the game's multiplier and seals the points: they are
 * returned only to this player and are banked into weekPoints at the reveal.
 */
export async function finishPlay(
  ctx: MutationCtx,
  play: Doc<"plays">,
  opts: { basePoints: number; detail?: string },
): Promise<number> {
  const game = await ctx.db.get("games", play.gameId);
  const points = Math.max(0, Math.round(opts.basePoints * (game?.multiplier ?? 1)));
  await ctx.db.patch("plays", play._id, { points, finishedAt: Date.now(), detail: opts.detail });
  return points;
}
