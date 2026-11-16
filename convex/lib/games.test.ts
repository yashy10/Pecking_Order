import { describe, expect, it } from "vitest";
import {
  isFriendGame,
  maxPointsFor,
  MINI_ROTATION,
  miniGameFor,
  puzzleIndex,
  questionShapeFor,
  timedPuzzlePoints,
} from "./games";

describe("schedule", () => {
  it("week 1 plays six different mini games, and no Blur", () => {
    const week1 = [0, 1, 2, 3, 4, 5].map((d) => miniGameFor(1, d));
    expect(new Set(week1).size).toBe(6);
    expect(week1).not.toContain("blur");
  });

  it("later weeks never repeat a mini game within the week, and Blur comes back", () => {
    const seen = new Set<string>();
    for (let week = 2; week <= 8; week++) {
      const days = [0, 1, 2, 3, 4, 5].map((d) => miniGameFor(week, d));
      expect(new Set(days).size).toBe(6);
      days.forEach((g) => seen.add(g));
    }
    expect([...seen].sort()).toEqual([...MINI_ROTATION].sort());
  });

  it("the daily question rotates through every friends game", () => {
    const feeds = new Set([0, 1, 2, 3].map((d) => questionShapeFor(2, d).feeds));
    expect(feeds.size).toBe(4);
  });

  it("puzzles don't repeat until the pool runs out", () => {
    expect([1, 2, 3].map((w) => puzzleIndex(3, w))).toEqual([0, 1, 2]);
    expect(puzzleIndex(3, 4)).toBe(0);
    expect(puzzleIndex(0, 4)).toBe(0);
  });
});

describe("points", () => {
  it("friends games are worth twice a mini game", () => {
    expect(isFriendGame("mostLikely")).toBe(true);
    expect(isFriendGame("wordle")).toBe(false);
    expect(maxPointsFor("matchUp")).toBe(2 * maxPointsFor("flow"));
  });

  it("timed puzzles: full marks to par, then down to a floor of 30", () => {
    expect(timedPuzzlePoints(10_000, 20_000)).toBe(100);
    expect(timedPuzzlePoints(40_000, 20_000)).toBe(90);
    expect(timedPuzzlePoints(20_000, 20_000, 2, 5)).toBe(90);
    expect(timedPuzzlePoints(10_000_000, 20_000)).toBe(30);
  });
});
