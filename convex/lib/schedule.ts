import { LAST_GAME_DAY } from "./constants";

// The automatic clock's calendar maths (PLAN §6.2, "real mode"). Pure functions, so they
// are tested without Convex. Owned by the lead.
//
// A group's week is anchored at `weekStartsAt`: the instant its Monday begins, 00:00 local.
// "Local" is UTC plus the group's fixed offset, taken from the creator's device when the
// group is made. A fixed offset ignores daylight saving, so after a change the times are an
// hour off until the next one; per-group time zones come after the hackathon.
//
//   each game day  00:00 the game opens · 21:00 the scores are revealed
//   Sunday         00:00 no game, "finale tonight" · 21:00 the finale
//   next Monday    00:00 a new week

export const OPEN_HOUR = 0;
export const REVEAL_HOUR = 21;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;

/** UTC-12 to UTC+14: every offset in use. */
export const MIN_OFFSET_MINUTES = -12 * 60;
export const MAX_OFFSET_MINUTES = 14 * 60;

export type ClockState = { day: number; phase: "open" | "revealed" | "finale" };

/** The instant it is `hour` o'clock local on `day` (0 = Monday, 7 = next Monday) of the week. */
export function at(weekStartsAt: number, day: number, hour: number): number {
  return weekStartsAt + day * DAY + hour * HOUR;
}

/** When a group in `state` takes its next step. */
export function nextTickAt(state: ClockState, weekStartsAt: number): number {
  if (state.phase === "finale") return at(weekStartsAt, 7, OPEN_HOUR); // a new week
  if (state.phase === "open") return at(weekStartsAt, state.day, REVEAL_HOUR); // the reveal, or Sunday's finale
  return at(weekStartsAt, state.day + 1, OPEN_HOUR); // revealed: the next day opens
}

/** When this week's finale runs: Sunday at the reveal hour. */
export function finaleAt(weekStartsAt: number): number {
  return at(weekStartsAt, 6, REVEAL_HOUR);
}

/** The instant the local Monday of the week containing `now` began. */
export function weekStartFor(now: number, offsetMinutes: number): number {
  const offset = offsetMinutes * MINUTE;
  const localMidnight = Math.floor((now + offset) / DAY) * DAY; // local midnight, read as UTC
  const weekday = (new Date(localMidnight).getUTCDay() + 6) % 7; // 0 = Monday
  return localMidnight - weekday * DAY - offset;
}

/**
 * Where a new group starts, following the real calendar: today's game while today's
 * reveal is still ahead, otherwise the next game day's, open early. Sunday has no game,
 * so a group made on Saturday night or on Sunday starts with next Monday's.
 */
export function startingPoint(now: number, offsetMinutes: number): { weekStartsAt: number; day: number } {
  let weekStartsAt = weekStartFor(now, offsetMinutes);
  let day = Math.floor((now - weekStartsAt) / DAY);
  if (now >= at(weekStartsAt, day, REVEAL_HOUR)) day += 1;
  if (day > LAST_GAME_DAY) {
    weekStartsAt += WEEK;
    day = 0;
  }
  return { weekStartsAt, day };
}
