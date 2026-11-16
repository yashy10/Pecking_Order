import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { findMember, requireMember } from "./lib/auth";
import { FRIEND_MIN_ANSWERS, MAX_MEMBERS, READ_ROOM_FRIENDS } from "./lib/constants";
import { isOpenGame, membersOf } from "./lib/day";
import { memberMap, playFor, scoreReadRoom, sharePercent, shuffle, sourceOf } from "./lib/friends";
import { promptShape } from "./lib/games";
import { finishPlay } from "./lib/scoring";

// Friends-games track. Read the Room: a this-or-that question split the crew. The player
// guesses the share, then which way a few friends went. The split and everyone's side stay
// on the server until the player has locked in.

type Pick = NonNullable<Doc<"games">["readRoom"]>["picks"][number];

/**
 * Builds the round from an "either" question. Needs at least three answers, otherwise
 * returns null. The picks are stored shuffled: each player is asked about the first four
 * that aren't their own, so everyone gets nearly the same friends.
 */
export async function createReadRoomGame(
  ctx: MutationCtx,
  args: { groupId: Id<"groups">; week: number; day: number; multiplier: number },
  prompt: Doc<"prompts">,
): Promise<Id<"games"> | null> {
  if (promptShape(prompt).kind !== "either") return null;
  const options = prompt.options ?? [];
  if (options.length !== 2) return null;
  const answers = await ctx.db
    .query("answers")
    .withIndex("by_promptId", (q) => q.eq("promptId", prompt._id))
    .take(MAX_MEMBERS);
  const current = new Set((await membersOf(ctx, args.groupId)).map((m) => m._id));
  const picks: Pick[] = answers.flatMap((a) =>
    (a.choice === 0 || a.choice === 1) && current.has(a.memberId) ? [{ memberId: a.memberId, choice: a.choice }] : [],
  );
  if (picks.length < FRIEND_MIN_ANSWERS) return null;

  return await ctx.db.insert("games", {
    groupId: args.groupId,
    week: args.week,
    day: args.day,
    type: "readRoom",
    multiplier: args.multiplier,
    sourcePromptId: prompt._id,
    readRoom: { options, picks: shuffle(picks) },
  });
}

/** The friends this player is asked about: never themself, at most four, in a fixed order. */
export function askedPicks(game: Doc<"games">, me: Id<"members">): Pick[] {
  return (game.readRoom?.picks ?? []).filter((p) => p.memberId !== me).slice(0, READ_ROOM_FRIENDS);
}

const personV = v.object({ memberId: v.id("members"), name: v.string(), emoji: v.string() });
const friendResultV = v.object({
  memberId: v.id("members"),
  name: v.string(),
  emoji: v.string(),
  choice: v.number(),
  picked: v.union(v.null(), v.number()),
  right: v.boolean(),
});
const resultV = v.object({
  points: v.number(),
  sharePoints: v.number(),
  friendPoints: v.number(),
  guess: v.number(),
  /** The real share on the first option, whole percent. */
  actual: v.number(),
  counts: v.array(v.number()),
  /** Who went each way, for the split bar. */
  sides: v.array(v.array(personV)),
  correct: v.number(),
  asked: v.number(),
  friends: v.array(friendResultV),
});

/** The player's stored call: their share guess, then "memberId:choice" per friend. */
function encode(guess: number, calls: { memberId: Id<"members">; choice: number }[]): string[] {
  return [String(guess), ...calls.map((c) => `${c.memberId}:${c.choice}`)];
}

function decode(guesses: readonly string[]) {
  const guess = Number(guesses[0] ?? 0);
  const calls = new Map<string, number>();
  for (const g of guesses.slice(1)) {
    const [id, choice] = g.split(":");
    if (id) calls.set(id, Number(choice));
  }
  return { guess, calls };
}

function revealFor(
  game: Doc<"games">,
  me: Id<"members">,
  guess: number,
  calls: Map<string, number>,
  points: number,
  members: Map<Id<"members">, Doc<"members">>,
) {
  const picks = game.readRoom!.picks;
  const asked = askedPicks(game, me);
  const actual = sharePercent(picks.map((p) => p.choice));
  const friends = asked.map((p) => {
    const picked = calls.get(p.memberId);
    const m = members.get(p.memberId);
    return {
      memberId: p.memberId,
      name: m?.name ?? "Someone who left",
      emoji: m?.emoji ?? "🥚",
      choice: p.choice,
      picked: picked === 0 || picked === 1 ? picked : null,
      right: picked === p.choice,
    };
  });
  const correct = friends.filter((f) => f.right).length;
  const score = scoreReadRoom(guess, actual, correct, asked.length);
  const sides = [0, 1].map((side) =>
    picks
      .filter((p) => p.choice === side)
      .flatMap((p) => {
        const m = members.get(p.memberId);
        return m ? [{ memberId: m._id, name: m.name, emoji: m.emoji }] : [];
      }),
  );
  return {
    points,
    sharePoints: score.share,
    friendPoints: score.friends,
    guess,
    actual,
    counts: [0, 1].map((side) => picks.filter((p) => p.choice === side).length),
    sides,
    correct,
    asked: asked.length,
    friends,
  };
}

