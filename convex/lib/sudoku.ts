// Owned by the sudoku track. Pure 6×6 sudoku rules: digits 1–6, boxes of 2 rows × 3 columns.
// Cells are indexed 0–35, left to right, top to bottom.

export const SUDOKU_SIZE = 6;
export const SUDOKU_CELLS = SUDOKU_SIZE * SUDOKU_SIZE;
const BOX_ROWS = 2;
const BOX_COLS = 3;

/** Every row, column and box, as lists of cell indexes. */
export const SUDOKU_UNITS: number[][] = (() => {
  const units: number[][] = [];
  for (let r = 0; r < SUDOKU_SIZE; r++) units.push(range(SUDOKU_SIZE).map((c) => r * SUDOKU_SIZE + c));
  for (let c = 0; c < SUDOKU_SIZE; c++) units.push(range(SUDOKU_SIZE).map((r) => r * SUDOKU_SIZE + c));
  for (let br = 0; br < SUDOKU_SIZE; br += BOX_ROWS) {
    for (let bc = 0; bc < SUDOKU_SIZE; bc += BOX_COLS) {
      const box: number[] = [];
      for (let r = br; r < br + BOX_ROWS; r++) for (let c = bc; c < bc + BOX_COLS; c++) box.push(r * SUDOKU_SIZE + c);
      units.push(box);
    }
  }
  return units;
})();

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= "1" && ch <= "6";
}

/** Cells whose digit appears twice in a row, column or box. Blanks never conflict. */
export function sudokuConflicts(grid: string): number[] {
  const bad = new Set<number>();
  for (const unit of SUDOKU_UNITS) {
    const seen = new Map<string, number[]>();
    for (const i of unit) {
      const ch = grid[i];
      if (!isDigit(ch)) continue;
      const list = seen.get(ch) ?? [];
      list.push(i);
      seen.set(ch, list);
    }
    for (const list of seen.values()) if (list.length > 1) for (const i of list) bad.add(i);
  }
  return [...bad].sort((a, b) => a - b);
}

/** A complete grid: 36 digits from 1 to 6. */
export function isCompleteGrid(grid: string): boolean {
  return grid.length === SUDOKU_CELLS && [...grid].every(isDigit);
}

/**
 * Checks a full grid. Solved means it keeps every given and breaks no rule (any valid grid
 * counts; the presets have one solution, so that is also the stored one). Otherwise the
 * wrong cells are the player's entries that differ from the stored solution.
 */
export function checkSudoku(
  grid: string,
  givens: string,
  solution: string,
): { solved: boolean; wrongCells: number[] } {
  const keepsGivens = [...givens].every((g, i) => g === "." || grid[i] === g);
  if (isCompleteGrid(grid) && keepsGivens && sudokuConflicts(grid).length === 0) {
    return { solved: true, wrongCells: [] };
  }
  const wrongCells: number[] = [];
  for (let i = 0; i < SUDOKU_CELLS; i++) {
    if (givens[i] !== ".") continue;
    if (isDigit(grid[i]) && grid[i] !== solution[i]) wrongCells.push(i);
  }
  return { solved: false, wrongCells };
}

/** How many solutions a puzzle has, stopping once `limit` are found. */
export function countSudokuSolutions(givens: string, limit = 2): number {
  const cells = [...givens].map((ch) => (isDigit(ch) ? Number(ch) : 0));
  const peers = range(SUDOKU_CELLS).map((i) => {
    const set = new Set<number>();
    for (const unit of SUDOKU_UNITS) if (unit.includes(i)) for (const j of unit) if (j !== i) set.add(j);
    return [...set];
  });
  let found = 0;
  const solve = (): void => {
    const i = cells.indexOf(0);
    if (i === -1) {
      found++;
      return;
    }
    for (let d = 1; d <= SUDOKU_SIZE && found < limit; d++) {
      if (peers[i].some((j) => cells[j] === d)) continue;
      cells[i] = d;
      solve();
      cells[i] = 0;
    }
  };
  solve();
  return found;
}

/** "1:12" */
export function clockLabel(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
