import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import type { Id } from "@convex/_generated/dataModel";
import { GAME_INFO } from "@/components/game-info";
import { Avatar, Button, Card, Icon, Pill, Txt } from "@/components/ui";
import { colors, radius, space } from "@/theme";
import type { Today } from "@/utils/convex";

// Owned by Track A. Today's games: from week 2 a friends game (worth twice as much) on
// top, then the mini game. Each one is play, keep playing, or sealed; after the reveal the
// day's total. Only your own points ever appear here (PLAN §6.1); others are emojis and a count.

type GameRow = Today["games"][number];

export function TodayCard({ groupId, today }: { groupId: Id<"groups">; today: Today }) {
  const { group, games, friendsNote } = today;

  if (games.length === 0) {
    return (
      <Card tone="soft" style={styles.center}>
        <Text style={styles.bigEmoji}>👑</Text>
        <Txt variant="title" align="center">
          Finale tonight
        </Txt>
        <Txt color={colors.muted} align="center">
          No games on Sunday. The full board drops tonight.
        </Txt>
      </Card>
    );
  }

  if (group.phase === "revealed") return <RevealedCard groupId={groupId} games={games} />;

  return (
    <View style={styles.stack}>
      {games.map((g) => (
        <GameCard key={g.gameId} groupId={groupId} game={g} memberCount={group.memberCount} />
      ))}
      {friendsNote ? <FriendsTeaser note={friendsNote} /> : null}
    </View>
  );
}

function GameCard({ groupId, game, memberCount }: { groupId: Id<"groups">; game: GameRow; memberCount: number }) {
  const info = GAME_INFO[game.type];
  const friends = game.slot === "friends";
  const top = game.maxPoints * game.multiplier;
  const play = () => router.push(`/g/${groupId}/play?game=${game.gameId}`);

  const header = (
    <View style={styles.titleRow}>
      <Txt variant="overline" color={friends ? colors.accent : colors.muted} style={styles.grow}>
        {friends ? "Friends game" : "Mini game"}
      </Txt>
      {friends ? <Pill label="Worth 2×" tone="primary" /> : null}
      {game.multiplier > 1 ? <Pill label={`×${game.multiplier} today`} tone={friends ? "soft" : "primary"} /> : null}
    </View>
  );

  if (game.myPlay.status === "done") {
    return (
      <Card testID={`sealed-${game.slot}`}>
        {header}
        <View style={styles.sealedRow}>
          <View style={styles.lock}>
            <Icon name="lock" size={22} color={colors.primary} />
          </View>
          <View style={styles.grow}>
            <Txt variant="caption" color={colors.muted}>
              {info.emoji} {info.name}
            </Txt>
            <Txt variant="title" tabular>
              {game.myPlay.points} points sealed
            </Txt>
          </View>
        </View>
        <PlayedRow game={game} memberCount={memberCount} />
      </Card>
    );
  }

  return (
    <Card tone={friends ? "accent" : "surface"} testID={`game-${game.slot}`}>
      {header}
      <View style={styles.gameRow}>
        <View style={[styles.gameGlyph, friends && styles.gameGlyphFriends]}>
          <Text style={styles.gameEmoji}>{info.emoji}</Text>
        </View>
        <View style={styles.grow}>
          <Txt variant="title">{info.name}</Txt>
          <Txt variant="caption" color={colors.muted} tabular>
            Up to {top} points
          </Txt>
        </View>
      </View>
      <Txt color={colors.muted}>{info.line}</Txt>
      <Button
        testID={friends ? "play-friends" : "play-button"}
        label={game.myPlay.status === "inProgress" ? "Keep playing" : "Play"}
        onPress={play}
      />
      <PlayedRow game={game} memberCount={memberCount} />
    </Card>
  );
}

function PlayedRow({ game, memberCount }: { game: GameRow; memberCount: number }) {
  const { count, emojis } = game.played;
  return (
    <View style={styles.played}>
      {emojis.length > 0 ? (
        <View style={styles.flock}>
          {emojis.slice(0, 8).map((e, i) => (
            <View key={`${e}-${i}`} style={[styles.flockItem, i > 0 && styles.overlap]}>
              <Avatar emoji={e} size={28} />
            </View>
          ))}
        </View>
      ) : null}
      <Txt variant="caption" color={colors.muted} tabular style={styles.grow}>
        {count === 0 ? "Nobody has played yet" : `${count} of ${memberCount} have played`}
      </Txt>
    </View>
  );
}

/** Week 1 tease, or the day a friends game couldn't be built. */
function FriendsTeaser({ note }: { note: NonNullable<Today["friendsNote"]> }) {
  const week1 = note === "unlocksNextWeek";
  return (
    <Card tone="fog" testID="friends-teaser">
      <View style={styles.titleRow}>
        <Txt variant="overline" color={colors.muted} style={styles.grow}>
          Friends game
        </Txt>
        <Pill label={week1 ? "Unlocks week 2" : "Not today"} tone="neutral" />
      </View>
      <View style={styles.gameRow}>
        <View style={[styles.gameGlyph, styles.gameGlyphLocked]}>
          <Icon name="lock" size={22} color={colors.muted} />
        </View>
        <Txt variant="heading" style={styles.grow}>
          {week1 ? "Games about your crew, worth twice as much" : "Not enough answers to build one"}
        </Txt>
      </View>
      <Txt color={colors.muted}>
        {week1
          ? "Answer the daily question below. From next week your crew's answers become games: Who Said It, Most Likely To, Read the Room and Match-Up."
          : "A friends game needs at least three answers to an earlier question. Answer today's, and get your crew to answer too."}
      </Txt>
    </Card>
  );
}

function RevealedCard({ groupId, games }: { groupId: Id<"groups">; games: GameRow[] }) {
  const played = games.filter((g) => g.myPlay.points !== null);
  const total = played.reduce((sum, g) => sum + (g.myPlay.points ?? 0), 0);
  return (
    <Card testID="revealed-card">
      <Txt variant="overline" color={colors.muted}>
        Today · revealed
      </Txt>
      {played.length === 0 ? (
        <Txt variant="title">You sat today out</Txt>
      ) : (
        <View style={styles.sealedRow}>
          <Txt variant="display" tabular color={colors.good}>
            +{total}
          </Txt>
          <Txt variant="heading" color={colors.muted} style={styles.grow}>
            banked at the reveal
          </Txt>
        </View>
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
      <Txt color={colors.muted}>
        {played.length === 0 ? "No points today, but the board still moved. " : ""}The next games drop tomorrow.
      </Txt>
      <Button
        label="See how the board moved"
        variant="tonal"
        icon="board"
        testID="see-board"
        onPress={() => router.navigate(`/g/${groupId}/board`)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space(3) },
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
  gameGlyphFriends: { borderWidth: 1, borderColor: colors.primary },
  gameGlyphLocked: { backgroundColor: colors.sunken },
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
  played: { flexDirection: "row", alignItems: "center", gap: space(2) },
  flock: { flexDirection: "row" },
  flockItem: { borderRadius: 16, borderWidth: 2, borderColor: colors.surface },
  overlap: { marginLeft: -8 },
  breakdown: { gap: space(1.5) },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: space(2) },
  rowEmoji: { fontSize: 18 },
});
