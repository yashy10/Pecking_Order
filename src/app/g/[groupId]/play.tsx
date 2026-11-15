import { useQuery } from "convex/react";
import { useLocalSearchParams } from "expo-router";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Card, Loading, Screen, Txt } from "@/components/ui";
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
      <Screen back title="Nothing to play">
        <Card>
          <Txt>There's no game right now. Check back when the next one drops.</Txt>
        </Card>
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
