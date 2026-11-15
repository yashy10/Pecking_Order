import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import type { Id } from "@convex/_generated/dataModel";
import { Avatar, Button, Card, Icon, Pill, Txt } from "@/components/ui";
import { colors, radius, space } from "@/theme";
import type { Today } from "@/utils/convex";

// Owned by Track A. Four states: no game, play, sealed, revealed.
// Only your own points ever appear here (PLAN §6.1); others are emojis and a count.

const GAME = {
  blur: {
    name: "Blur",
    emoji: "🔍",
    line: "A photo starts blurred and slowly sharpens. The faster you guess, the more you score.",
  },
  whoSaidIt: {
    name: "Who Said It",
    emoji: "🗣️",
    line: "Yesterday's answers, anonymised. Guess which friend wrote each one.",
  },
} as const;

export function TodayCard({ groupId, today }: { groupId: Id<"groups">; today: Today }) {
  const { group, game, myPlay, played } = today;

  if (!game) {
    return (
      <Card tone="soft" style={styles.center}>
        <Text style={styles.bigEmoji}>👑</Text>
        <Txt variant="title" align="center">
          Finale tonight
        </Txt>
        <Txt color={colors.muted} align="center">
          No game on Sunday. The full board drops tonight.
        </Txt>
      </Card>
    );
  }

  const info = GAME[game.type];
  const double = game.multiplier > 1;

  const playedRow = (
    <View style={styles.played}>
      {played.emojis.length > 0 ? (
        <View style={styles.flock}>
          {played.emojis.slice(0, 8).map((e, i) => (
            <View key={`${e}-${i}`} style={[styles.flockItem, i > 0 && styles.overlap]}>
              <Avatar emoji={e} size={28} />
            </View>
          ))}
        </View>
      ) : null}
      <Txt variant="caption" color={colors.muted} tabular style={styles.grow}>
        {played.count === 0 ? "Nobody has played yet" : `${played.count} of ${group.memberCount} have played`}
      </Txt>
    </View>
  );

  if (group.phase === "revealed") {
    const sat = myPlay.points === null;
    return (
      <Card>
        <Txt variant="overline" color={colors.muted}>
          Today's {info.name}
        </Txt>
        <Txt variant="display" tabular color={sat ? colors.muted : colors.good}>
          {sat ? "—" : `+${myPlay.points}`}
        </Txt>
        <Txt variant="heading">{sat ? "You sat this one out" : "Banked at the reveal"}</Txt>
        <Txt color={colors.muted}>The next game drops tomorrow.</Txt>
      </Card>
    );
  }

  if (myPlay.status === "done") {
    return (
      <Card testID="sealed-card">
        <Txt variant="overline" color={colors.muted}>
          Today's {info.name}
        </Txt>
        <View style={styles.sealedRow}>
          <View style={styles.lock}>
            <Icon name="lock" size={22} color={colors.primary} />
          </View>
          <View style={styles.grow}>
            <Txt variant="title" tabular>
              {myPlay.points} points sealed
            </Txt>
            <Txt variant="caption" color={colors.muted}>
              Nobody sees scores until tonight's reveal.
            </Txt>
          </View>
        </View>
        <View style={styles.divider} />
        {playedRow}
      </Card>
    );
  }

  return (
    <Card>
      <View style={styles.titleRow}>
        <Txt variant="overline" color={colors.muted} style={styles.grow}>
          Today's game
        </Txt>
        {double ? <Pill label={`×${game.multiplier} points`} tone="primary" /> : null}
      </View>
      <View style={styles.gameRow}>
        <View style={styles.gameGlyph}>
          <Text style={styles.gameEmoji}>{info.emoji}</Text>
        </View>
        <View style={styles.grow}>
          <Txt variant="title">{info.name}</Txt>
          {double ? (
            <Txt variant="caption" color={colors.primary}>
              Wildcard Wednesday: everything counts double
            </Txt>
          ) : null}
        </View>
      </View>
      <Txt color={colors.muted}>{info.line}</Txt>
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
  center: { alignItems: "center", paddingVertical: space(6) },
  bigEmoji: { fontSize: 40 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space(2) },
  gameRow: { flexDirection: "row", alignItems: "center", gap: space(3) },
  gameGlyph: {
    width: 52,
    height: 52,
    borderRadius: radius.tile,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  gameEmoji: { fontSize: 28 },
  grow: { flex: 1 },
  sealedRow: { flexDirection: "row", alignItems: "center", gap: space(3) },
  lock: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  played: { flexDirection: "row", alignItems: "center", gap: space(2) },
  flock: { flexDirection: "row" },
  flockItem: { borderRadius: 16, borderWidth: 2, borderColor: colors.surface },
  overlap: { marginLeft: -8 },
});
