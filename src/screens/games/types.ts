import type { Id } from "@convex/_generated/dataModel";

/** What the play route hands every game screen. */
export type GameProps = {
  groupId: Id<"groups">;
  gameId: Id<"games">;
  /** ×2 on Wildcard Wednesday. Points from the server already include it. */
  multiplier: number;
  /** Automatic groups: when today's scores are revealed. Null for demo groups. */
  revealAt: number | null;
};
