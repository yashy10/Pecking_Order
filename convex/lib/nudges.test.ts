import { describe, expect, it } from "vitest";
import { nudgeMessage, pick, type NudgeKind } from "./nudges";

const group = "The Roost";

describe("nudgeMessage", () => {
  it("titles every push with the group, so people in several know which", () => {
    const kinds: NudgeKind[] = ["nudge", "lastCall", "sundayTease", "reveal", "finale"];
    for (const kind of kinds) {
      const m = nudgeMessage(kind, { group, game: "blur" }, "seed");
      expect(m.title).toBe(group);
      expect(m.body.length).toBeGreaterThan(10);
    }
  });

  it("names the game", () => {
    expect(nudgeMessage("lastCall", { group, game: "whoSaidIt" }, "a").body + nudgeMessage("lastCall", { group, game: "whoSaidIt" }, "b").body).toMatch(/Who Said It|sealed|flock|reveal/);
    expect(nudgeMessage("nudge", { group, game: "blur", wildcard: true }, "x").body).toContain("Wildcard Wednesday");
  });

  it("makes the reveal personal when someone crossed you", () => {
    expect(nudgeMessage("reveal", { group, passedBy: "Priya" }, "s").body).toContain("Priya just passed you");
    expect(nudgeMessage("reveal", { group, passed: "Sam" }, "s").body).toContain("You passed Sam");
    // Being passed beats passing someone: it's the stronger reason to come back.
    expect(nudgeMessage("reveal", { group, passedBy: "Priya", passed: "Sam" }, "s").body).toContain("Priya");
  });

  it("crowns the winner and teases everyone else", () => {
    expect(nudgeMessage("finale", { group, youWon: true }, "s").body).toContain("You rule the roost");
    expect(nudgeMessage("finale", { group, youWon: false }, "s").body).toContain("The pecking order is out");
  });

  it("never puts a number of points on a lock screen", () => {
    for (const kind of ["nudge", "lastCall", "reveal", "finale"] as NudgeKind[]) {
      expect(nudgeMessage(kind, { group, game: "blur" }, "q").body).not.toMatch(/\d+ points/);
    }
  });
});

describe("pick", () => {
  it("is stable for a seed and varies across seeds", () => {
    const options = ["a", "b", "c", "d"];
    expect(pick(options, "member1:1:2:nudge")).toBe(pick(options, "member1:1:2:nudge"));
    const seen = new Set(Array.from({ length: 40 }, (_, i) => pick(options, `m${i}`)));
    expect(seen.size).toBeGreaterThan(1);
  });
});
