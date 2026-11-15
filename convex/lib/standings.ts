// Owned by Track D. A pure function, so it is easy to test (standings.test.ts).

export type StandingRow<K extends string = string> = {
  memberId: K;
  name: string;
  emoji: string;
  hasPass: boolean;
  weekPoints: number;
  prevWeekPoints: number;
  joinedAt: number;
};

export type Slot<K extends string = string> =
  | {
      kind: "rival";
      memberId: K;
      name: string;
      emoji: string;
      hasPass: boolean;
      gap: number; // always positive or 0; the UI says "ahead" or "behind"
      moved: "passedYou" | "youPassed" | null;
    }
  | { kind: "fog" };

export type NeighbourOptions<K extends string = string> = {
  ghosted: ReadonlySet<K>;
  spyActive: boolean;
};

/**
 * Who `meId` can see: the nearest visible member above and below, fog where
 * there is none, Ghost and Spy applied. Above is ordered nearest first.
 *
 * Track D: implement docs/PLAN.md §6.1 (fog, Ghost, Spy, gaps, movement) and
 * make standings.test.ts cover every case listed in §8.
 */
export function neighbours<K extends string>(
  rows: StandingRow<K>[],
  meId: K,
  opts: NeighbourOptions<K>,
): { above: Slot<K>[]; below: Slot<K>[] } {
  void rows;
  void meId;
  void opts;
  return { above: [{ kind: "fog" }], below: [{ kind: "fog" }] };
}
