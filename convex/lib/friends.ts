import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { DAY_NAMES, FRIEND_MAX_POINTS, LAST_GAME_DAY, MOST_LIKELY_PODIUM } from "./constants";
import { membersOf } from "./day";

// Friends-games track. Scoring and shared helpers for Most Likely To, Read the Room and
// Match-Up. The scoring functions are pure, so convex/lib/friends.test.ts covers them.

type Ctx = QueryCtx | MutationCtx;

// ---------------------------------------------------------------------------------------
// Shared

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** "Yesterday", "On Tuesday", "Last Saturday" or "Earlier": when the source question was asked. */
export function askedWhen(asked: { week: number; day: number }, game: { week: number; day: number }): string {
  const name = DAY_NAMES[asked.day] ?? "a while ago";
  if (asked.week === game.week) return asked.day === game.day - 1 ? "Yesterday" : `On ${name}`;
  if (asked.week === game.week - 1) return game.day === 0 && asked.day === LAST_GAME_DAY ? "On Saturday" : `Last ${name}`;
  return "Earlier";
}

export async function playFor(ctx: Ctx, gameId: Id<"games">, memberId: Id<"members">) {
  return await ctx.db
    .query("plays")
    .withIndex("by_gameId_and_memberId", (q) => q.eq("gameId", gameId).eq("memberId", memberId))
    .unique();
}

export async function memberMap(ctx: Ctx, groupId: Id<"groups">) {
  return new Map((await membersOf(ctx, groupId)).map((m) => [m._id, m]));
}

/** The question a friends game was built from, and when it was asked. */
export async function sourceOf(ctx: Ctx, game: Doc<"games">) {
  const prompt = game.sourcePromptId ? await ctx.db.get("prompts", game.sourcePromptId) : null;
  return {
    question: prompt?.question ?? "The crew's answers",
    askedWhen: prompt ? askedWhen(prompt, game) : "Earlier",
    prompt,
  };
}

// ---------------------------------------------------------------------------------------
// Most Likely To

/** Points for 1st, 2nd and 3rd. A shorter podium keeps the ratio and still totals 200. */
export const PODIUM_WEIGHTS = [100, 50, 50] as const;
/**
 * The candidate list: everyone who got a vote, padded with 0-vote members to eight (or the
 * whole group, if smaller), so it never gives away exactly who got votes. More than eight
 * got votes: the top eight.
 */
export const MOST_LIKELY_MAX_CANDIDATES = 8;

export type TallyEntry<T extends string = string> = { memberId: T; votes: number };

/**
 * Counts votes for current members, most votes first (ties keep first-vote order), then
 * pads with members who got none, chosen at random, until there are at least `min` entries.
 */
export function buildTally<T extends string>(
  votes: readonly (T | undefined)[],
  memberIds: readonly T[],
  random: () => number = Math.random,
  min = MOST_LIKELY_MAX_CANDIDATES,
): TallyEntry<T>[] {
  const valid = new Set(memberIds);
  const counts = new Map<T, number>();
  for (const id of votes) {
    if (id !== undefined && valid.has(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const voted = [...counts.entries()]
    .map(([memberId, n]) => ({ memberId, votes: n }))
    .sort((a, b) => b.votes - a.votes);
  const padding = shuffle(
    memberIds.filter((id) => !counts.has(id)),
    random,
  ).slice(0, Math.max(0, min - voted.length));
  return [...voted, ...padding.map((memberId) => ({ memberId, votes: 0 }))];
}

/** How many places the podium has: up to three, but only people who got a vote stand on it. */
export function podiumSize(tally: readonly TallyEntry[]): number {
  return Math.min(MOST_LIKELY_PODIUM, tally.filter((t) => t.votes > 0).length);
}

/** The weights for a podium of `places`, rescaled so they total 200. */
export function podiumWeights(places: number): number[] {
  const raw = PODIUM_WEIGHTS.slice(0, Math.max(0, places));
  const sum = raw.reduce((a, b) => a + b, 0);
  return sum === 0 ? [] : raw.map((w) => (w * FRIEND_MAX_POINTS) / sum);
}

/**
 * A pick for a place is right when that person's vote count equals the count at that
 * place, so ties are forgiving: with A and B on 3 votes each, A–B and B–A both score.
 */
export function scoreMostLikely(tally: readonly TallyEntry[], picks: readonly string[]) {
  const sorted = [...tally].sort((a, b) => b.votes - a.votes);
  const places = podiumSize(sorted);
  const weights = podiumWeights(places);
  const votesOf = new Map(sorted.map((t) => [t.memberId, t.votes]));
  // Someone picked for two places only counts at the first.
  const right = weights.map((_, i) => {
    const pick = picks[i];
    return pick !== undefined && picks.indexOf(pick) === i && (votesOf.get(pick) ?? 0) === sorted[i].votes;
  });
  const points = Math.round(weights.reduce((sum, w, i) => sum + (right[i] ? w : 0), 0));
  return { places, right, correct: right.filter(Boolean).length, points };
}

// ---------------------------------------------------------------------------------------
// Read the Room

export const READ_ROOM_STEP = 5;

/** The share of answers on the first option, as a whole percent. */
export function sharePercent(choices: readonly number[]): number {
  if (choices.length === 0) return 0;
  return Math.round((100 * choices.filter((c) => c === 0).length) / choices.length);
}

/** Up to 100 for the share: four points off for every percentage point you're out. */
export function shareScore(guess: number, actual: number): number {
  return Math.max(0, 100 - 4 * Math.abs(guess - actual));
}

/** Share part (max 100) plus friends part (100 × right / asked). No friends to call: the share counts double. */
export function scoreReadRoom(guess: number, actual: number, correct: number, asked: number) {
  const share = shareScore(guess, actual);
  const friends = asked > 0 ? Math.round((100 * correct) / asked) : share;
  return { share, friends, points: share + friends };
}

// ---------------------------------------------------------------------------------------
// Match-Up

/** Pairs stored per game; each player is asked up to MATCH_UP_PAIRS of them, never their own. */
export const MATCH_UP_STORED = 6;
export const MATCH_UP_MIN = 3;
const MATCH_UP_BASE = 150;
const MATCH_UP_BONUS = 50;
const MATCH_UP_BONUS_GRACE_S = 10;

/** A perfect match earns up to 50 more: full until 10 s, then one point a second. */
export function matchUpBonus(elapsedMs: number): number {
  const seconds = Math.max(0, elapsedMs) / 1000;
  return Math.min(MATCH_UP_BONUS, Math.max(0, MATCH_UP_BONUS - Math.floor(seconds - MATCH_UP_BONUS_GRACE_S)));
}

export function scoreMatchUp(correct: number, asked: number, elapsedMs: number) {
  if (asked <= 0) return { base: 0, bonus: 0, points: 0 };
  const base = Math.round((MATCH_UP_BASE * correct) / asked);
  const bonus = correct === asked ? matchUpBonus(elapsedMs) : 0;
  return { base, bonus, points: base + bonus };
}
