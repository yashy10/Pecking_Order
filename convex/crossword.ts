import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";
import { CROSSWORD_PUZZLES } from "./content/crossword";
import { requireMember } from "./lib/auth";
import { PUZZLE_CHECK_PENALTY } from "./lib/constants";
import { blankRows, checkCrossword, crosswordLayout, fitsGrid } from "./lib/crossword";
import { isOpenGame } from "./lib/day";
import { timedPuzzlePoints } from "./lib/games";
import { finishPlay } from "./lib/scoring";
import { clockLabel } from "./lib/sudoku";

// Owned by the crossword track. Mini Crossword: 5×5. The grid's shape and clues go to the
// player; the letters never leave the server until that player has finished.

/** Full points up to a minute and a half, then the usual slow slide (lib/games.ts). */
const CROSSWORD_PAR_MS = 90_000;

const clueV = v.object({ num: v.number(), clue: v.string(), cells: v.array(v.number()) });

async function load(ctx: MutationCtx, token: string, gameId: Id<"games">) {
  const game = await ctx.db.get("games", gameId);
  if (!game || game.type !== "crossword") throw new ConvexError("That round doesn't exist.");
  const puzzle = CROSSWORD_PUZZLES.find((p) => p.key === game.puzzleKey);
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
    rows: v.array(v.string()), // "." open, "#" black: never the letters
    numbers: v.array(v.number()), // clue number per cell, 0 for none
    clues: v.object({ across: v.array(clueV), down: v.array(clueV) }),
    elapsedMs: v.number(),
    parMs: v.number(),
    checks: v.number(), // failed checks so far, 5 points each
    finished: v.boolean(),
    points: v.union(v.number(), v.null()),
    solution: v.union(v.array(v.string()), v.null()), // only once finished
  }),
  handler: async (ctx, { token, gameId }) => {
    const { game, puzzle, group, member, play } = await load(ctx, token, gameId);
    const layout = crosswordLayout(puzzle.rows);
    const clueText = (list: { num: number; clue: string }[], num: number) =>
      list.find((c) => c.num === num)?.clue ?? "";
    const base = {
      rows: blankRows(puzzle.rows),
      numbers: layout.numbers,
      clues: {
        across: layout.across.map((s) => ({ num: s.num, clue: clueText(puzzle.across, s.num), cells: s.cells })),
        down: layout.down.map((s) => ({ num: s.num, clue: clueText(puzzle.down, s.num), cells: s.cells })),
      },
      parMs: CROSSWORD_PAR_MS,
    };
    if (play && play.finishedAt !== undefined) {
      return {
        ...base,
        elapsedMs: play.finishedAt - play.startedAt,
        checks: play.wrongGuesses,
        finished: true,
        points: play.points ?? 0,
        solution: puzzle.rows,
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
      return { ...base, elapsedMs: 0, checks: 0, finished: false, points: null, solution: null };
    }
    return {
      ...base,
      elapsedMs: Date.now() - play.startedAt,
      checks: play.wrongGuesses,
      finished: false,
      points: null,
      solution: null,
    };
  },
});

/** Checks the grid. Solved seals the points; otherwise it costs 5 and marks the wrong squares. */
export const check = mutation({
  args: { token: v.string(), gameId: v.id("games"), letters: v.string() },
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
    if (!fitsGrid(puzzle.rows, args.letters)) throw new ConvexError("That grid doesn't fit this puzzle.");
    const { solved, wrongCells } = checkCrossword(puzzle.rows, args.letters);
    if (solved) {
      const elapsedMs = Date.now() - play.startedAt;
      const points = await finishPlay(ctx, play, {
        basePoints: timedPuzzlePoints(elapsedMs, CROSSWORD_PAR_MS, play.wrongGuesses, PUZZLE_CHECK_PENALTY),
        detail: clockLabel(elapsedMs),
      });
      return { solved: true, finished: true, points, wrongCells: [] };
    }
    await ctx.db.patch("plays", play._id, { wrongGuesses: play.wrongGuesses + 1 });
    return { solved: false, finished: false, points: null, wrongCells };
  },
});
