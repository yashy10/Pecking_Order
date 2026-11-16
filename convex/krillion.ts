import { ConvexError, v, type Infer } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";
import type { KrillionPuzzle } from "./content/krillion";
import { requireMember } from "./lib/auth";
import { isOpenGame } from "./lib/day";
import {
  ANSWER_MAX_CHARS,
  currentRound,
  encodeAttempt,
  MAX_STRIKES,
  modeFor,
  puzzleFor,
  replay,
  ROUND_MAX,
  ROUND_MIN,
  roundPoints,
  sameTextKey,
  type Mode,
} from "./lib/krillion";
import { finishPlay } from "./lib/scoring";

// Owned by the krillion track. Krillion (rare answers win) and Nokrillion (common answers
// win) share these functions; the game's type picks the mode. A round's ranked list leaves
// the server only once the player has finished that round.

const roundV = v.object({
  prompt: v.string(),
  status: v.union(v.literal("open"), v.literal("done"), v.literal("locked")),
  /** The listed answer the player hit (its display name), or null. */
  myAnswer: v.union(v.string(), v.null()),
  /** Base points for the round, once done. */
  points: v.union(v.number(), v.null()),
  /** The most this round can score. */
  maxPoints: v.number(),
  strikes: v.number(),
  /** Wrong attempts in this round, as typed. */
  misses: v.array(v.string()),
  /** The full ranked list, most common first. Only for rounds already done. */
  list: v.union(
    v.array(v.object({ name: v.string(), mine: v.boolean(), points: v.number() })),
    v.null(),
  ),
});

const stateV = v.object({
  mode: v.union(v.literal("rare"), v.literal("common")),
  rounds: v.array(roundV),
  /** The round being played; equals rounds.length once all are done. */
  current: v.number(),
  maxStrikes: v.number(),
  minPoints: v.number(),
  finished: v.boolean(),
  /** Sealed points, multiplier included. Only once finished. */
  points: v.union(v.number(), v.null()),
  /** What the last answer did; null from start. */
  last: v.union(v.literal("hit"), v.literal("miss"), v.null()),
});

type State = Infer<typeof stateV>;

async function load(ctx: MutationCtx, token: string, gameId: Id<"games">) {
  const game = await ctx.db.get("games", gameId);
  const puzzle = game ? puzzleFor(game.type, game.puzzleKey) : null;
  if (!game || !puzzle) throw new ConvexError("That round doesn't exist.");
  const group = await ctx.db.get("groups", game.groupId);
  if (!group) throw new ConvexError("That group doesn't exist.");
  const member = await requireMember(ctx, token, game.groupId);
  const play = await ctx.db
    .query("plays")
    .withIndex("by_gameId_and_memberId", (q) => q.eq("gameId", gameId).eq("memberId", member._id))
    .unique();
  return { game, group, member, play, puzzle, mode: modeFor(game.type) };
}

function stateOf(
  puzzle: KrillionPuzzle,
  mode: Mode,
  attempts: string[],
  play: Doc<"plays"> | null,
  last: State["last"] = null,
): State {
  const results = replay(puzzle, mode, attempts);
  const current = currentRound(results);
  const finished = play?.finishedAt !== undefined;
  return {
    mode,
    rounds: puzzle.rounds.map((category, i) => {
      const r = results[i];
      const max = ROUND_MAX[i] ?? ROUND_MIN;
      const done = r.done;
      return {
        prompt: category.prompt,
        status: done ? "done" : i === current ? "open" : "locked",
        myAnswer: r.hit !== null ? category.answers[r.hit].names[0] : null,
        points: done ? r.points : null,
        maxPoints: max,
        strikes: r.strikes,
        misses: r.missTexts,
        list: done
          ? category.answers.map((a, rank) => ({
              name: a.names[0],
              mine: rank === r.hit,
              points: roundPoints(mode, rank, category.answers.length, max),
            }))
          : null,
      };
    }),
    current,
    maxStrikes: MAX_STRIKES,
    minPoints: ROUND_MIN,
    finished,
    points: finished ? (play?.points ?? 0) : null,
    last,
  };
}

/** Starts the day's three categories, or resumes where the player left off. */
export const start = mutation({
  args: { token: v.string(), gameId: v.id("games") },
  returns: stateV,
  handler: async (ctx, { token, gameId }) => {
    const { game, group, member, play, puzzle, mode } = await load(ctx, token, gameId);
    if (play && play.finishedAt !== undefined) return stateOf(puzzle, mode, play.guesses ?? [], play);
    if (!isOpenGame(group, game)) throw new ConvexError("This round has closed.");
    if (play) return stateOf(puzzle, mode, play.guesses ?? [], play);
    await ctx.db.insert("plays", {
      gameId,
      groupId: game.groupId,
      memberId: member._id,
      startedAt: Date.now(),
      wrongGuesses: 0,
      guesses: [],
    });
    return stateOf(puzzle, mode, [], null);
  },
});

/** Answers the current category. A hit locks the round in; a miss is a strike. */
export const answer = mutation({
  args: { token: v.string(), gameId: v.id("games"), text: v.string() },
  returns: stateV,
  handler: async (ctx, args) => {
    const { game, group, play, puzzle, mode } = await load(ctx, args.token, args.gameId);
    if (!play) throw new ConvexError("Start the round first.");
    const attempts = play.guesses ?? [];
    if (play.finishedAt !== undefined) return stateOf(puzzle, mode, attempts, play);
    if (!isOpenGame(group, game)) throw new ConvexError("This round has closed.");

    const text = args.text.trim().slice(0, ANSWER_MAX_CHARS);
    if (!sameTextKey(text)) throw new ConvexError("Type an answer first.");
    const before = replay(puzzle, mode, attempts);
    const round = currentRound(before);
    if (round >= puzzle.rounds.length) throw new ConvexError("You've answered every category.");
    if (before[round].misses.includes(sameTextKey(text))) {
      throw new ConvexError("You already tried that one.");
    }

    const next = [...attempts, encodeAttempt(round, text)];
    const after = replay(puzzle, mode, next);
    const hit = after[round].hit !== null;
    await ctx.db.patch("plays", play._id, {
      guesses: next,
      wrongGuesses: hit ? play.wrongGuesses : play.wrongGuesses + 1,
    });
    const last = hit ? "hit" : "miss";
    if (currentRound(after) >= puzzle.rounds.length) {
      const hits = after.filter((r) => r.hit !== null).length;
      const points = await finishPlay(ctx, { ...play, guesses: next }, {
        basePoints: after.reduce((sum, r) => sum + r.points, 0),
        detail: `${hits} of ${puzzle.rounds.length}`,
      });
      return { ...stateOf(puzzle, mode, next, null, last), finished: true, points };
    }
    return stateOf(puzzle, mode, next, play, last);
  },
});
