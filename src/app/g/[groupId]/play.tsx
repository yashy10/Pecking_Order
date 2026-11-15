import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button, EmptyState, Loading, Screen } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { BlurGame } from "@/screens/blur-game";
import { WhoSaidItGame } from "@/screens/who-said-it-game";

// Frozen in Phase 0. Owned by the lead. Picks today's game.

export default function PlayRoute() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const id = groupId as Id<"groups">;
  const token = useToken();
  const today = useQuery(api.today.get, token ? { token, groupId: id } : "skip");

  if (today === undefined) {
    return (
      <Screen back>
        <Loading />
      </Screen>
    );
  }
  if (today === null || !today.game) {
    return (
      <Screen back backTo={`/g/${id}`}>
        <EmptyState emoji="🌙" title="Nothing to play" body="There's no game right now. Check back when the next one drops.">
          <Button label="Back to the group" onPress={() => router.replace(`/g/${id}`)} />
        </EmptyState>
      </Screen>
    );
  }
  const { gameId, type } = today.game;
  return type === "blur" ? (
    <BlurGame key={gameId} groupId={id} gameId={gameId} />
  ) : (
    <WhoSaidItGame key={gameId} groupId={id} gameId={gameId} />
  );
}
