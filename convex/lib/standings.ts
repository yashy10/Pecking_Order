import { SLOTS_ABOVE, SLOTS_ABOVE_WITH_SPY, SLOTS_BELOW } from "./constants";

// Owned by Track D. A pure function, so it is easy to test (standings.test.ts).
// The hidden-board rules are in docs/PLAN.md §6.1.

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
      gap: number; // always positive or 0; the UI says "ahead", "behind" or "tied"
      moved: "passedYou" | "youPassed" | null;
    }
  | { kind: "fog" };

export type NeighbourOptions<K extends string = string> = {
  ghosted: ReadonlySet<K>;
  spyActive: boolean;
};

const FOG = { kind: "fog" } as const;

function ordered<K extends string>(rows: StandingRow<K>[], key: "weekPoints" | "prevWeekPoints") {
  return [...rows].sort((a, b) => b[key] - a[key] || a.joinedAt - b.joinedAt);
}

/**
 * Who `meId` can see: the nearest visible members above and below, fog where
 * there is nobody visible, Ghost and Spy applied. Above is ordered nearest first.
 *
 * - Ghosts are hidden from everyone but themselves, Spy included.
 * - First place sees fog above, last place fog below: from fog alone you can't
 *   tell whether nobody is there or everyone there is a ghost.
 * - Spy shows three slots above instead of one, padded with fog.
 * - `moved` compares the order before the latest reveal with the order now.
 */
export function neighbours<K extends string>(
  rows: StandingRow<K>[],
  meId: K,
  opts: NeighbourOptions<K>,
): { above: Slot<K>[]; below: Slot<K>[] } {
  const me = rows.find((r) => r.memberId === meId);
  if (!me) return { above: [FOG], below: [FOG] };

  const placeBefore = new Map(ordered(rows, "prevWeekPoints").map((r, i) => [r.memberId, i]));
  const myPlaceBefore = placeBefore.get(meId) ?? 0;
  const visible = ordered(rows, "weekPoints").filter(
    (r) => r.memberId === meId || !opts.ghosted.has(r.memberId),
  );
  const mine = visible.findIndex((r) => r.memberId === meId);

  const toSlot = (r: StandingRow<K>, isAbove: boolean): Slot<K> => {
    const theirPlaceBefore = placeBefore.get(r.memberId) ?? 0;
    let moved: "passedYou" | "youPassed" | null = null;
    if (isAbove && theirPlaceBefore > myPlaceBefore) moved = "passedYou";
    if (!isAbove && theirPlaceBefore < myPlaceBefore) moved = "youPassed";
    return {
      kind: "rival",
      memberId: r.memberId,
      name: r.name,
      emoji: r.emoji,
      hasPass: r.hasPass,
      gap: Math.abs(r.weekPoints - me.weekPoints),
      moved,
    };
  };

  const wantAbove = opts.spyActive ? SLOTS_ABOVE_WITH_SPY : SLOTS_ABOVE;
  const above: Slot<K>[] = [];
  for (let k = 1; k <= wantAbove; k++) {
    const r = visible[mine - k];
    above.push(r ? toSlot(r, true) : FOG);
  }
  const below: Slot<K>[] = [];
  for (let k = 1; k <= SLOTS_BELOW; k++) {
    const r = visible[mine + k];
    below.push(r ? toSlot(r, false) : FOG);
  }
  return { above, below };
}
