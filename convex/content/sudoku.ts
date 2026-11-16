// Owned by the sudoku track. Preset puzzles; the solutions never leave the server.
// Each entry needs a unique, opaque `key` (stored on the game as puzzleKey).
//
// 6×6, digits 1–6, boxes of 2 rows × 3 columns. Cells read left to right, top to bottom;
// "." is a blank. Every puzzle has exactly one solution (checked in convex/lib/sudoku.test.ts)
// and needs no guessing: the first few fall to "only one digit fits here", the later ones
// also need "this digit only fits in one spot in this row/column/box". Easiest first,
// because week 1 plays index 0.

export type SudokuPuzzle = { key: string; givens: string; solution: string };

export const SUDOKU_PUZZLES: SudokuPuzzle[] = [
  { key: "sdk-01", givens: ".53..461..35...4...3..26.2.5..54...2", solution: "253614614235162453435126326541541362" }, // 16 givens
  { key: "sdk-02", givens: ".6.214.......26.3......14..563.3..42", solution: "563214241356126435354621412563635142" }, // 15
  { key: "sdk-03", givens: ".4....6..42541.6.2.5.3.4.......6...3", solution: "542136631425413652256314324561165243" }, // 14
  { key: "sdk-04", givens: "42.5..5..423.5...22.......5.4.6..3..", solution: "423561561423154632236154315246642315" }, // 14
  { key: "sdk-05", givens: "..36...26.5.3.4...2.....1..2.36...4.", solution: "513624426351364512251436145263632145" }, // 13
  { key: "sdk-06", givens: ".435.2.5.4..21...4.6....4....5...1..", solution: "643512152436215364364251431625526143" }, // 13
  { key: "sdk-07", givens: ".2..5....632.1.5..4...2.....6.24....", solution: "623451154632312546465123531264246315" }, // 12
  { key: "sdk-08", givens: "....12.2.....546....25......565...4.", solution: "635412421365354621162534243156516243" }, // 12
  { key: "sdk-09", givens: ".5.6...63........2.24.65..5......524", solution: "152643463251516432324165245316631524" }, // 13
  { key: "sdk-10", givens: ".6.2....2.4..15.......5..4.52.2..1..", solution: "564213132645415362623451341526256134" }, // 12
];
