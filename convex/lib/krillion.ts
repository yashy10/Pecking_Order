import type { Category, KrillionPuzzle } from "../content/krillion";
import { KRILLION_PUZZLES, NOKRILLION_PUZZLES } from "../content/krillion";
import { editDistance, matchAnswer, normalize } from "./match";

// Owned by the krillion track. Pure rules for Krillion (rare answers win) and Nokrillion
// (common answers win): matching an answer, scoring it, and replaying a play's attempts.

export type Mode = "rare" | "common";

/** Most a round can score; a perfect day is 100. */
export const ROUND_MAX = [34, 33, 33] as const;
/** What the least valuable right answer still scores. */
export const ROUND_MIN = 10;
export const MAX_STRIKES = 3;
export const ANSWER_MAX_CHARS = 60;

export function puzzleFor(type: string, key: string | undefined): KrillionPuzzle | null {
  const pool = type === "krillion" ? KRILLION_PUZZLES : type === "nokrillion" ? NOKRILLION_PUZZLES : null;
  return pool?.find((p) => p.key === key) ?? null;
}

export function modeFor(type: string): Mode {
  return type === "nokrillion" ? "common" : "rare";
}

/**
 * Points for the answer at `rank` (0 = most common) in a list of `size`.
 * Krillion climbs from 10 for the most common to `max` for the rarest; Nokrillion is the mirror.
 */
export function roundPoints(mode: Mode, rank: number, size: number, max: number): number {
  const rarity = size <= 1 ? 1 : rank / (size - 1);
  const share = mode === "rare" ? rarity : 1 - rarity;
  return Math.round(ROUND_MIN + (max - ROUND_MIN) * share);
}

/** The forms of a text that count as the same answer: spaced, joined, and without a trailing s. */
function forms(text: string): string[] {
  const spaced = normalize(text);
  const joined = spaced.replace(/ /g, "");
  const singular = joined.endsWith("s") ? joined.slice(0, -1) : joined;
  return [spaced, joined, singular];
}

/** A key for "the same text", so a repeated wrong answer isn't charged twice. */
export function sameTextKey(text: string): string {
  return normalize(text).replace(/ /g, "");
}

/**
 * Which listed answer a text names, or -1. An exact match (after normalising) always wins;
 * otherwise the typo-tolerant `matchAnswer`, taking the closest answer when several are in reach.
 */
export function findAnswer(text: string, category: Category): number {
  const guess = forms(text);
  if (!guess[1]) return -1;
  const exact = category.answers.findIndex((a) =>
    a.names.some((n) => forms(n).some((f) => guess.includes(f))),
  );
  if (exact >= 0) return exact;
  let best = -1;
  let bestDistance = Infinity;
  category.answers.forEach((a, i) => {
    if (!matchAnswer(text, a.names)) return;
    for (const n of a.names) {
      const d = editDistance(guess[1], forms(n)[1]);
      if (d < bestDistance) {
        bestDistance = d;
        best = i;
      }
    }
  });
  return best;
}

/** Attempts are stored on the play as "<round>:<text>", in order. */
export function encodeAttempt(round: number, text: string): string {
  return `${round}:${text}`;
}

function decodeAttempt(entry: string): { round: number; text: string } {
  const at = entry.indexOf(":");
  return { round: Number(entry.slice(0, at)), text: entry.slice(at + 1) };
}

export type RoundResult = {
  /** Index of the answer hit, or null. */
  hit: number | null;
  /** The player's own words for the hit. */
  hitText: string | null;
  strikes: number;
  /** sameTextKey of every wrong attempt. */
  misses: string[];
  /** The wrong attempts as typed. */
  missTexts: string[];
  done: boolean;
  /** Base points (before the day's multiplier). */
  points: number;
};

/** Replays a play's attempts against the puzzle. */
export function replay(puzzle: KrillionPuzzle, mode: Mode, attempts: string[]): RoundResult[] {
  const results: RoundResult[] = puzzle.rounds.map(() => ({
    hit: null,
    hitText: null,
    strikes: 0,
    misses: [],
    missTexts: [],
    done: false,
    points: 0,
  }));
  for (const entry of attempts) {
    const { round, text } = decodeAttempt(entry);
    const r = results[round];
    const category = puzzle.rounds[round];
    if (!r || !category || r.done) continue;
    const index = findAnswer(text, category);
    if (index >= 0) {
      r.hit = index;
      r.hitText = text;
      r.done = true;
      r.points = roundPoints(mode, index, category.answers.length, ROUND_MAX[round] ?? ROUND_MIN);
    } else {
      r.strikes += 1;
      r.misses.push(sameTextKey(text));
      r.missTexts.push(text);
      if (r.strikes >= MAX_STRIKES) r.done = true;
    }
  }
  return results;
}

/** The first round still open, or the number of rounds when all are done. */
export function currentRound(results: RoundResult[]): number {
  const i = results.findIndex((r) => !r.done);
  return i < 0 ? results.length : i;
}
