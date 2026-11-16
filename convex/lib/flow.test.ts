import { describe, expect, it } from "vitest";
import { FLOW_PUZZLES } from "../content/flow";
import { FLOW_PAR_MS, flowDots, puzzleProblem, solutionProblem } from "./flow";

// A made-up board, not one of the presets: five straight rows.
const ROWS = { key: "test", size: 5, rows: ["A...A", "B...B", "C...C", "D...D", "E...E"] };
const DOTS = flowDots(ROWS);
const row = (r: number) => [0, 1, 2, 3, 4].map((c) => r * 5 + c);
const SOLVED = [row(0), row(1), row(2), row(3), row(4)];

describe("flowDots", () => {
  it("reads two ends per colour, in letter order", () => {
    expect(DOTS).toEqual([
      { color: 0, ends: [0, 4] },
      { color: 1, ends: [5, 9] },
      { color: 2, ends: [10, 14] },
      { color: 3, ends: [15, 19] },
      { color: 4, ends: [20, 24] },
    ]);
  });
});

describe("solutionProblem", () => {
  it("accepts a full, valid board", () => {
    expect(solutionProblem(5, DOTS, SOLVED)).toBeNull();
  });

  it("accepts pipes drawn from either end", () => {
    expect(solutionProblem(5, DOTS, SOLVED.map((p, i) => (i % 2 ? [...p].reverse() : p)))).toBeNull();
  });

  it("rejects a missing colour", () => {
    expect(solutionProblem(5, DOTS, SOLVED.slice(0, 4))).toBe("Connect every pair of dots.");
  });

  it("rejects a pipe that stops short of its dot", () => {
    const paths = [[0, 1, 2, 3], ...SOLVED.slice(1)];
    expect(solutionProblem(5, DOTS, paths)).toBe("Connect every pair of dots.");
  });

  it("rejects a gap", () => {
    const paths = [[0, 1, 3, 4], ...SOLVED.slice(1)];
    expect(solutionProblem(5, DOTS, paths)).toBe("Pipes must run between neighbouring squares.");
  });

  it("rejects a diagonal step", () => {
    const paths = [[0, 6, 2, 3, 4], ...SOLVED.slice(1)];
    expect(solutionProblem(5, DOTS, paths)).toBe("Pipes must run between neighbouring squares.");
  });

  it("rejects a wrap from the end of one row to the start of the next", () => {
    const dots = [{ color: 0, ends: [4, 6] }];
    expect(solutionProblem(5, dots, [[4, 5, 6]])).toBe("Pipes must run between neighbouring squares.");
  });

  it("rejects crossing pipes", () => {
    const paths = [SOLVED[0], [5, 6, 1, 2, 7, 8, 9], ...SOLVED.slice(2)];
    expect(solutionProblem(5, DOTS, paths)).toBe("Pipes can't cross or overlap.");
  });

  it("rejects a pipe through another colour's dot", () => {
    const dots = [
      { color: 0, ends: [0, 2] },
      { color: 1, ends: [1, 6] },
    ];
    expect(solutionProblem(5, dots, [[0, 1, 2], [1, 6]])).toBe("A pipe can't pass through another colour's dot.");
  });

  it("rejects a board with empty squares", () => {
    expect(solutionProblem(5, [{ color: 0, ends: [0, 1] }], [[0, 1]])).toBe("Fill every square.");
  });

  it("rejects cells off the board", () => {
    const paths = [[0, 1, 2, 3, 4, 25], ...SOLVED.slice(1)];
    expect(solutionProblem(5, DOTS, paths)).not.toBeNull();
    expect(solutionProblem(5, [{ color: 0, ends: [0, -1] }], [[0, -1]])).toBe("That pipe runs off the board.");
  });
});

describe("FLOW_PUZZLES", () => {
  it("are all well-formed", () => {
    for (const p of FLOW_PUZZLES) expect([p.key, puzzleProblem(p)]).toEqual([p.key, null]);
  });

  it("have unique keys and a par for every size", () => {
    expect(new Set(FLOW_PUZZLES.map((p) => p.key)).size).toBe(FLOW_PUZZLES.length);
    for (const p of FLOW_PUZZLES) expect(FLOW_PAR_MS[p.size]).toBeGreaterThan(0);
  });

  it("start week 1 on a 5×5 and cover three sizes", () => {
    expect(FLOW_PUZZLES[0].size).toBe(5);
    const count = (n: number) => FLOW_PUZZLES.filter((p) => p.size === n).length;
    expect([count(5), count(6), count(7)]).toEqual([3, 4, 3]);
  });
});
