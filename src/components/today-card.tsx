import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { Id } from "@convex/_generated/dataModel";
import { Avatar, Button, Card, Icon, Mark, Pill, Txt, usePlace } from "@/components/ui";
import { colors, space } from "@/theme";
import type { Today } from "@/utils/convex";

// Owned by Track A. Four states: no game, play, secret (played), scores out.
// Only your own points ever appear here (PLAN §6.1); others are emojis and a count.

const GAME = {
  blur: {
    name: "Blur",
    icon: "search",
    line: "A photo starts blurred and slowly sharpens. The faster you guess, the more you score.",
  },
  whoSaidIt: {
    name: "Who Said It",
    icon: "chat",
    line: "Yesterday's answers, with the names removed. Guess who wrote each one.",
  },
} as const;

export function TodayCard({ groupId, today }: { groupId: Id<"groups">; today: Today }) {
  const { group, game, myPlay, played } = today;

  if (!game) {
    return (
      <Card tone="soft" style={styles.center}>
        <Mark icon="crown" tone="plain" />
        <Txt variant="title" align="center">
          Finale tonight
        </Txt>
        <Txt color={colors.muted} align="center">
          No game on Sunday. The full board is revealed tonight.
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
        {played.count === 0 ? "Nobody has played yet" : `${played.count} of ${group.memberCount} have played`}
      </Txt>
    </View>
  );

  if (group.phase === "revealed") {
    const sat = myPlay.points === null;
    return (
      <Card tone="soft" style={styles.center} testID="revealed-card">
        <Mark icon={sat ? "moon" : "sparkle"} tone="plain" />
        <Txt variant="overline" color={colors.muted}>
          Today's scores are in
        </Txt>
        {sat ? (
          <Txt variant="title" align="center">
            You sat this one out
          </Txt>
        ) : (
          <Txt variant="display" tabular color={colors.good} align="center" style={styles.points}>
            +{myPlay.points}
          </Txt>
        )}
        <Txt color={colors.muted} align="center">
          {sat ? "No points today. The next game drops tomorrow." : "points added to your week. The next game drops tomorrow."}
        </Txt>
        <View style={styles.stretch}>
          <Button
            label="See how the board moved"
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
          <Mark icon="lock" tone="plain" />
          <Txt variant="title" align="center">
            Your score is sealed
          </Txt>
          <Txt variant="display" tabular align="center">
            {myPlay.points}
          </Txt>
          <Txt color={colors.muted} align="center">
            Only you can see this. Everyone's scores are revealed tonight, at the same time.
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
        {double ? <Pill label={`×${game.multiplier} points today`} tone="primary" /> : null}
        <Mark icon={info.icon} tone="plain" />
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
  { icon: "play", label: "Play" },
  { icon: "lock", label: "Score sealed" },
  { icon: "crown", label: "Sunday reveal" },
] as const;

/** How the week works, in three steps. The one you're on is lit. */
function Steps({ at }: { at: 1 | 2 | 3 }) {
  const place = usePlace();
  return (
    <View
      style={styles.steps}
      accessible
      accessibilityLabel={`How it works. Step 1, play. Step 2, your score is sealed. Step 3, the full board is revealed on Sunday. You are on step ${at}.`}
    >
      {STEPS.map((s, i) => {
        const on = i + 1 === at;
        return (
          <View key={s.label} style={styles.step}>
            <View style={[styles.stepDot, on && { backgroundColor: place.fill, borderColor: place.fill }]}>
              <Icon name={s.icon} size={18} color={on ? colors.ink : colors.muted} />
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
  points: { fontSize: 56, lineHeight: 60 },
  grow: { flex: 1 },
  played: { flexDirection: "row", alignItems: "center", gap: space(2), alignSelf: "stretch", marginTop: space(1) },
  flock: { flexDirection: "row" },
  overlap: { marginLeft: -10 },
  steps: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: space(2) },
  step: { flex: 1, alignItems: "center", gap: space(1.5) },
  stepDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
});
