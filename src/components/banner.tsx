import type { Id } from "@convex/_generated/dataModel";

// Owned by the lead. Phase 2 (PLAN §10, step 1): shows the newest unseen line from
// api.events.mine, like "Priya just passed you". Renders nothing until then.

export function Banner({ groupId }: { groupId: Id<"groups"> }) {
  void groupId;
  return null;
}
