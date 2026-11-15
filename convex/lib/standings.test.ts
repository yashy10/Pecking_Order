import { describe, expect, it } from "vitest";
import { neighbours, type StandingRow } from "./standings";

// Track D: replace and extend with every case in docs/PLAN.md §8 (Track D).

const row = (memberId: string, weekPoints: number, joinedAt: number): StandingRow => ({
  memberId,
  name: memberId,
  emoji: "🐔",
  hasPass: false,
  weekPoints,
  prevWeekPoints: weekPoints,
  joinedAt,
});

describe("neighbours", () => {
  it("shows fog both ways when you are the only member", () => {
    const result = neighbours([row("me", 10, 1)], "me", { ghosted: new Set(), spyActive: false });
    expect(result.above).toEqual([{ kind: "fog" }]);
    expect(result.below).toEqual([{ kind: "fog" }]);
  });
});
