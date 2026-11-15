import { describe, expect, it } from "vitest";
import { at, finaleAt, nextTickAt, startingPoint, WEEK, weekStartFor } from "./schedule";

// Pacific Standard Time is UTC-8. November 16, 2026 is a Monday.
const PST = -8 * 60;
const pst = (iso: string) => Date.parse(`${iso}-08:00`);
const MONDAY = pst("2026-11-16T00:00:00");

describe("weekStartFor", () => {
  it("finds local Monday midnight from any time in the week", () => {
    expect(weekStartFor(pst("2026-11-16T00:00:00"), PST)).toBe(MONDAY);
    expect(weekStartFor(pst("2026-11-18T13:45:00"), PST)).toBe(MONDAY);
    expect(weekStartFor(pst("2026-11-22T23:59:00"), PST)).toBe(MONDAY);
  });

  it("uses the group's local date, not UTC's", () => {
    // Sunday 5 PM in California is already Monday 1 AM in UTC.
    expect(weekStartFor(pst("2026-11-22T17:00:00"), PST)).toBe(MONDAY);
    // Monday 1 AM in Tokyo is still Sunday in UTC.
    const tokyoMonday = Date.parse("2026-11-16T00:00:00+09:00");
    expect(weekStartFor(Date.parse("2026-11-16T01:00:00+09:00"), 9 * 60)).toBe(tokyoMonday);
  });
});

describe("startingPoint", () => {
  it("starts with today's game while today's reveal is ahead", () => {
    expect(startingPoint(pst("2026-11-19T10:00:00"), PST)).toEqual({ weekStartsAt: MONDAY, day: 3 });
    expect(startingPoint(pst("2026-11-16T00:00:00"), PST)).toEqual({ weekStartsAt: MONDAY, day: 0 });
  });

  it("opens tomorrow's game early once today's reveal has passed", () => {
    expect(startingPoint(pst("2026-11-19T21:00:00"), PST)).toEqual({ weekStartsAt: MONDAY, day: 4 });
  });

  it("skips Sunday: Saturday night and Sunday start with next Monday's game", () => {
    expect(startingPoint(pst("2026-11-21T22:00:00"), PST)).toEqual({ weekStartsAt: MONDAY + WEEK, day: 0 });
    expect(startingPoint(pst("2026-11-22T09:00:00"), PST)).toEqual({ weekStartsAt: MONDAY + WEEK, day: 0 });
  });

  it("still plays Saturday's game on Saturday afternoon", () => {
    expect(startingPoint(pst("2026-11-21T15:00:00"), PST)).toEqual({ weekStartsAt: MONDAY, day: 5 });
  });
});

describe("nextTickAt", () => {
  it("reveals an open day at 9 PM", () => {
    expect(nextTickAt({ day: 2, phase: "open" }, MONDAY)).toBe(pst("2026-11-18T21:00:00"));
  });

  it("opens the next day at midnight after a reveal", () => {
    expect(nextTickAt({ day: 2, phase: "revealed" }, MONDAY)).toBe(pst("2026-11-19T00:00:00"));
    expect(nextTickAt({ day: 5, phase: "revealed" }, MONDAY)).toBe(pst("2026-11-22T00:00:00"));
  });

  it("runs the finale Sunday at 9 PM and a new week Monday at midnight", () => {
    expect(nextTickAt({ day: 6, phase: "open" }, MONDAY)).toBe(pst("2026-11-22T21:00:00"));
    expect(finaleAt(MONDAY)).toBe(pst("2026-11-22T21:00:00"));
    expect(nextTickAt({ day: 6, phase: "finale" }, MONDAY)).toBe(pst("2026-11-23T00:00:00"));
  });

  it("walks a whole week in order", () => {
    const states = [
      { day: 0, phase: "open" },
      { day: 0, phase: "revealed" },
      { day: 1, phase: "open" },
      { day: 5, phase: "revealed" },
      { day: 6, phase: "open" },
      { day: 6, phase: "finale" },
    ] as const;
    const times = states.map((s) => nextTickAt(s, MONDAY));
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(at(MONDAY, 7, 0)).toBe(times.at(-1));
  });
});
