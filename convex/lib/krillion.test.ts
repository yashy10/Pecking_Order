import { describe, expect, it } from "vitest";
import { KRILLION_PUZZLES, NOKRILLION_PUZZLES } from "../content/krillion";
import { normalize } from "./match";
import { currentRound, encodeAttempt, findAnswer, replay, ROUND_MAX, roundPoints } from "./krillion";

const ALL = [...KRILLION_PUZZLES, ...NOKRILLION_PUZZLES];

describe("content", () => {
  it("has 8 puzzles a game, three rounds each, unique keys", () => {
    expect(KRILLION_PUZZLES).toHaveLength(8);
    expect(NOKRILLION_PUZZLES).toHaveLength(8);
    const keys = ALL.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const p of ALL) expect(p.rounds).toHaveLength(3);
  });

  it("never shares a category, within or across the two games", () => {
    const prompts = ALL.flatMap((p) => p.rounds.map((r) => r.prompt));
    expect(new Set(prompts).size).toBe(prompts.length);
  });

  it("lists 8 to 50 answers per category, with no clashing aliases", () => {
    for (const p of ALL) {
      for (const c of p.rounds) {
        expect(c.answers.length, c.prompt).toBeGreaterThanOrEqual(8);
        expect(c.answers.length, c.prompt).toBeLessThanOrEqual(50);
        const seen = new Map<string, string>();
        for (const a of c.answers) {
          expect(a.names.length).toBeGreaterThan(0);
          for (const n of a.names) {
            const k = normalize(n).replace(/ /g, "");
            expect(k, `${c.prompt}: "${n}"`).not.toBe("");
            const owner = seen.get(k);
            expect(owner === undefined || owner === a.names[0], `${c.prompt}: "${n}" in ${owner} and ${a.names[0]}`).toBe(true);
            seen.set(k, a.names[0]);
          }
        }
      }
    }
  });

  it("resolves every name and alias to its own answer", () => {
    for (const p of ALL) {
      for (const c of p.rounds) {
        c.answers.forEach((a, i) => {
          for (const n of a.names) {
            expect(findAnswer(n, c), `${c.prompt}: "${n}"`).toBe(i);
          }
        });
      }
    }
  });
});

describe("findAnswer", () => {
  const europe = KRILLION_PUZZLES.flatMap((p) => p.rounds).find((c) => c.prompt.includes("country in Europe"))!;
  it("forgives a typo and ignores case and articles", () => {
    expect(europe.answers[findAnswer("the netherland", europe)].names[0]).toBe("Netherlands");
    expect(europe.answers[findAnswer("Swizterland", europe)].names[0]).toBe("Switzerland");
    expect(europe.answers[findAnswer("ENGLAND", europe)].names[0]).toBe("United Kingdom");
  });
  it("rejects what isn't listed", () => {
    expect(findAnswer("Brazil", europe)).toBe(-1);
    expect(findAnswer("   ", europe)).toBe(-1);
  });
});

describe("roundPoints", () => {
  it("Krillion: the most common scores 10, the rarest scores the max", () => {
    expect(roundPoints("rare", 0, 12, 34)).toBe(10);
    expect(roundPoints("rare", 11, 12, 34)).toBe(34);
    expect(roundPoints("rare", 5, 11, 33)).toBe(22);
  });
  it("Nokrillion is the mirror", () => {
    expect(roundPoints("common", 0, 12, 34)).toBe(34);
    expect(roundPoints("common", 11, 12, 34)).toBe(10);
  });
  it("a perfect day is 100", () => {
    expect(ROUND_MAX.reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe("replay", () => {
  const puzzle = KRILLION_PUZZLES[0];
  it("locks a round on a hit and moves on", () => {
    const r = replay(puzzle, "rare", [encodeAttempt(0, "Narnia"), encodeAttempt(0, "suriname")]);
    expect(r[0]).toMatchObject({ done: true, strikes: 1, hit: puzzle.rounds[0].answers.length - 1, points: 34 });
    expect(currentRound(r)).toBe(1);
  });
  it("ends a round with nothing after three strikes", () => {
    const r = replay(puzzle, "rare", ["0:a1", "0:b2", "0:c3"].map((s) => s));
    expect(r[0]).toMatchObject({ done: true, strikes: 3, hit: null, points: 0 });
    expect(currentRound(r)).toBe(1);
  });
});
