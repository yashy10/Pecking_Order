import { describe, expect, it } from "vitest";
import { allowedEdits, editDistance, matchAnswer, normalize } from "./match";

describe("normalize", () => {
  it("lowercases, strips punctuation and a leading article", () => {
    expect(normalize("  The Coffee-Mug! ")).toBe("coffee mug");
  });
});

describe("editDistance", () => {
  it("counts insertions, deletions and substitutions", () => {
    expect(editDistance("toothbrush", "toothbrsh")).toBe(1);
    expect(editDistance("kitten", "sitting")).toBe(3);
    expect(editDistance("same", "same")).toBe(0);
  });

  it("stops early past the budget", () => {
    expect(editDistance("banana", "headphones", 2)).toBe(3);
  });
});

describe("allowedEdits", () => {
  it("forgives nothing under five letters, one from five, two from nine", () => {
    expect([allowedEdits(4), allowedEdits(5), allowedEdits(8), allowedEdits(9)]).toEqual([0, 1, 1, 2]);
  });
});

describe("matchAnswer", () => {
  const mug = ["coffee mug", "mug", "cup"];

  it("accepts an exact answer in any case", () => {
    expect(matchAnswer("MUG", mug)).toBe(true);
  });

  it("accepts an article, a plural and missing spaces", () => {
    expect(matchAnswer("a mug", mug)).toBe(true);
    expect(matchAnswer("cups", mug)).toBe(true);
    expect(matchAnswer("coffeemug", mug)).toBe(true);
  });

  it("forgives small typos on longer words (PLAN §8 examples)", () => {
    expect(matchAnswer("tooth brush", ["toothbrush"])).toBe(true);
    expect(matchAnswer("toothbrsh", ["toothbrush"])).toBe(true);
    expect(matchAnswer("headphnes", ["headphones"])).toBe(true);
    expect(matchAnswer("banan", ["banana"])).toBe(true);
    expect(matchAnwserTwoTypos()).toBe(true);
  });

  it("does not forgive typos on short words", () => {
    expect(matchAnswer("rug", mug)).toBe(false);
    expect(matchAnswer("kay", ["key"])).toBe(false);
  });

  it("rejects wrong and empty guesses", () => {
    expect(matchAnswer("banana", mug)).toBe(false);
    expect(matchAnswer("   ", mug)).toBe(false);
    expect(matchAnswer("pizza", ["cactus"])).toBe(false);
  });
});

function matchAnwserTwoTypos(): boolean {
  return matchAnswer("hedphnes", ["headphones"]); // two edits, ten letters
}
