import { ConvexError } from "convex/values";

// Frozen in Phase 0. Owned by the lead.

/** A message that is safe to show a player. ConvexError text is written for players. */
export function errorMessage(e: unknown): string {
  if (e instanceof ConvexError && typeof e.data === "string") return e.data;
  return "Something went wrong. Try again.";
}
