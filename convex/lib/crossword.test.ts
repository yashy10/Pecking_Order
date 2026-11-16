import { describe, expect, it } from "vitest";
import { CROSSWORD_PUZZLES } from "../content/crossword";
import { blankRows, checkCrossword, crosswordLayout, fitsGrid, solutionString } from "./crossword";

describe("CROSSWORD_PUZZLES", () => {
  it("has unique keys", () => {
    const keys = CROSSWORD_PUZZLES.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBeGreaterThanOrEqual(8);
  });

  for (const p of CROSSWORD_PUZZLES) {
    describe(p.key, () => {
      const layout = crosswordLayout(p.rows);
      const word = (cells: number[]) => cells.map((i) => solutionString(p.rows)[i]).join("");

      it("is a 5×5 grid of capital letters and symmetric black squares", () => {
        expect(p.rows).toHaveLength(5);
        for (const row of p.rows) expect(row).toMatch(/^[A-Z#]{5}$/);
        const flat = p.rows.join("");
        for (let i = 0; i < 25; i++) expect(flat[i] === "#").toBe(flat[24 - i] === "#");
      });

      it("has only entries of 3+ letters, and no word twice", () => {
        // Every open square belongs to an across and a down entry, so no 1–2 letter runs hide.
        const flat = p.rows.join("");
        const inAcross = new Set(layout.across.flatMap((s) => s.cells));
        const inDown = new Set(layout.down.flatMap((s) => s.cells));
        for (let i = 0; i < 25; i++) {
          if (flat[i] === "#") continue;
          expect(inAcross.has(i)).toBe(true);
          expect(inDown.has(i)).toBe(true);
        }
        const words = [...layout.across, ...layout.down].map((s) => word(s.cells));
        for (const w of words) expect(w.length).toBeGreaterThanOrEqual(3);
        expect(new Set(words).size).toBe(words.length);
      });

      it("has a clue for every entry and none extra", () => {
        expect(p.across.map((c) => c.num)).toEqual(layout.across.map((s) => s.num));
        expect(p.down.map((c) => c.num)).toEqual(layout.down.map((s) => s.num));
        for (const c of [...p.across, ...p.down]) expect(c.clue.trim().length).toBeGreaterThan(0);
      });

      it("accepts its own solution", () => {
        expect(checkCrossword(p.rows, solutionString(p.rows).toLowerCase())).toEqual({ solved: true, wrongCells: [] });
      });
    });
  }
});

describe("crosswordLayout", () => {
  it("numbers the grid the usual way", () => {
    const layout = crosswordLayout(["##CAB", "#CLUE", "ALONE", "WANT#", "EWE##"]);
    expect(layout.across.map((s) => s.num)).toEqual([1, 4, 5, 6, 7]);
    expect(layout.down.map((s) => s.num)).toEqual([1, 2, 3, 4, 5]);
    expect(layout.numbers.slice(0, 5)).toEqual([0, 0, 1, 2, 3]);
    expect(layout.across[0].cells).toEqual([2, 3, 4]);
    expect(layout.down[0].cells).toEqual([2, 7, 12, 17, 22]);
  });
});

describe("checkCrossword", () => {
  const rows = ["##CAB", "#CLUE", "ALONE", "WANT#", "EWE##"];

  it("flags wrong letters but not blanks", () => {
    const letters = [..."##CAB#CLUEALONEWANT#EWE##"];
    letters[2] = "X"; // wrong
    letters[3] = " "; // blank
    const result = checkCrossword(rows, letters.join(""));
    expect(result).toEqual({ solved: false, wrongCells: [2] });
  });

  it("is not solved while a square is blank", () => {
    const letters = "##CAB#CLUEALONEWANT#EW ##";
    expect(checkCrossword(rows, letters)).toEqual({ solved: false, wrongCells: [] });
  });
});

describe("fitsGrid and blankRows", () => {
  const rows = ["##CAB", "#CLUE", "ALONE", "WANT#", "EWE##"];
  it("needs 25 characters with black squares in place", () => {
    expect(fitsGrid(rows, "##   #    " + " ".repeat(9) + "#   ##")).toBe(true);
    expect(fitsGrid(rows, " ".repeat(25))).toBe(false);
    expect(fitsGrid(rows, "##CAB")).toBe(false);
    expect(fitsGrid(rows, "##CA1#CLUEALONEWANT#EWE##")).toBe(false);
  });
  it("hides the letters", () => {
    expect(blankRows(rows)).toEqual(["##...", "#....", ".....", "....#", "...##"]);
  });
});
