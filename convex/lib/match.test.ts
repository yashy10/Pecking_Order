import { describe, expect, it } from "vitest";
import { matchAnswer, normalize } from "./match";

// Track B: extend with the fuzzy cases in docs/PLAN.md §8 (Track B).

describe("normalize", () => {
  it("lowercases, strips punctuation and a leading article", () => {
    expect(normalize("  The Coffee-Mug! ")).toBe("coffee mug");
  });
});

describe("matchAnswer", () => {
  const answers = ["coffee mug", "mug", "cup"];

  it("accepts an exact answer in any case", () => {
    expect(matchAnswer("MUG", answers)).toBe(true);
  });

  it("accepts an article, a plural and missing spaces", () => {
    expect(matchAnswer("a mug", answers)).toBe(true);
    expect(matchAnswer("cups", answers)).toBe(true);
    expect(matchAnswer("coffeemug", answers)).toBe(true);
  });

  it("rejects wrong and empty guesses", () => {
    expect(matchAnswer("banana", answers)).toBe(false);
    expect(matchAnswer("   ", answers)).toBe(false);
  });
});
