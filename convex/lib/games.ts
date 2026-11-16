import type { Infer } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { friendGameV, gameTypeV, miniGameV, promptKindV } from "../schema";
import {
  FRIEND_MAX_POINTS,
  MINI_MAX_POINTS,
  PUZZLE_MIN_POINTS,
  PUZZLE_MS_PER_POINT_LOST,
} from "./constants";

// Owned by the lead. Which games run on which day, and the scoring shared by the puzzles.
//
// Week 1: one mini game a day, a different one each day, so everyone meets the set.
// Week 2 on: a mini game plus a friends game, built from the group's answers to an
// earlier daily question. The friends game is worth twice as much.

export type GameType = Infer<typeof gameTypeV>;
export type MiniGame = Infer<typeof miniGameV>;
export type FriendGame = Infer<typeof friendGameV>;
export type PromptKind = Infer<typeof promptKindV>;

/** Monday to Saturday of week 1. Blur joins the rotation from week 2. */
export const WEEK_ONE_MINIS: MiniGame[] = ["wordle", "flow", "krillion", "sudoku", "nokrillion", "crossword"];
/** Seven games over six days, so the line-up shifts by one each week. */
export const MINI_ROTATION: MiniGame[] = ["wordle", "flow", "krillion", "blur", "sudoku", "nokrillion", "crossword"];

const FRIEND_GAMES: readonly string[] = ["whoSaidIt", "mostLikely", "readRoom", "matchUp"];

export function isFriendGame(type: GameType): type is FriendGame {
  return FRIEND_GAMES.includes(type);
}

export function maxPointsFor(type: GameType): number {
  return isFriendGame(type) ? FRIEND_MAX_POINTS : MINI_MAX_POINTS;
}

export function miniGameFor(week: number, day: number): MiniGame {
  if (week <= 1) return WEEK_ONE_MINIS[day % WEEK_ONE_MINIS.length];
  return MINI_ROTATION[((week - 2) * 6 + day) % MINI_ROTATION.length];
}

/**
 * Which preset puzzle a mini game uses. Each mini game shows up at most once a week,
 * so week N plays the Nth puzzle, and nothing repeats until the pool runs out.
 */
export function puzzleIndex(poolSize: number, week: number): number {
  return Math.max(0, week - 1) % Math.max(1, poolSize);
}

/** The daily question's shape, and the friends game its answers are meant for. */
const QUESTION_CYCLE: { kind: PromptKind; feeds: FriendGame }[] = [
  { kind: "text", feeds: "whoSaidIt" },
  { kind: "vote", feeds: "mostLikely" },
  { kind: "either", feeds: "readRoom" },
  { kind: "text", feeds: "matchUp" },
];

export function questionShapeFor(week: number, day: number) {
  return QUESTION_CYCLE[(week * 7 + day) % QUESTION_CYCLE.length];
}

/** What a stored prompt feeds, for prompts written before question shapes existed. */
export function promptShape(prompt: Doc<"prompts">): { kind: PromptKind; feeds: FriendGame } {
  const kind = prompt.kind ?? "text";
  const feeds = prompt.feeds ?? (kind === "vote" ? "mostLikely" : kind === "either" ? "readRoom" : "whoSaidIt");
  return { kind, feeds };
}

/**
 * Timed puzzles: full marks up to par, then one point every two seconds, never below 30.
 * A failed check costs `penalty` each. Elapsed time is always measured on the server.
 */
export function timedPuzzlePoints(elapsedMs: number, parMs: number, penalties = 0, penalty = 5): number {
  const over = Math.max(0, elapsedMs - parMs);
  return Math.max(
    PUZZLE_MIN_POINTS,
    MINI_MAX_POINTS - Math.floor(over / PUZZLE_MS_PER_POINT_LOST) - penalties * penalty,
  );
}
