import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { findMember, requireMember } from "./lib/auth";
import { FRIEND_MIN_ANSWERS, MATCH_UP_PAIRS, MAX_MEMBERS } from "./lib/constants";
import { isOpenGame, membersOf } from "./lib/day";
import {
  MATCH_UP_MIN,
  MATCH_UP_STORED,
  memberMap,
  playFor,
  scoreMatchUp,
  shuffle,
  sourceOf,
} from "./lib/friends";
import { promptShape } from "./lib/games";
import { finishPlay } from "./lib/scoring";

// Friends-games track. Match-Up: four anonymised answers and the four friends who wrote
// them; pair them up against the clock. Who wrote what stays on the server until the
// player has locked in. The clock starts on the server, in `start`.

type Pair = NonNullable<Doc<"games">["matchUp"]>["pairs"][number];

/**
 * Builds the round from a written-answer question. Needs answers from at least three
 * members, otherwise returns null. Stores up to six pairs, shuffled; each player matches
 * the first four that aren't their own.
 */
export async function createMatchUpGame(
  ctx: MutationCtx,
  args: { groupId: Id<"groups">; week: number; day: number; multiplier: number },
  prompt: Doc<"prompts">,
): Promise<Id<"games"> | null> {
  if (promptShape(prompt).kind !== "text") return null;
  const answers = await ctx.db
    .query("answers")
    .withIndex("by_promptId", (q) => q.eq("promptId", prompt._id))
    .take(MAX_MEMBERS);
  const current = new Set((await membersOf(ctx, args.groupId)).map((m) => m._id));
  const seen = new Set<Id<"members">>();
  const usable = answers.filter((a) => {
    if (!current.has(a.memberId) || seen.has(a.memberId) || !(a.rewritten || a.text).trim()) return false;
    seen.add(a.memberId);
    return true;
  });
  if (usable.length < FRIEND_MIN_ANSWERS) return null;

  const pairs: Pair[] = shuffle(usable)
    .slice(0, MATCH_UP_STORED)
    .map((a) => ({ answerId: a._id, authorId: a.memberId }));
  return await ctx.db.insert("games", {
    groupId: args.groupId,
    week: args.week,
    day: args.day,
    type: "matchUp",
    multiplier: args.multiplier,
    sourcePromptId: prompt._id,
    matchUp: { pairs },
  });
}

/** The pairs this player matches: never their own, at most four, in a fixed order. Fewer than three: nothing to play. */
function askedPairs(game: Doc<"games">, me: Id<"members">): Pair[] {
  const pairs = (game.matchUp?.pairs ?? []).filter((p) => p.authorId !== me).slice(0, MATCH_UP_PAIRS);
  return pairs.length >= MATCH_UP_MIN ? pairs : [];
}

const statusV = v.union(v.literal("ready"), v.literal("playing"), v.literal("done"), v.literal("closed"));
const answerV = v.object({ answerId: v.id("answers"), text: v.string() });
const personV = v.object({ memberId: v.id("members"), name: v.string(), emoji: v.string() });
const revealV = v.object({
  answerId: v.id("answers"),
  authorId: v.id("members"),
  authorName: v.string(),
  authorEmoji: v.string(),
  pickedId: v.union(v.null(), v.id("members")),
  right: v.boolean(),
});
const resultV = v.object({
  points: v.number(),
  correct: v.number(),
  asked: v.number(),
  bonus: v.number(),
  seconds: v.number(),
  reveal: v.array(revealV),
});

/** The player's stored call: "answerId:memberId" per answer. */
function decode(guesses: readonly string[]): Map<string, string> {
  return new Map(
    guesses.flatMap((g) => {
      const [answerId, memberId] = g.split(":");
      return answerId && memberId ? [[answerId, memberId] as const] : [];
    }),
  );
}

function revealFor(
  asked: Pair[],
  calls: Map<string, string>,
  play: { points: number; elapsedMs: number },
  members: Map<Id<"members">, Doc<"members">>,
) {
  const reveal = asked.map((p) => {
    const author = members.get(p.authorId);
    const picked = calls.get(p.answerId);
    return {
      answerId: p.answerId,
      authorId: p.authorId,
      authorName: author?.name ?? "Someone who left",
      authorEmoji: author?.emoji ?? "🥚",
      pickedId: picked ? (picked as Id<"members">) : null,
      right: picked === p.authorId,
    };
  });
  const correct = reveal.filter((r) => r.right).length;
  return {
    points: play.points,
    correct,
    asked: asked.length,
    bonus: scoreMatchUp(correct, asked.length, play.elapsedMs).bonus,
    seconds: Math.round(play.elapsedMs / 100) / 10,
    reveal,
  };
}

/**
 * The round for this player. Before `start`, only the question and how many answers there
 * are; after, the answers (text read now, so a late rewrite shows up) and the friends in
 * alphabetical order. `result` with the authors once they have locked in. Null when the
 * caller can't play.
 */
