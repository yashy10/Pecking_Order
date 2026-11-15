import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import type { Id } from "@convex/_generated/dataModel";
import { Avatar, Button, Card, Icon, Mascot, Pill, Txt, usePlace } from "@/components/ui";
import { colors, radius, space } from "@/theme";
import type { Today } from "@/utils/convex";

// Owned by Track A. Four states: no game, play, secret (played), scores out.
// Only your own points ever appear here (PLAN §6.1); others are emojis and a count.

const GAME = {
  blur: {
    name: "Blur",
    emoji: "🔍",
    line: "A blurry photo slowly gets clear. Guess fast to score more!",
  },
  whoSaidIt: {
    name: "Who Said It",
    emoji: "🗣️",
    line: "Your friends wrote secret answers yesterday. Guess who wrote each one!",
  },
} as const;

export function TodayCard({ groupId, today }: { groupId: Id<"groups">; today: Today }) {
  const { group, game, myPlay, played } = today;

  if (!game) {
    return (
      <Card tone="soft" style={styles.center}>
        <Mascot mood="cheering" size={112} />
        <Txt variant="title" align="center">
          The winner is revealed tonight!
        </Txt>
        <Txt color={colors.muted} align="center">
          No game on Sunday. Come back tonight to see the whole board.
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
            <View key={`${e}-${i}`} style={i > 0 && styles.overlap}>
              <Avatar emoji={e} size={32} />
            </View>
          ))}
        </View>
      ) : null}
      <Txt variant="caption" color={colors.muted} tabular style={styles.grow}>
        {played.count === 0 ? "Be the first to play!" : `${played.count} of ${group.memberCount} friends have played`}
      </Txt>
    </View>
  );

  if (group.phase === "revealed") {
    const sat = myPlay.points === null;
    return (
      <Card tone="soft" style={styles.center} testID="revealed-card">
        <Mascot mood={sat ? "sleepy" : "cheering"} size={96} />
        <Txt variant="overline" color={colors.muted}>
          Today's scores are out
        </Txt>
        {sat ? (
          <Txt variant="title" align="center">
            You skipped today
          </Txt>
        ) : (
          <Txt variant="display" tabular color={colors.good} align="center" style={styles.points}>
            +{myPlay.points}
          </Txt>
        )}
        <Txt color={colors.muted} align="center">
          {sat ? "No points this time. A new game comes tomorrow!" : "points for you. A new game comes tomorrow!"}
        </Txt>
        <View style={styles.stretch}>
          <Button
            label="See who moved"
            icon="board"
            testID="see-board"
            onPress={() => router.navigate(`/g/${groupId}/board`)}
          />
        </View>
      </Card>
    );
  }

  if (myPlay.status === "done") {
    return (
      <>
        <Card tone="soft" style={styles.center} testID="sealed-card">
          <Mascot mood="peeking" size={96} />
          <Txt variant="title" align="center">
            Shh! Your score is a secret
          </Txt>
          <View style={styles.secret}>
            <Icon name="lock" size={20} color={colors.ink} strokeWidth={2.4} />
            <Txt variant="heading" tabular>
              {myPlay.points} points saved
            </Txt>
          </View>
          <Txt color={colors.muted} align="center">
            Everyone finds out tonight, all at the same time.
          </Txt>
          {playedRow}
        </Card>
        <Steps at={2} />
      </>
    );
  }

  return (
    <>
      <Card tone="soft" style={styles.center}>
        {double ? <Pill label={`Double points today! ×${game.multiplier}`} tone="bad" /> : null}
        <View style={styles.gameGlyph}>
          <Text style={styles.gameEmoji}>{info.emoji}</Text>
        </View>
        <Txt variant="overline" color={colors.muted}>
          Today's game
        </Txt>
        <Txt variant="display" align="center">
          {info.name}
        </Txt>
        <Txt color={colors.muted} align="center">
          {info.line}
        </Txt>
        <View style={styles.stretch}>
          <Button
            testID="play-button"
            label={myPlay.status === "inProgress" ? "Keep playing" : "Play"}
            onPress={() => router.push(`/g/${groupId}/play`)}
          />
        </View>
        {playedRow}
      </Card>
      <Steps at={1} />
    </>
  );
}

const STEPS = [
  { emoji: "🎮", label: "Play" },
  { emoji: "🤫", label: "Secret score" },
  { emoji: "👑", label: "Sunday winner" },
] as const;

/** How the week works, in three pictures. The step you're on is lit. */
function Steps({ at }: { at: 1 | 2 | 3 }) {
  const place = usePlace();
  return (
    <View
      style={styles.steps}
      accessible
      accessibilityLabel={`How it works. Step 1, play. Step 2, your score stays secret. Step 3, the winner is revealed on Sunday. You are on step ${at}.`}
    >
      {STEPS.map((s, i) => {
        const on = i + 1 === at;
        return (
          <View key={s.label} style={styles.step}>
            <View style={[styles.stepDot, on && { backgroundColor: place.fill, borderColor: place.edge }]}>
              <Text style={styles.stepEmoji}>{s.emoji}</Text>
            </View>
            <Txt variant="caption" align="center" color={on ? colors.ink : colors.muted}>
              {s.label}
            </Txt>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", paddingVertical: space(6) },
  stretch: { alignSelf: "stretch", marginTop: space(2) },
  points: { fontSize: 64, lineHeight: 70 },
  gameGlyph: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  gameEmoji: { fontSize: 48 },
  grow: { flex: 1 },
  secret: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(2),
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: space(4),
    paddingVertical: space(2),
  },
  played: { flexDirection: "row", alignItems: "center", gap: space(2), alignSelf: "stretch", marginTop: space(1) },
  flock: { flexDirection: "row" },
  overlap: { marginLeft: -10 },
  steps: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: space(2) },
  step: { flex: 1, alignItems: "center", gap: space(1.5) },
  stepDot: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  stepEmoji: { fontSize: 26 },
});