/**
 * The round for this player: the question, its two sides, the friends to call, and their
 * own answer if they gave one. `result` only once they have locked in. Null when the caller
 * can't play.
 */
export const get = query({
  args: { token: v.string(), gameId: v.id("games") },
  returns: v.union(
    v.null(),
    v.object({
      question: v.string(),
      askedWhen: v.string(),
      options: v.array(v.string()),
      myChoice: v.union(v.null(), v.number()),
      friends: v.array(personV),
      result: v.union(v.null(), resultV),
    }),
  ),
  handler: async (ctx, { token, gameId }) => {
    const game = await ctx.db.get("games", gameId);
    if (!game || game.type !== "readRoom" || !game.readRoom) return null;
    const me = await findMember(ctx, token, game.groupId);
    if (!me) return null;
    const members = await memberMap(ctx, game.groupId);
    const { question, askedWhen } = await sourceOf(ctx, game);
    const mine = game.readRoom.picks.find((p) => p.memberId === me._id);
    const friends = askedPicks(game, me._id).flatMap((p) => {
      const m = members.get(p.memberId);
      return m ? [{ memberId: m._id, name: m.name, emoji: m.emoji }] : [];
    });

    const play = await playFor(ctx, gameId, me._id);
    let result = null;
    if (play && play.finishedAt !== undefined) {
      const { guess, calls } = decode(play.guesses ?? []);
      result = revealFor(game, me._id, guess, calls, play.points ?? 0, members);
    }
    return {
      question,
      askedWhen,
      options: game.readRoom.options,
      myChoice: mine ? mine.choice : null,
      friends,
      result,
    };
  },
});

/** One shot: the share guess (0–100) and a side for each friend asked. Scored through finishPlay. */
export const submit = mutation({
  args: {
    token: v.string(),
    gameId: v.id("games"),
    guess: v.number(),
    calls: v.array(v.object({ memberId: v.id("members"), choice: v.number() })),
  },
  returns: resultV,
  handler: async (ctx, { token, gameId, guess, calls }) => {
    const game = await ctx.db.get("games", gameId);
    if (!game || game.type !== "readRoom" || !game.readRoom) {
      throw new ConvexError("That round doesn't exist.");
    }
    const group = await ctx.db.get("groups", game.groupId);
    if (!group) throw new ConvexError("That group doesn't exist.");
    const me = await requireMember(ctx, token, game.groupId);
    if (await playFor(ctx, gameId, me._id)) throw new ConvexError("You've already played this round.");
    if (!isOpenGame(group, game)) throw new ConvexError("This round has closed.");
    if (!Number.isFinite(guess) || guess < 0 || guess > 100) {
      throw new ConvexError("Pick a share between 0 and 100%.");
    }
    const share = Math.round(guess);

    const asked = askedPicks(game, me._id);
    const askedIds = new Set<string>(asked.map((p) => p.memberId));
    const kept = calls.filter((c) => askedIds.has(c.memberId) && (c.choice === 0 || c.choice === 1));
    const callOf = new Map<string, number>(kept.map((c) => [c.memberId, c.choice]));
    if (callOf.size < asked.length) throw new ConvexError("Call a side for every friend.");

    const actual = sharePercent(game.readRoom.picks.map((p) => p.choice));
    const correct = asked.filter((p) => callOf.get(p.memberId) === p.choice).length;
    const score = scoreReadRoom(share, actual, correct, asked.length);
    const playId = await ctx.db.insert("plays", {
      gameId,
      groupId: game.groupId,
      memberId: me._id,
      startedAt: Date.now(),
      wrongGuesses: asked.length - correct,
      guesses: encode(
        share,
        asked.map((p) => ({ memberId: p.memberId, choice: callOf.get(p.memberId)! })),
      ),
    });
    const play = await ctx.db.get("plays", playId);
    if (!play) throw new ConvexError("Something went wrong. Try again.");
    const points = await finishPlay(ctx, play, {
      basePoints: score.points,
      detail: `${correct} of ${asked.length}`,
    });
    return revealFor(game, me._id, share, callOf, points, await memberMap(ctx, game.groupId));
  },
});
