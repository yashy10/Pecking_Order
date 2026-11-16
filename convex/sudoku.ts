import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";
import { SUDOKU_PUZZLES } from "./content/sudoku";
import { requireMember } from "./lib/auth";
import { PUZZLE_CHECK_PENALTY } from "./lib/constants";
import { isOpenGame } from "./lib/day";
import { timedPuzzlePoints } from "./lib/games";
import { finishPlay } from "./lib/scoring";
import { checkSudoku, clockLabel, isCompleteGrid } from "./lib/sudoku";

// Owned by the sudoku track. Mini Sudoku: 6×6, digits 1–6, boxes of 2 rows × 3 columns.
// The server keeps the time and the solution; the solution only leaves once you finish.

/** Full points up to a minute, then the usual slow slide (lib/games.ts). */
const SUDOKU_PAR_MS = 60_000;

async function load(ctx: MutationCtx, token: string, gameId: Id<"games">) {
  const game = await ctx.db.get("games", gameId);
  if (!game || game.type !== "sudoku") throw new ConvexError("That round doesn't exist.");
  const puzzle = SUDOKU_PUZZLES.find((p) => p.key === game.puzzleKey);
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

/** Starts the puzzle, or resumes it with the server's elapsed time after a refresh. */
export const start = mutation({
  args: { token: v.string(), gameId: v.id("games") },
  returns: v.object({
    givens: v.string(), // 36 characters, "." for a blank
    elapsedMs: v.number(),
    parMs: v.number(),
    finished: v.boolean(),
    points: v.union(v.number(), v.null()),
    solution: v.union(v.string(), v.null()), // only once finished
  }),
  handler: async (ctx, { token, gameId }) => {
    const { game, puzzle, group, member, play } = await load(ctx, token, gameId);
    const base = { givens: puzzle.givens, parMs: SUDOKU_PAR_MS };
    if (play && play.finishedAt !== undefined) {
      return {
        ...base,
        elapsedMs: play.finishedAt - play.startedAt,
        finished: true,
        points: play.points ?? 0,
        solution: puzzle.solution,
      };
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
      return { ...base, elapsedMs: 0, finished: false, points: null, solution: null };
    }
    return { ...base, elapsedMs: Date.now() - play.startedAt, finished: false, points: null, solution: null };
  },
});

/** Submits a full grid. Solved seals the points; otherwise it counts as a failed check. */
export const submit = mutation({
  args: { token: v.string(), gameId: v.id("games"), grid: v.string() },
  returns: v.object({
    solved: v.boolean(),
    finished: v.boolean(),
    points: v.union(v.number(), v.null()),
    wrongCells: v.array(v.number()),
  }),
  handler: async (ctx, args) => {
    const { game, puzzle, group, play } = await load(ctx, args.token, args.gameId);
    if (!play) throw new ConvexError("Start the puzzle first.");
    if (play.finishedAt !== undefined) {
      return { solved: (play.points ?? 0) > 0, finished: true, points: play.points ?? 0, wrongCells: [] };
    }
    if (!isOpenGame(group, game)) throw new ConvexError("This round has closed.");
    if (!isCompleteGrid(args.grid)) throw new ConvexError("Fill every square first.");
    const { solved, wrongCells } = checkSudoku(args.grid, puzzle.givens, puzzle.solution);
    if (solved) {
      const elapsedMs = Date.now() - play.startedAt;
      const points = await finishPlay(ctx, play, {
        basePoints: timedPuzzlePoints(elapsedMs, SUDOKU_PAR_MS, play.wrongGuesses, PUZZLE_CHECK_PENALTY),
        detail: clockLabel(elapsedMs),
      });
      return { solved: true, finished: true, points, wrongCells: [] };
    }
    await ctx.db.patch("plays", play._id, { wrongGuesses: play.wrongGuesses + 1 });
    return { solved: false, finished: false, points: null, wrongCells };
  },
});
