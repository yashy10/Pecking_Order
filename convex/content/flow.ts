// Owned by the flow track. Preset puzzles: each letter is a pair of dots of one colour,
// "." is an empty square. Every puzzle has at least one full solution (the server checks
// any valid one, so uniqueness is not needed). Week N plays puzzle N, so the first is easy.

export type FlowPuzzle = { key: string; size: number; rows: string[] };

export const FLOW_PUZZLES: FlowPuzzle[] = [
  { key: "fl_45e89110", size: 5, rows: [".A...", ".BCDC", "..A..", ".B.ED", "....E"] },
  { key: "fl_b25dff12", size: 6, rows: ["....AB", "CDC...", "E....F", "..AD..", "....B.", "....EF"] },
  { key: "fl_d95c7eb8", size: 7, rows: ["....A..", ".B.CD..", ".C.....", "EF.G..A", ".GF...D", ".....BE", "......."] },
  { key: "fl_9fad5ee5", size: 5, rows: ["A...B", "CD.A.", ".EDB.", "....E", "....C"] },
  { key: "fl_ff8c2db8", size: 6, rows: ["AB.BC.", ".DE.E.", "..F.F.", "..G...", "....G.", "..ADC."] },
  { key: "fl_cceee061", size: 7, rows: ["AB....B", "....CD.", ".EF....", ".F.....", "A..GE..", "HGC....", "..HD..."] },
  { key: "fl_ea501211", size: 6, rows: ["....AB", "A.....", "C.DBC.", "E.....", "FE....", "....FD"] },
  { key: "fl_004a8ae7", size: 5, rows: ["ABC.C", ".....", ".....", ".DA.B", "....D"] },
  { key: "fl_b47b6b26", size: 7, rows: ["....A..", "..BCDE.", "..D...A", "......F", ".EB....", "....FG.", ".....CG"] },
  { key: "fl_946acaee", size: 6, rows: ["AB.CD.", "...EFD", "..C...", "..B...", "...AE.", "G..GF."] },
];
