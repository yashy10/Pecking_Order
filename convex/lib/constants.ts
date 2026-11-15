// Frozen in Phase 0. Owned by the lead. The numbers from docs/PLAN.md §6.3.

export const TOKEN_MIN_LENGTH = 32;
export const NAME_MAX_CHARS = 20;
export const GROUP_NAME_MAX_CHARS = 30;
export const ANSWER_MAX_CHARS = 140;
export const MAX_MEMBERS = 200;

// The week. Days are 0 = Monday … 6 = Sunday.
export const LAST_GAME_DAY = 5; // Saturday
export const SUNDAY = 6;
export const WILDCARD_DAY = 2; // Wednesday
export const WILDCARD_MULTIPLIER = 2;

// Blur
export const ROUND_MS = 20_000; // the photo is fully sharp at 20 s
export const HARD_STOP_MS = 30_000; // no correct guess by 30 s scores 0
export const MAX_POINTS = 100;
export const MS_PER_POINT_LOST = 200;
export const MIN_CORRECT_POINTS = 10;
export const WRONG_GUESS_PENALTY = 5;
export const GUESS_MAX_CHARS = 60;

// Who Said It
export const WHO_SAID_IT_MIN_AUTHORS = 3;
export const WHO_SAID_IT_MAX_QUOTES = 6;
export const WHO_SAID_IT_ASKED = 4;
export const WHO_SAID_IT_OPTIONS = 4;

// Rewards and powers
export const PROMPT_BONUS = 10;
export const STREAK_SPY_EVERY = 3;
export const WELCOME_KIT = { ghost: 1, spy: 1 } as const;
export const SLOTS_ABOVE = 1;
export const SLOTS_ABOVE_WITH_SPY = 3;
export const SLOTS_BELOW = 1;

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export function dayLabel(day: number): string {
  if (day === WILDCARD_DAY) return "Wildcard Wednesday";
  if (day === SUNDAY) return "Finale Sunday";
  return DAY_NAMES[day] ?? `Day ${day + 1}`;
}
