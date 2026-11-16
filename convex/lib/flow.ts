import type { FlowPuzzle } from "../content/flow";

// Owned by the flow track. Pure helpers for Flow: reading a preset and checking a solution.
// Cells are numbered row by row: cell = row * size + column.

/** Full marks up to par, by board size. */
export const FLOW_PAR_MS: Record<number, number> = { 5: 20_000, 6: 35_000, 7: 50_000 };
export const FLOW_MAX_COLORS = 8;

export type FlowDot = { color: number; ends: number[] };

/** The dots of a preset, colour 0 for "A", 1 for "B" and so on. Each colour has two ends. */
export function flowDots(puzzle: FlowPuzzle): FlowDot[] {
  const ends = new Map<number, number[]>();
  puzzle.rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === ".") continue;
      const color = ch.charCodeAt(0) - 65;
      const list = ends.get(color) ?? [];
      list.push(r * puzzle.size + c);
      ends.set(color, list);
    }
  });
  return [...ends.entries()].sort((a, b) => a[0] - b[0]).map(([color, cells]) => ({ color, ends: cells }));
}

/** Why a preset is malformed, or null when it is fine. Used by the tests. */
export function puzzleProblem(puzzle: FlowPuzzle): string | null {
  const n = puzzle.size;
  if (n < 5 || n > 7) return "size must be 5 to 7";
  if (puzzle.rows.length !== n) return "wrong number of rows";
  for (const row of puzzle.rows) {
    if (row.length !== n) return "wrong row length";
    if (!/^[A-H.]+$/.test(row)) return "rows may hold only A–H and .";
  }
  const dots = flowDots(puzzle);
  if (dots.length < 4 || dots.length > FLOW_MAX_COLORS) return "needs 4 to 8 colours";
  for (let i = 0; i < dots.length; i++) {
    if (dots[i].color !== i) return "colours must be consecutive letters from A";
    if (dots[i].ends.length !== 2) return `colour ${String.fromCharCode(65 + i)} needs exactly two dots`;
  }
  return null;
}

function adjacent(size: number, a: number, b: number): boolean {
  const ra = Math.floor(a / size);
  const rb = Math.floor(b / size);
  return (ra === rb && Math.abs(a - b) === 1) || (a % size === b % size && Math.abs(ra - rb) === 1);
}

/**
 * Checks a full board. `paths[i]` is colour i's pipe, cell by cell, from one of its dots
 * to the other (either way round). Returns null when solved, otherwise a short reason.
 */
export function solutionProblem(size: number, dots: FlowDot[], paths: number[][]): string | null {
  const total = size * size;
  if (paths.length !== dots.length) return "Connect every pair of dots.";
  const owner = new Map<number, number>(); // dot cell -> colour
  for (const d of dots) for (const e of d.ends) owner.set(e, d.color);
  const used = new Set<number>();
  for (let i = 0; i < dots.length; i++) {
    const path = paths[i];
    const [a, b] = dots[i].ends;
    if (path.length < 2) return "Connect every pair of dots.";
    const first = path[0];
    const last = path[path.length - 1];
    if (!((first === a && last === b) || (first === b && last === a))) return "Connect every pair of dots.";
    for (let k = 0; k < path.length; k++) {
      const cell = path[k];
      if (!Number.isInteger(cell) || cell < 0 || cell >= total) return "That pipe runs off the board.";
      if (used.has(cell)) return "Pipes can't cross or overlap.";
      const dotColor = owner.get(cell);
      if (dotColor !== undefined && dotColor !== i) return "A pipe can't pass through another colour's dot.";
      if (k > 0 && !adjacent(size, path[k - 1], cell)) return "Pipes must run between neighbouring squares.";
      used.add(cell);
    }
  }
  if (used.size !== total) return "Fill every square.";
  return null;
}
