import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import type { Id } from "@convex/_generated/dataModel";
import { GAME_INFO } from "@/components/game-info";
import { Button, Card, Icon, Mark, Txt, usePlace } from "@/components/ui";
import { useReplay } from "@/hooks/use-replay";
import { colors, radius, space } from "@/theme";
import type { Today } from "@/utils/convex";

// Owned by Track A. Today's games: from week 2 a friends game (worth twice as much) on
// top, then the mini game. Each one is play, keep playing, or sealed; after the reveal the
// day's total. Only your own points ever appear here (PLAN §6.1); others are emojis and a count.
// Cards are compact rows so two games and the daily question still fit one screen. The next
// game to play is the tinted one.

type GameRow = Today["games"][number];

export function TodayCard({ groupId, today }: { groupId: Id<"groups">; today: Today }) {
  const { group, games, friendsNote } = today;

  if (games.length === 0) {
    return (
      <Card tone="soft" style={styles.center}>
        <Mark icon="crown" tone="plain" />
        <Txt variant="title" align="center">
          Finale tonight
        </Txt>
        <Txt color={colors.muted} align="center">
          No games on Sunday. The full board is revealed tonight.
        </Txt>
      </Card>
    );
  }

  if (group.phase === "revealed") return <RevealedCard groupId={groupId} games={games} />;

  const next = games.find((g) => g.myPlay.status !== "done");
  return (
    <View style={styles.stack}>
      {games.map((g) => (
        <GameCard
          key={g.gameId}
          groupId={groupId}
          game={g}
          memberCount={group.memberCount}
          hero={g === next}
          showcase={group.showcase}
        />
      ))}
      {friendsNote ? <FriendsTeaser note={friendsNote} /> : null}
      {/* With one card on the page there is room to show how the week works. */}
      {games.length === 1 && !friendsNote ? <Steps at={next ? 1 : 2} /> : null}
    </View>
  );
}

function GameCard({
  groupId,
  game,
  memberCount,
  hero,
  showcase,
}: {
  groupId: Id<"groups">;
  game: GameRow;
  memberCount: number;
  hero: boolean;
  /** Admin Games: a finished round can be played again. */
  showcase: boolean;
}) {
  const { playAgain, busy } = useReplay(groupId);
  const info = GAME_INFO[game.type];
  const friends = game.slot === "friends";
  const top = game.maxPoints * game.multiplier;
  const done = game.myPlay.status === "done";
  const { count } = game.played;
  const playedLine = count === 0 ? "Nobody has played yet" : `${count} of ${memberCount} played`;

  return (
    <Card tone={hero ? "soft" : "surface"} testID={done ? `sealed-${game.slot}` : `game-${game.slot}`} style={styles.game}>
      <View style={styles.gameRow}>
        <View style={styles.gameGlyph}>
          {done ? <Icon name="lock" size={20} /> : <Text style={styles.gameEmoji}>{info.emoji}</Text>}
        </View>
        <View style={styles.grow}>
          <Txt variant="caption" color={colors.muted} numberOfLines={1}>
            {friends ? "Friends game · worth 2×" : "Mini game"}
            {game.multiplier > 1 ? ` · ×${game.multiplier} today` : ""}
          </Txt>
          <Txt variant="heading" numberOfLines={1}>
            {info.name}
          </Txt>
        </View>
        {done && showcase ? (
          <View style={styles.again}>
            <Txt variant="caption" color={colors.muted} tabular>
              Last go: {game.myPlay.points}
            </Txt>
            <Button
              testID={`again-${game.type}`}
              size="sm"
              variant="secondary"
              label="Play again"
              loading={busy === game.gameId}
              onPress={() => playAgain(game.gameId)}
            />
          </View>
        ) : done ? (
          <View style={styles.sealed}>
            <Txt variant="title" tabular>
              {game.myPlay.points}
            </Txt>
            <Txt variant="caption" color={colors.muted}>
              sealed
            </Txt>
          </View>
        ) : (
          <Button
            testID={friends ? "play-friends" : "play-button"}
            size="sm"
            variant={hero ? "primary" : "secondary"}
            label={game.myPlay.status === "inProgress" ? "Continue" : "Play"}
            onPress={() => router.push(`/g/${groupId}/play?game=${game.gameId}`)}
          />
        )}
      </View>
      {done ? null : (
        <Txt variant="caption" color={colors.muted}>
          {info.line}
        </Txt>
      )}
      <Txt variant="caption" color={colors.muted} tabular>
        {showcase
          ? `Up to ${top} points · practice, play as often as you like`
          : done
            ? `${playedLine}. Revealed tonight.`
            : `Up to ${top} points · ${playedLine}`}
      </Txt>
    </Card>
  );
}

