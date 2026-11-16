import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";
import { FLOW_PUZZLES } from "./content/flow";
import { requireMember } from "./lib/auth";
import { isOpenGame } from "./lib/day";
import { FLOW_MAX_COLORS, FLOW_PAR_MS, flowDots, solutionProblem } from "./lib/flow";
import { timedPuzzlePoints } from "./lib/games";
import { finishPlay } from "./lib/scoring";

// Owned by the flow track. Connect each pair of dots; pipes can't cross; fill every square.
// The dot layout is not secret. The clock runs on the server, and the server checks the
// whole board, so any valid full solution counts.

async function load(ctx: MutationCtx, token: string, gameId: Id<"games">) {
  const game = await ctx.db.get("games", gameId);
  if (!game || game.type !== "flow") throw new ConvexError("That round doesn't exist.");
  const puzzle = FLOW_PUZZLES.find((p) => p.key === game.puzzleKey);
  if (!puzzle) throw new ConvexError("That puzzle is missing.");
  const group = await ctx.db.get("groups", game.groupId);
  if (!group) throw new ConvexError("That group doesn't exist.");
  const member = await requireMember(ctx, token, game.groupId);
  const play = await ctx.db
    .query("plays")
    .withIndex("by_gameId_and_memberId", (q) => q.eq("gameId", gameId).eq("memberId", member._id))
    .unique();
  return { game, puzzle, group, member, play };
}

function parFor(size: number): number {
  return FLOW_PAR_MS[size] ?? FLOW_PAR_MS[7];
}

/** Starts the round, or resumes it with the server's elapsed time after a refresh. */
export const start = mutation({
  args: { token: v.string(), gameId: v.id("games") },
  returns: v.object({
    size: v.number(),
    /** Cell = row * size + column. Each colour has two ends. */
    dots: v.array(v.object({ color: v.number(), ends: v.array(v.number()) })),
    elapsedMs: v.number(),
    parMs: v.number(),
    finished: v.boolean(),
    points: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, { token, gameId }) => {
    const { game, puzzle, group, member, play } = await load(ctx, token, gameId);
    const base = { size: puzzle.size, dots: flowDots(puzzle), parMs: parFor(puzzle.size) };
    if (play && play.finishedAt !== undefined) {
      return { ...base, elapsedMs: play.finishedAt - play.startedAt, finished: true, points: play.points ?? 0 };
    }
    if (!isOpenGame(group, game)) throw new ConvexError("This round has closed.");
    if (!play) {
      await ctx.db.insert("plays", {
        gameId,
        groupId: game.groupId,
        memberId: member._id,
        startedAt: Date.now(),
        wrongGuesses: 0,
      });
      return { ...base, elapsedMs: 0, finished: false, points: null };
    }
    return { ...base, elapsedMs: Date.now() - play.startedAt, finished: false, points: null };
  },
});

/** Checks a full board. Solved seals the points; anything else says what's wrong. */
export const submit = mutation({
  args: {
    token: v.string(),
    gameId: v.id("games"),
    /** One pipe per colour, in colour order: cell indexes from one dot to the other. */
    paths: v.array(v.array(v.number())),
  },
  returns: v.object({
    solved: v.boolean(),
    finished: v.boolean(),
    points: v.union(v.number(), v.null()),
    elapsedMs: v.number(),
    problem: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, { token, gameId, paths }) => {
    const { game, puzzle, group, play } = await load(ctx, token, gameId);
    if (!play) throw new ConvexError("Start the round first.");
    if (play.finishedAt !== undefined) {
      return {
        solved: (play.points ?? 0) > 0,
        finished: true,
        points: play.points ?? 0,
        elapsedMs: play.finishedAt - play.startedAt,
        problem: null,
      };
    }
    if (!isOpenGame(group, game)) throw new ConvexError("This round has closed.");
    const elapsedMs = Date.now() - play.startedAt;
    const cells = puzzle.size * puzzle.size;
    if (paths.length > FLOW_MAX_COLORS || paths.some((p) => p.length > cells)) {
      return { solved: false, finished: false, points: null, elapsedMs, problem: "That board doesn't fit." };
    }
    const problem = solutionProblem(puzzle.size, flowDots(puzzle), paths);
    if (problem) return { solved: false, finished: false, points: null, elapsedMs, problem };
    const points = await finishPlay(ctx, play, {
      basePoints: timedPuzzlePoints(elapsedMs, parFor(puzzle.size)),
      detail: `${(elapsedMs / 1000).toFixed(1)} s`,
    });
    return { solved: true, finished: true, points, elapsedMs, problem: null };
  },
});
