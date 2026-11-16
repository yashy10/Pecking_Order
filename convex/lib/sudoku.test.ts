import { describe, expect, it } from "vitest";
import { SUDOKU_PUZZLES } from "../content/sudoku";
import { checkSudoku, clockLabel, countSudokuSolutions, isCompleteGrid, sudokuConflicts } from "./sudoku";

describe("SUDOKU_PUZZLES", () => {
  it("has unique keys", () => {
    const keys = SUDOKU_PUZZLES.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBeGreaterThanOrEqual(8);
  });

  for (const p of SUDOKU_PUZZLES) {
    describe(p.key, () => {
      it("has 12 to 16 givens that agree with the solution", () => {
        expect(p.givens).toMatch(/^[1-6.]{36}$/);
        const givens = [...p.givens].filter((ch) => ch !== ".").length;
        expect(givens).toBeGreaterThanOrEqual(12);
        expect(givens).toBeLessThanOrEqual(16);
        [...p.givens].forEach((ch, i) => {
          if (ch !== ".") expect(p.solution[i]).toBe(ch);
        });
      });

      it("has a valid solution", () => {
        expect(isCompleteGrid(p.solution)).toBe(true);
        expect(sudokuConflicts(p.solution)).toEqual([]);
      });

      it("has exactly one solution", () => {
        expect(countSudokuSolutions(p.givens)).toBe(1);
      });
    });
  }
});

describe("sudokuConflicts", () => {
  it("flags a digit repeated in a row, column or box, and ignores blanks", () => {
    const grid = "11" + ".".repeat(34);
    expect(sudokuConflicts(grid)).toEqual([0, 1]);
    const col = "1" + ".".repeat(5) + "1" + ".".repeat(29);
    expect(sudokuConflicts(col)).toEqual([0, 6]);
    const box = "1" + ".".repeat(7) + "1" + ".".repeat(27); // cells 0 and 8 share the top-left box
    expect(sudokuConflicts(box)).toEqual([0, 8]);
    expect(sudokuConflicts(".".repeat(36))).toEqual([]);
  });
});

describe("checkSudoku", () => {
  const p = SUDOKU_PUZZLES[0];

  it("accepts the solution", () => {
    expect(checkSudoku(p.solution, p.givens, p.solution)).toEqual({ solved: true, wrongCells: [] });
  });

  it("flags the player's wrong cells, never the givens", () => {
    const blank = p.givens.indexOf(".");
    const other = p.givens.indexOf(".", blank + 1);
    const grid = [...p.solution];
    [grid[blank], grid[other]] = [grid[other], grid[blank]];
    const swapped = grid.join("");
    const result = checkSudoku(swapped, p.givens, p.solution);
    if (swapped === p.solution) return; // the two cells happened to hold the same digit
    expect(result.solved).toBe(false);
    expect(result.wrongCells).toEqual([blank, other]);
  });

  it("rejects a grid that changes a given", () => {
    const given = [...p.givens].findIndex((ch) => ch !== ".");
    const grid = [...p.solution];
    grid[given] = grid[given] === "1" ? "2" : "1";
    expect(checkSudoku(grid.join(""), p.givens, p.solution).solved).toBe(false);
  });
});

describe("clockLabel", () => {
  it("formats minutes and seconds", () => {
    expect(clockLabel(72_400)).toBe("1:12");
    expect(clockLabel(5_000)).toBe("0:05");
  });
});