/** Week 1 tease, or the day a friends game couldn't be built. */
function FriendsTeaser({ note }: { note: NonNullable<Today["friendsNote"]> }) {
  const week1 = note === "unlocksNextWeek";
  return (
    <Card tone="fog" testID="friends-teaser" style={styles.game}>
      <View style={styles.gameRow}>
        <View style={styles.gameGlyph}>
          <Icon name="lock" size={20} color={colors.muted} />
        </View>
        <View style={styles.grow}>
          <Txt variant="caption" color={colors.muted}>
            Friends game · {week1 ? "unlocks week 2" : "not today"}
          </Txt>
          <Txt variant="heading">{week1 ? "Games about your group" : "Not enough answers yet"}</Txt>
        </View>
      </View>
      <Txt variant="caption" color={colors.muted}>
        {week1
          ? "Answer the daily question below. From next week your answers become games worth twice as much."
          : "A friends game needs at least three answers to an earlier question. Answer today's, and get your group to answer too."}
      </Txt>
    </Card>
  );
}

function RevealedCard({ groupId, games }: { groupId: Id<"groups">; games: GameRow[] }) {
  const played = games.filter((g) => g.myPlay.points !== null);
  const total = played.reduce((sum, g) => sum + (g.myPlay.points ?? 0), 0);
  return (
    <Card tone="soft" style={styles.center} testID="revealed-card">
      <Mark icon={played.length === 0 ? "moon" : "sparkle"} tone="plain" size={56} />
      <Txt variant="overline" color={colors.muted}>
        Today's scores are in
      </Txt>
      {played.length === 0 ? (
        <Txt variant="title" align="center">
          You sat today out
        </Txt>
      ) : (
        <Txt variant="display" tabular color={colors.good} align="center" style={styles.points}>
          +{total}
        </Txt>
      )}
      <View style={styles.breakdown}>
        {games.map((g) => (
          <View key={g.gameId} style={styles.breakdownRow}>
            <Text style={styles.rowEmoji}>{GAME_INFO[g.type].emoji}</Text>
            <Txt variant="label" style={styles.grow}>
              {GAME_INFO[g.type].name}
            </Txt>
            <Txt variant="label" tabular color={g.myPlay.points === null ? colors.muted : colors.ink}>
              {g.myPlay.points === null ? "Skipped" : `+${g.myPlay.points}`}
            </Txt>
          </View>
        ))}
      </View>
      <Txt variant="caption" color={colors.muted} align="center">
        {played.length === 0 ? "No points today. " : ""}The next games drop tomorrow.
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
  again: { alignItems: "flex-end", gap: 2 },
  stack: { gap: space(3) },
  center: { alignItems: "center", paddingVertical: space(5) },
  stretch: { alignSelf: "stretch", marginTop: space(1) },
  points: { fontSize: 56, lineHeight: 60 },
  game: { gap: space(2), padding: space(4) },
  gameRow: { flexDirection: "row", alignItems: "center", gap: space(3) },
  gameGlyph: {
    width: 48,
    height: 48,
    borderRadius: radius.field,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  gameEmoji: { fontSize: 24 },
  grow: { flex: 1 },
  sealed: { alignItems: "flex-end" },
  breakdown: { gap: space(1.5), alignSelf: "stretch" },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: space(2) },
  rowEmoji: { fontSize: 18 },
  steps: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: space(2), paddingTop: space(1) },
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
