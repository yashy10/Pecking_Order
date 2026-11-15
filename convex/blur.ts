import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";
import { BLUR_IMAGES } from "./content/blur";
import { requireMember } from "./lib/auth";
import {
  GUESS_MAX_CHARS,
  HARD_STOP_MS,
  MAX_POINTS,
  MIN_CORRECT_POINTS,
  MS_PER_POINT_LOST,
  ROUND_MS,
  WRONG_GUESS_PENALTY,
} from "./lib/constants";
import { isOpenGame } from "./lib/day";
import { matchAnswer } from "./lib/match";
import { finishPlay } from "./lib/scoring";

// Owned by Track B. Phase 0: working version. Elapsed time is always measured
// on the server, and the answer only leaves the server once you have finished.

export async function createBlurGame(
  ctx: MutationCtx,
  args: { groupId: Id<"groups">; week: number; day: number; multiplier: number },
): Promise<Id<"games">> {
  const image = BLUR_IMAGES[(args.week * 7 + args.day) % BLUR_IMAGES.length];
  return await ctx.db.insert("games", {
    groupId: args.groupId,
    week: args.week,
    day: args.day,
    type: "blur",
    multiplier: args.multiplier,
    blur: { imageKey: image.key, answers: image.answers },
  });
}

export function blurPoints(elapsedMs: number, wrongGuesses: number): number {
  return Math.max(
    MIN_CORRECT_POINTS,
    MAX_POINTS - Math.floor(elapsedMs / MS_PER_POINT_LOST) - WRONG_GUESS_PENALTY * wrongGuesses,
  );
}

async function load(ctx: MutationCtx, token: string, gameId: Id<"games">) {
  const game = await ctx.db.get("games", gameId);
  if (!game || game.type !== "blur" || !game.blur) throw new ConvexError("That round doesn't exist.");
  const group = await ctx.db.get("groups", game.groupId);
  if (!group) throw new ConvexError("That group doesn't exist.");
  const member = await requireMember(ctx, token, game.groupId);
  const play = await ctx.db
    .query("plays")
    .withIndex("by_gameId_and_memberId", (q) => q.eq("gameId", gameId).eq("memberId", member._id))
    .unique();
  return { game, blur: game.blur, group, member, play };
}

/** Starts the round, or resumes it with the server's elapsed time after a refresh. */
export const start = mutation({
  args: { token: v.string(), gameId: v.id("games") },
  returns: v.object({
    imageKey: v.string(),
    elapsedMs: v.number(),
    roundMs: v.number(),
    hardStopMs: v.number(),
    finished: v.boolean(),
    points: v.union(v.number(), v.null()),
    answer: v.union(v.string(), v.null()), // only once finished
  }),
  handler: async (ctx, { token, gameId }) => {
    const { game, blur, group, member, play } = await load(ctx, token, gameId);
    const base = { imageKey: blur.imageKey, roundMs: ROUND_MS, hardStopMs: HARD_STOP_MS };
    if (play && play.finishedAt !== undefined) {
      return { ...base, elapsedMs: ROUND_MS, finished: true, points: play.points ?? 0, answer: blur.answers[0] };
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
      return { ...base, elapsedMs: 0, finished: false, points: null, answer: null };
    }
    const elapsedMs = Date.now() - play.startedAt;
    if (elapsedMs >= HARD_STOP_MS) {
      const points = await finishPlay(ctx, play, { basePoints: 0, detail: "Out of time" });
      return { ...base, elapsedMs, finished: true, points, answer: blur.answers[0] };
    }
    return { ...base, elapsedMs, finished: false, points: null, answer: null };
  },
});

export const guess = mutation({
  args: { token: v.string(), gameId: v.id("games"), guess: v.string() },
  returns: v.object({
    correct: v.boolean(),
    finished: v.boolean(),
    points: v.union(v.number(), v.null()),
    answer: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const { game, blur, group, play } = await load(ctx, args.token, args.gameId);
    if (!play) throw new ConvexError("Start the round first.");
    if (play.finishedAt !== undefined) {
      return { correct: false, finished: true, points: play.points ?? 0, answer: blur.answers[0] };
    }
    if (!isOpenGame(group, game)) throw new ConvexError("This round has closed.");
    const elapsedMs = Date.now() - play.startedAt;
    if (elapsedMs >= HARD_STOP_MS) {
      const points = await finishPlay(ctx, play, { basePoints: 0, detail: "Out of time" });
      return { correct: false, finished: true, points, answer: blur.answers[0] };
    }
    if (matchAnswer(args.guess.slice(0, GUESS_MAX_CHARS), blur.answers)) {
      const points = await finishPlay(ctx, play, {
        basePoints: blurPoints(elapsedMs, play.wrongGuesses),
        detail: `${(elapsedMs / 1000).toFixed(1)} s`,
      });
      return { correct: true, finished: true, points, answer: blur.answers[0] };
    }
    await ctx.db.patch("plays", play._id, { wrongGuesses: play.wrongGuesses + 1 });
    return { correct: false, finished: false, points: null, answer: null };
  },
});

export const giveUp = mutation({
  args: { token: v.string(), gameId: v.id("games") },
  returns: v.object({ answer: v.string() }),
  handler: async (ctx, { token, gameId }) => {
    const { blur, play } = await load(ctx, token, gameId);
    if (!play) throw new ConvexError("Start the round first.");
    if (play.finishedAt === undefined) await finishPlay(ctx, play, { basePoints: 0, detail: "Gave up" });
    return { answer: blur.answers[0] };
  },
});
