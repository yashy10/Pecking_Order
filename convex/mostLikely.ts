import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { findMember, requireMember } from "./lib/auth";
import { FRIEND_MIN_ANSWERS, MAX_MEMBERS } from "./lib/constants";
import { isOpenGame, membersOf } from "./lib/day";
import {
  buildTally,
  memberMap,
  MOST_LIKELY_MAX_CANDIDATES,
  playFor,
  podiumSize,
  scoreMostLikely,
  sourceOf,
} from "./lib/friends";
import { promptShape } from "./lib/games";
import { finishPlay } from "./lib/scoring";

// Friends-games track. Most Likely To: the crew voted for a friend; the player calls the
// podium. Vote counts stay on the server until the player has locked in, and who voted
// for whom never leaves it at all: the game only stores the counts.

type Tally = NonNullable<Doc<"games">["mostLikely"]>["tally"];

/**
 * Builds the round from a "vote" question. Needs at least three votes for current members,
 * otherwise returns null. The tally is padded with members who got no votes, so the
 * candidate list doesn't give the podium away.
 */
export async function createMostLikelyGame(
  ctx: MutationCtx,
  args: { groupId: Id<"groups">; week: number; day: number; multiplier: number },
  prompt: Doc<"prompts">,
): Promise<Id<"games"> | null> {
  if (promptShape(prompt).kind !== "vote") return null;
  const answers = await ctx.db
    .query("answers")
    .withIndex("by_promptId", (q) => q.eq("promptId", prompt._id))
    .take(MAX_MEMBERS);
  const members = (await membersOf(ctx, args.groupId)).map((m) => m._id);
  const tally = buildTally(
    answers.map((a) => a.voteFor),
    members,
  );
  const voters = tally.reduce((sum, t) => sum + t.votes, 0);
  if (voters < FRIEND_MIN_ANSWERS) return null;

  return await ctx.db.insert("games", {
    groupId: args.groupId,
    week: args.week,
    day: args.day,
    type: "mostLikely",
    multiplier: args.multiplier,
    sourcePromptId: prompt._id,
    mostLikely: { tally, voters },
  });
}

/** Who the player can pick from: the top of the tally, in alphabetical order so it gives nothing away. */
function candidatesOf(tally: Tally): Id<"members">[] {
  return tally.slice(0, MOST_LIKELY_MAX_CANDIDATES).map((t) => t.memberId);
}

const personV = v.object({ memberId: v.id("members"), name: v.string(), emoji: v.string(), isMe: v.boolean() });
const barV = v.object({
  memberId: v.id("members"),
  name: v.string(),
  emoji: v.string(),
  votes: v.number(),
  isMe: v.boolean(),
});
const pickV = v.object({
  memberId: v.id("members"),
  name: v.string(),
  emoji: v.string(),
  votes: v.number(),
  right: v.boolean(),
});
const resultV = v.object({
  points: v.number(),
  correct: v.number(),
  places: v.number(),
  voters: v.number(),
  myVotes: v.number(),
  /** Everyone who got a vote (at most eight), most first. Counts only, never who voted. */
  bars: v.array(barV),
  /** The player's call, place by place. */
  picks: v.array(pickV),
});

function revealFor(
  game: Doc<"games">,
  me: Id<"members">,
  picks: readonly string[],
  points: number,
  members: Map<Id<"members">, Doc<"members">>,
) {
  const { tally, voters } = game.mostLikely!;
  const score = scoreMostLikely(tally, picks);
  const votesOf = new Map(tally.map((t) => [t.memberId as string, t.votes]));
  const person = (id: Id<"members">) => {
    const m = members.get(id);
    return { memberId: id, name: m?.name ?? "Someone who left", emoji: m?.emoji ?? "🥚" };
  };
  return {
    points,
    correct: score.correct,
    places: score.places,
    voters,
    myVotes: votesOf.get(me) ?? 0,
    bars: [...tally]
      .filter((t) => t.votes > 0)
      .sort((a, b) => b.votes - a.votes)
      .slice(0, MOST_LIKELY_MAX_CANDIDATES)
      .map((t) => ({ ...person(t.memberId), votes: t.votes, isMe: t.memberId === me })),
    picks: picks.slice(0, score.places).map((id, i) => ({
      ...person(id as Id<"members">),
      votes: votesOf.get(id) ?? 0,
      right: score.right[i] ?? false,
    })),
  };
}

/**
 * The round for this player: the question, the candidates and how many places to call.
 * `result` (the counts) only once they have locked in. Null when the caller can't play.
 */
export const get = query({
  args: { token: v.string(), gameId: v.id("games") },
  returns: v.union(
    v.null(),
    v.object({
      question: v.string(),
      askedWhen: v.string(),
      places: v.number(),
      candidates: v.array(personV),
      result: v.union(v.null(), resultV),
    }),
  ),
  handler: async (ctx, { token, gameId }) => {
    const game = await ctx.db.get("games", gameId);
    if (!game || game.type !== "mostLikely" || !game.mostLikely) return null;
    const me = await findMember(ctx, token, game.groupId);
    if (!me) return null;
    const members = await memberMap(ctx, game.groupId);
    const { question, askedWhen } = await sourceOf(ctx, game);

    const candidates = candidatesOf(game.mostLikely.tally)
      .flatMap((id) => {
        const m = members.get(id);
        return m ? [{ memberId: m._id, name: m.name, emoji: m.emoji, isMe: m._id === me._id }] : [];
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const play = await playFor(ctx, gameId, me._id);
    const result =
      play && play.finishedAt !== undefined
        ? revealFor(game, me._id, play.guesses ?? [], play.points ?? 0, members)
        : null;
    return { question, askedWhen, places: podiumSize(game.mostLikely.tally), candidates, result };
  },
});

/** One shot: `picks` is the player's podium, 1st place first. Scored through finishPlay. */
export const submit = mutation({
  args: { token: v.string(), gameId: v.id("games"), picks: v.array(v.id("members")) },
  returns: resultV,
  handler: async (ctx, { token, gameId, picks }) => {
    const game = await ctx.db.get("games", gameId);
    if (!game || game.type !== "mostLikely" || !game.mostLikely) {
      throw new ConvexError("That round doesn't exist.");
    }
    const group = await ctx.db.get("groups", game.groupId);
    if (!group) throw new ConvexError("That group doesn't exist.");
    const me = await requireMember(ctx, token, game.groupId);
    if (await playFor(ctx, gameId, me._id)) throw new ConvexError("You've already played this round.");
    if (!isOpenGame(group, game)) throw new ConvexError("This round has closed.");

    const places = podiumSize(game.mostLikely.tally);
    const candidates = new Set<string>(candidatesOf(game.mostLikely.tally));
    if (picks.length !== places) throw new ConvexError(`Pick someone for all ${places} places.`);
    if (new Set(picks).size !== picks.length) throw new ConvexError("Pick a different person for each place.");
    if (picks.some((id) => !candidates.has(id))) throw new ConvexError("Pick from the names on the list.");

    const score = scoreMostLikely(game.mostLikely.tally, picks);
    const playId = await ctx.db.insert("plays", {
      gameId,
      groupId: game.groupId,
      memberId: me._id,
      startedAt: Date.now(),
      wrongGuesses: places - score.correct,
      guesses: picks,
    });
    const play = await ctx.db.get("plays", playId);
    if (!play) throw new ConvexError("Something went wrong. Try again.");
    const points = await finishPlay(ctx, play, {
      basePoints: score.points,
      detail: `${score.correct} of ${places}`,
    });
    return revealFor(game, me._id, picks, points, await memberMap(ctx, game.groupId));
  },
});
