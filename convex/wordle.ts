import { ConvexError, v, type Infer } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";
import { requireMember } from "./lib/auth";
import { isOpenGame } from "./lib/day";
import { finishPlay } from "./lib/scoring";
import {
  cleanGuess,
  isAllowedGuess,
  markGuess,
  MAX_GUESSES,
  WORD_LENGTH,
  WORDLE_POINTS,
  wordleAnswer,
} from "./lib/wordle";

// Owned by the wordle track. The answer stays on the server: the client gets the marks
// for each guess, and the word itself only once the play is finished.

const markV = v.union(v.literal("hit"), v.literal("near"), v.literal("miss"));

const stateV = v.object({
  rows: v.array(v.object({ guess: v.string(), marks: v.array(markV) })),
  maxGuesses: v.number(),
  finished: v.boolean(),
  won: v.boolean(),
  /** Sealed points, multiplier included. Only once finished. */
  points: v.union(v.number(), v.null()),
  /** Base points for solving with the next guess; null once finished. */
  nextPoints: v.union(v.number(), v.null()),
  answer: v.union(v.string(), v.null()), // only once finished
});

type State = Infer<typeof stateV>;

async function load(ctx: MutationCtx, token: string, gameId: Id<"games">) {
  const game = await ctx.db.get("games", gameId);
  if (!game || game.type !== "wordle") throw new ConvexError("That round doesn't exist.");
  const answer = wordleAnswer(game.puzzleKey);
  if (!answer) throw new ConvexError("That round doesn't exist.");
  const group = await ctx.db.get("groups", game.groupId);
  if (!group) throw new ConvexError("That group doesn't exist.");
  const member = await requireMember(ctx, token, game.groupId);
  const play = await ctx.db
    .query("plays")
    .withIndex("by_gameId_and_memberId", (q) => q.eq("gameId", gameId).eq("memberId", member._id))
    .unique();
  return { game, group, member, play, answer };
}

function stateOf(guesses: string[], answer: string, play: Doc<"plays"> | null): State {
  const finished = play?.finishedAt !== undefined;
  return {
    rows: guesses.map((guess) => ({ guess, marks: markGuess(guess, answer) })),
    maxGuesses: MAX_GUESSES,
    finished,
    won: guesses.includes(answer),
    points: finished ? (play?.points ?? 0) : null,
    nextPoints: finished ? null : (WORDLE_POINTS[guesses.length] ?? null),
    answer: finished ? answer : null,
  };
}

/** Starts the round, or resumes it with every guess so far. */
export const start = mutation({
  args: { token: v.string(), gameId: v.id("games") },
  returns: stateV,
  handler: async (ctx, { token, gameId }) => {
    const { game, group, member, play, answer } = await load(ctx, token, gameId);
    if (play && play.finishedAt !== undefined) return stateOf(play.guesses ?? [], answer, play);
    if (!isOpenGame(group, game)) throw new ConvexError("This round has closed.");
    if (play) return stateOf(play.guesses ?? [], answer, play);
    await ctx.db.insert("plays", {
      gameId,
      groupId: game.groupId,
      memberId: member._id,
      startedAt: Date.now(),
      wrongGuesses: 0,
      guesses: [],
    });
    return stateOf([], answer, null);
  },
});

/** Plays one word. A word that isn't in the list is rejected without using up a guess. */
export const guess = mutation({
  args: { token: v.string(), gameId: v.id("games"), word: v.string() },
  returns: stateV,
  handler: async (ctx, args) => {
    const { game, group, play, answer } = await load(ctx, args.token, args.gameId);
    if (!play) throw new ConvexError("Start the round first.");
    const guesses = play.guesses ?? [];
    if (play.finishedAt !== undefined) return stateOf(guesses, answer, play);
    if (!isOpenGame(group, game)) throw new ConvexError("This round has closed.");

    const word = cleanGuess(args.word);
    if (word.length !== WORD_LENGTH) throw new ConvexError(`Guesses are ${WORD_LENGTH} letters.`);
    if (!isAllowedGuess(word)) throw new ConvexError("Not in the word list");

    const next = [...guesses, word];
    const won = word === answer;
    await ctx.db.patch("plays", play._id, {
      guesses: next,
      wrongGuesses: won ? play.wrongGuesses : play.wrongGuesses + 1,
    });
    if (won || next.length >= MAX_GUESSES) {
      const fresh = { ...play, guesses: next };
      const points = await finishPlay(ctx, fresh, {
        basePoints: won ? WORDLE_POINTS[next.length - 1] : 0,
        detail: won ? `${next.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`,
      });
      return { ...stateOf(next, answer, null), finished: true, points, nextPoints: null, answer };
    }
    return stateOf(next, answer, play);
  },
});
