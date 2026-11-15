import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import type { Id } from "@convex/_generated/dataModel";
import { Button, Card, Pill, Txt } from "@/components/ui";
import { colors, space } from "@/theme";
import type { Today } from "@/utils/convex";

// Owned by Track A. Four states: no game, play, sealed, revealed.

export function TodayCard({ groupId, today }: { groupId: Id<"groups">; today: Today }) {
  const { group, game, myPlay, played } = today;

  if (!game) {
    return (
      <Card>
        <Txt variant="title">Finale tonight</Txt>
        <Txt color={colors.muted}>No game on Sunday. The full board drops tonight.</Txt>
      </Card>
    );
  }

  const gameName = game.type === "whoSaidIt" ? "Who Said It" : "Blur";

  if (group.phase === "revealed") {
    return (
      <Card>
        <Txt variant="caption" color={colors.muted}>
          TODAY'S {gameName.toUpperCase()}
        </Txt>
        <Txt variant="title">
          {myPlay.points === null ? "You sat this one out" : `+${myPlay.points} banked`}
        </Txt>
        <Txt color={colors.muted}>Today is revealed. The next game drops tomorrow.</Txt>
      </Card>
    );
  }

  const playedRow = (
    <View style={styles.played}>
      <Txt variant="caption" color={colors.muted}>
        {played.count} of {group.memberCount} have played
      </Txt>
      <Text style={styles.emojis}>{played.emojis.join(" ")}</Text>
    </View>
  );

  if (myPlay.status === "done") {
    return (
      <Card testID="sealed-card">
        <Txt variant="caption" color={colors.muted}>
          TODAY'S {gameName.toUpperCase()}
        </Txt>
        <Txt variant="title">🔒 {myPlay.points} points sealed</Txt>
        <Txt color={colors.muted}>Nobody sees scores until tonight's reveal.</Txt>
        {playedRow}
      </Card>
    );
  }

  return (
    <Card>
      <View style={styles.titleRow}>
        <Txt variant="caption" color={colors.muted}>
          TODAY'S GAME
        </Txt>
        {game.multiplier > 1 ? <Pill label={`×${game.multiplier} points`} tone="primary" /> : null}
      </View>
      <Txt variant="title">{gameName}</Txt>
      <Txt color={colors.muted}>
        {game.type === "blur"
          ? "A photo starts blurred and slowly sharpens. The faster you guess, the more you score."
          : "Guess which friend wrote each answer."}
      </Txt>
      <Button
        testID="play-button"
        label={myPlay.status === "inProgress" ? "Keep playing" : "Play"}
        onPress={() => router.push(`/g/${groupId}/play`)}
      />
      {playedRow}
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  played: { gap: space(1) },
  emojis: { fontSize: 20 },
});
