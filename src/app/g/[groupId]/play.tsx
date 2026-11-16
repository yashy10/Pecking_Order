import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, type ComponentType } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { GameType } from "@/components/game-info";
import { Button, EmptyState, Loading, Screen } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { BlurGame } from "@/screens/blur-game";
import { CrosswordGame } from "@/screens/games/crossword-game";
import { FlowGame } from "@/screens/games/flow-game";
import { KrillionGame } from "@/screens/games/krillion-game";
import { MatchUpGame } from "@/screens/games/match-up-game";
import { MostLikelyGame } from "@/screens/games/most-likely-game";
import { ReadRoomGame } from "@/screens/games/read-room-game";
import { SudokuGame } from "@/screens/games/sudoku-game";
import type { GameProps } from "@/screens/games/types";
import { WordleGame } from "@/screens/games/wordle-game";
import { WhoSaidItGame } from "@/screens/who-said-it-game";
import { rememberGroup } from "@/utils/last-group";

// Owned by the lead. Plays one of today's games: `?game=<id>`, or else the first one
// still to play (the friends game comes first).

const SCREENS: Record<GameType, ComponentType<GameProps>> = {
  blur: BlurGame,
  flow: FlowGame,
  wordle: WordleGame,
  krillion: KrillionGame,
  nokrillion: KrillionGame,
  sudoku: SudokuGame,
  crossword: CrosswordGame,
  whoSaidIt: WhoSaidItGame,
  mostLikely: MostLikelyGame,
  readRoom: ReadRoomGame,
  matchUp: MatchUpGame,
};

export default function PlayRoute() {
  const { groupId, game: wanted, r: round } = useLocalSearchParams<{ groupId: string; game?: string; r?: string }>();
  const id = groupId as Id<"groups">;
  const token = useToken();
  const today = useQuery(api.today.get, token ? { token, groupId: id } : "skip");
  useEffect(() => {
    if (today) rememberGroup(id);
  }, [today, id]);

  if (today === undefined) {
    return (
      <Screen back>
        <Loading />
      </Screen>
    );
  }
  const games = today?.games ?? [];
  const game =
    games.find((g) => g.gameId === wanted) ??
    games.find((g) => g.myPlay.status !== "done") ??
    games[0];
  if (today === null || !game) {
    return (
      <Screen back backTo={`/g/${id}`}>
        <EmptyState emoji="🌙" title="Nothing to play" body="There's no game right now. Check back when the next one drops.">
          <Button label="Back to the group" onPress={() => router.replace(`/g/${id}`)} />
        </EmptyState>
      </Screen>
    );
  }
  // Automatic groups know when today's reveal is; demo groups reveal when the presenter says.
  const revealAt = today.group.phase === "open" ? today.group.nextTickAt : null;
  const Game = SCREENS[game.type];
  return <Game key={`${game.gameId}-${round ?? ""}`} groupId={id} gameId={game.gameId} multiplier={game.multiplier} revealAt={revealAt} />;
}
