import { describe, expect, it } from "vitest";
import { neighbours, type Slot, type StandingRow } from "./standings";

// Track D. The cases in docs/PLAN.md §8 (Track D) and the rules in §6.1.

let joined = 0;
const row = (memberId: string, weekPoints: number, prevWeekPoints = weekPoints): StandingRow => ({
  memberId,
  name: memberId,
  emoji: "🐔",
  hasPass: false,
  weekPoints,
  prevWeekPoints,
  joinedAt: ++joined,
});

const none = { ghosted: new Set<string>(), spyActive: false };
const ids = (slots: Slot[]) => slots.map((s) => (s.kind === "fog" ? "fog" : s.memberId));
const gaps = (slots: Slot[]) => slots.map((s) => (s.kind === "fog" ? null : s.gap));

// priya 90 > sam 70 > me 50 > leo 30 > ava 10
const board = () => [row("sam", 70), row("me", 50), row("ava", 10), row("priya", 90), row("leo", 30)];

describe("neighbours", () => {
  it("shows the one rival above and the one below, with gaps", () => {
    const r = neighbours(board(), "me", none);
    expect(ids(r.above)).toEqual(["sam"]);
    expect(ids(r.below)).toEqual(["leo"]);
    expect(gaps(r.above)).toEqual([20]);
    expect(gaps(r.below)).toEqual([20]);
  });

  it("gives first place fog above, so the leader can't be sure", () => {
    const r = neighbours(board(), "priya", none);
    expect(ids(r.above)).toEqual(["fog"]);
    expect(ids(r.below)).toEqual(["sam"]);
  });

  it("gives last place fog below", () => {
    const r = neighbours(board(), "ava", none);
    expect(ids(r.above)).toEqual(["leo"]);
    expect(ids(r.below)).toEqual(["fog"]);
  });

  it("skips a ghost: the next rival up shows, with the gap to them", () => {
    const r = neighbours(board(), "me", { ghosted: new Set(["sam"]), spyActive: false });
    expect(ids(r.above)).toEqual(["priya"]);
    expect(gaps(r.above)).toEqual([40]);
  });

  it("shows fog when everyone above is a ghost", () => {
    const r = neighbours(board(), "me", { ghosted: new Set(["sam", "priya"]), spyActive: false });
    expect(ids(r.above)).toEqual(["fog"]);
  });

  it("skips a ghost below too", () => {
    const r = neighbours(board(), "me", { ghosted: new Set(["leo"]), spyActive: false });
    expect(ids(r.below)).toEqual(["ava"]);
  });

  it("leaves a ghost's own board unchanged", () => {
    const r = neighbours(board(), "me", { ghosted: new Set(["me"]), spyActive: false });
    expect(ids(r.above)).toEqual(["sam"]);
    expect(ids(r.below)).toEqual(["leo"]);
  });

  it("Spy shows three above, nearest first, padded with fog", () => {
    const r = neighbours(board(), "leo", { ghosted: new Set(), spyActive: true });
    expect(ids(r.above)).toEqual(["me", "sam", "priya"]);
    const near = neighbours(board(), "sam", { ghosted: new Set(), spyActive: true });
    expect(ids(near.above)).toEqual(["priya", "fog", "fog"]);
  });

  it("keeps ghosts hidden from Spy", () => {
    const r = neighbours(board(), "leo", { ghosted: new Set(["sam"]), spyActive: true });
    expect(ids(r.above)).toEqual(["me", "priya", "fog"]);
  });

  it("breaks ties by who joined first and reports a zero gap", () => {
    const rows = [row("first", 40), row("me", 40), row("later", 40)];
    const r = neighbours(rows, "me", none);
    expect(ids(r.above)).toEqual(["first"]);
    expect(ids(r.below)).toEqual(["later"]);
    expect(gaps(r.above)).toEqual([0]);
  });

  it("tags a rival who crossed you at the last reveal", () => {
    // Before the reveal: leo 52 > me 50 > sam 45. After: sam 80 > me 60 > leo 30.
    const rows = [row("me", 60, 50), row("sam", 80, 45), row("leo", 30, 52)];
    const r = neighbours(rows, "me", none);
    expect(r.above).toEqual([expect.objectContaining({ memberId: "sam", moved: "passedYou" })]);
    expect(r.below).toEqual([expect.objectContaining({ memberId: "leo", moved: "youPassed" })]);
  });

  it("does not tag a rival who kept their place", () => {
    const r = neighbours(board(), "me", none);
    expect(r.above).toEqual([expect.objectContaining({ moved: null })]);
  });

  it("shows fog both ways when you are the only member", () => {
    const r = neighbours([row("me", 10)], "me", none);
    expect(r.above).toEqual([{ kind: "fog" }]);
    expect(r.below).toEqual([{ kind: "fog" }]);
  });

  it("never returns a rank, a count or anyone beyond the slots", () => {
    const many = Array.from({ length: 20 }, (_, i) => row(`m${i}`, i * 5));
    const r = neighbours(many, "m10", none);
    const json = JSON.stringify(r);
    expect(r.above.length + r.below.length).toBe(2);
    expect(json).not.toMatch(/rank|place|position|count/i);
  });
});
