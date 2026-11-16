// Owned by the crossword track. Pure 5×5 crossword layout and checking. Cells are indexed
// 0–24, left to right, top to bottom; "#" is a black square.

export const CROSSWORD_SIZE = 5;
export const CROSSWORD_CELLS = CROSSWORD_SIZE * CROSSWORD_SIZE;

export type Slot = { num: number; cells: number[] };
export type CrosswordLayout = {
  /** Clue number per cell, 0 where there is none. */
  numbers: number[];
  across: Slot[];
  down: Slot[];
};

/** Numbers the grid the usual way: a square gets a number when an entry starts there. */
export function crosswordLayout(rows: string[]): CrosswordLayout {
  const n = CROSSWORD_SIZE;
  const open = (r: number, c: number) => r >= 0 && r < n && c >= 0 && c < n && rows[r][c] !== "#";
  const numbers = new Array<number>(CROSSWORD_CELLS).fill(0);
  const across: Slot[] = [];
  const down: Slot[] = [];
  let next = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!open(r, c)) continue;
      const startsAcross = !open(r, c - 1) && open(r, c + 1);
      const startsDown = !open(r - 1, c) && open(r + 1, c);
      if (!startsAcross && !startsDown) continue;
      next++;
      numbers[r * n + c] = next;
      if (startsAcross) {
        const cells: number[] = [];
        for (let k = c; open(r, k); k++) cells.push(r * n + k);
        across.push({ num: next, cells });
      }
      if (startsDown) {
        const cells: number[] = [];
        for (let k = r; open(k, c); k++) cells.push(k * n + c);
        down.push({ num: next, cells });
      }
    }
  }
  return { numbers, across, down };
}

/** The grid's shape without its letters: "." open, "#" black. */
export function blankRows(rows: string[]): string[] {
  return rows.map((row) => row.replace(/[^#]/g, "."));
}

/** The solution as one 25-character string. */
export function solutionString(rows: string[]): string {
  return rows.join("").toUpperCase();
}

/** Whether `letters` fits the grid: 25 characters, "#" exactly on the black squares. */
export function fitsGrid(rows: string[], letters: string): boolean {
  const solution = solutionString(rows);
  if (letters.length !== CROSSWORD_CELLS) return false;
  for (let i = 0; i < CROSSWORD_CELLS; i++) {
    const black = solution[i] === "#";
    if (black !== (letters[i] === "#")) return false;
    if (!black && !/^[A-Za-z ]$/.test(letters[i])) return false;
  }
  return true;
}

/**
 * Checks the player's letters (" " for a blank). Solved when every open square is right.
 * Wrong cells are filled squares with the wrong letter; blanks are unfinished, not wrong.
 */
export function checkCrossword(rows: string[], letters: string): { solved: boolean; wrongCells: number[] } {
  const solution = solutionString(rows);
  const guess = letters.toUpperCase();
  const wrongCells: number[] = [];
  let solved = true;
  for (let i = 0; i < CROSSWORD_CELLS; i++) {
    if (solution[i] === "#") continue;
    if (guess[i] === solution[i]) continue;
    solved = false;
    if (guess[i] !== " " && guess[i] !== undefined) wrongCells.push(i);
  }
  return { solved, wrongCells };
}