export const get = query({
  args: { token: v.string(), gameId: v.id("games") },
  returns: v.union(
    v.null(),
    v.object({
      question: v.string(),
      askedWhen: v.string(),
      size: v.number(),
      status: statusV,
      startedAt: v.union(v.null(), v.number()),
      answers: v.array(answerV),
      friends: v.array(personV),
      result: v.union(v.null(), resultV),
    }),
  ),
  handler: async (ctx, { token, gameId }) => {
    const game = await ctx.db.get("games", gameId);
    if (!game || game.type !== "matchUp" || !game.matchUp) return null;
    const me = await findMember(ctx, token, game.groupId);
    if (!me) return null;
    const group = await ctx.db.get("groups", game.groupId);
    if (!group) return null;
    const { question, askedWhen } = await sourceOf(ctx, game);
    const asked = askedPairs(game, me._id);
    const play = await playFor(ctx, gameId, me._id);
    const done = play !== null && play.finishedAt !== undefined;
    const status = done ? "done" : play ? (isOpenGame(group, game) ? "playing" : "closed") : isOpenGame(group, game) ? "ready" : "closed";

    const base = { question, askedWhen, size: asked.length, status, startedAt: play?.startedAt ?? null } as const;
    if (!play || asked.length === 0) return { ...base, answers: [], friends: [], result: null };

    const members = await memberMap(ctx, game.groupId);
    const answers = [];
    for (const p of asked) {
      const answer = await ctx.db.get("answers", p.answerId);
      answers.push({ answerId: p.answerId, text: answer ? answer.rewritten || answer.text : "…" });
    }
    const friends = asked
      .flatMap((p) => {
        const m = members.get(p.authorId);
        return m ? [{ memberId: m._id, name: m.name, emoji: m.emoji }] : [];
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    const result = done
      ? revealFor(asked, decode(play.guesses ?? []), {
          points: play.points ?? 0,
          elapsedMs: (play.finishedAt ?? play.startedAt) - play.startedAt,
        }, members)
      : null;
    return { ...base, answers, friends, result };
  },
});

/**
 * Starts the clock: creates the play with the server's time. Calling it again returns the
 * same start, so a refresh mid-round doesn't reset the timer. `now` lets the app line its
 * clock up with the server's.
 */
export const start = mutation({
  args: { token: v.string(), gameId: v.id("games") },
  returns: v.object({ startedAt: v.number(), now: v.number() }),
  handler: async (ctx, { token, gameId }) => {
    const game = await ctx.db.get("games", gameId);
    if (!game || game.type !== "matchUp" || !game.matchUp) {
      throw new ConvexError("That round doesn't exist.");
    }
    const group = await ctx.db.get("groups", game.groupId);
    if (!group) throw new ConvexError("That group doesn't exist.");
    const me = await requireMember(ctx, token, game.groupId);
    const now = Date.now();
    const existing = await playFor(ctx, gameId, me._id);
    if (existing) return { startedAt: existing.startedAt, now };
    if (!isOpenGame(group, game)) throw new ConvexError("This round has closed.");
    if (askedPairs(game, me._id).length === 0) throw new ConvexError("There's nothing for you to match today.");
    await ctx.db.insert("plays", {
      gameId,
      groupId: game.groupId,
      memberId: me._id,
      startedAt: now,
      wrongGuesses: 0,
    });
    return { startedAt: now, now };
  },
});

/**
 * One shot: an author for each answer. 150 × right / asked, plus the speed bonus for a
 * perfect match, timed from `start` on the server. Scored through finishPlay.
 */
export const submit = mutation({
  args: {
    token: v.string(),
    gameId: v.id("games"),
    picks: v.array(v.object({ answerId: v.id("answers"), memberId: v.id("members") })),
  },
  returns: resultV,
  handler: async (ctx, { token, gameId, picks }) => {
    const game = await ctx.db.get("games", gameId);
    if (!game || game.type !== "matchUp" || !game.matchUp) {
      throw new ConvexError("That round doesn't exist.");
    }
    const group = await ctx.db.get("groups", game.groupId);
    if (!group) throw new ConvexError("That group doesn't exist.");
    const me = await requireMember(ctx, token, game.groupId);
    const play = await playFor(ctx, gameId, me._id);
    if (!play) throw new ConvexError("Start the round first.");
    if (play.finishedAt !== undefined) throw new ConvexError("You've already played this round.");
    if (!isOpenGame(group, game)) throw new ConvexError("This round has closed.");

    const asked = askedPairs(game, me._id);
    const askedIds = new Set<string>(asked.map((p) => p.answerId));
    const calls = new Map<string, string>(
      picks.filter((p) => askedIds.has(p.answerId)).map((p) => [p.answerId, p.memberId]),
    );
    if (calls.size < asked.length) throw new ConvexError("Pair every answer with a friend.");

    const elapsedMs = Date.now() - play.startedAt;
    const correct = asked.filter((p) => calls.get(p.answerId) === p.authorId).length;
    const score = scoreMatchUp(correct, asked.length, elapsedMs);
    await ctx.db.patch("plays", play._id, {
      wrongGuesses: asked.length - correct,
      guesses: [...calls].map(([answerId, memberId]) => `${answerId}:${memberId}`),
    });
    const points = await finishPlay(ctx, play, {
      basePoints: score.points,
      detail: `${correct} of ${asked.length}`,
    });
    return revealFor(asked, calls, { points, elapsedMs }, await memberMap(ctx, game.groupId));
  },
});
