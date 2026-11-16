import { describe, expect, it } from "vitest";
import { WORDLE_GUESSES, WORDLE_PUZZLES } from "../content/wordle";
import { isAllowedGuess, markGuess, WORDLE_POINTS } from "./wordle";

describe("markGuess", () => {
  it("marks hits, nears and misses", () => {
    expect(markGuess("crane", "react")).toEqual(["near", "near", "hit", "miss", "near"]);
    expect(markGuess("react", "react")).toEqual(["hit", "hit", "hit", "hit", "hit"]);
  });

  it("doesn't over-mark a repeated letter the answer has once", () => {
    // abide has one e and one d: speed's first e is near, the second is a miss, d is near.
    expect(markGuess("speed", "abide")).toEqual(["miss", "miss", "near", "miss", "near"]);
    // A hit uses up the copy before any near does.
    expect(markGuess("eerie", "rebus")).toEqual(["miss", "hit", "near", "miss", "miss"]);
  });

  it("marks only as many copies as the answer has", () => {
    expect(markGuess("lolly", "hello")).toEqual(["miss", "near", "hit", "hit", "miss"]);
    expect(markGuess("hello", "lolly")).toEqual(["miss", "miss", "hit", "hit", "near"]);
  });
});

describe("word list", () => {
  it("has unique, opaque keys and fair five-letter answers", () => {
    const keys = WORDLE_PUZZLES.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(WORDLE_PUZZLES.length).toBeGreaterThanOrEqual(60);
    for (const p of WORDLE_PUZZLES) {
      expect(p.word).toMatch(/^[a-z]{5}$/);
      expect(p.key).not.toContain(p.word);
      expect(isAllowedGuess(p.word)).toBe(true);
    }
  });

  it("accepts common guesses and plurals, and rejects junk", () => {
    for (const w of ["about", "crane", "slate", "adieu", "words", "games", "liked"]) {
      expect(isAllowedGuess(w), w).toBe(true);
    }
    for (const w of ["xqzzv", "abcde", "CRANE", "cran", "cranes"]) {
      expect(isAllowedGuess(w), w).toBe(false);
    }
  });

  it("is lowercase five-letter words only", () => {
    expect(WORDLE_GUESSES.split(" ").every((w) => /^[a-z]{5}$/.test(w))).toBe(true);
  });

  it("scores fewer guesses higher", () => {
    expect(WORDLE_POINTS).toEqual([100, 90, 80, 65, 50, 35]);
  });
});
