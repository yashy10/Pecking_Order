import { router } from "expo-router";
import type { Id } from "@convex/_generated/dataModel";
import { Button, Card, Screen, Txt } from "@/components/ui";

// Owned by Track C. Phase 0: placeholder. See docs/PLAN.md §8 (Track C):
// one quote per card, four name chips, progress dots, then each card flips to its author.

export function WhoSaidItGame({ groupId, gameId }: { groupId: Id<"groups">; gameId: Id<"games"> }) {
  void gameId;
  return (
    <Screen back title="Who Said It">
      <Card>
        <Txt>Who Said It is on its way.</Txt>
      </Card>
      <Button label="Back to the group" onPress={() => router.replace(`/g/${groupId}`)} />
    </Screen>
  );
}
