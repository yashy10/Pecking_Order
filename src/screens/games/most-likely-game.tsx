import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { SealedResult } from "@/components/sealed-result";
import { Avatar, Button, Card, EmptyState, Loading, Pill, Screen, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, fonts, glass, radius, space } from "@/theme";
import { errorMessage } from "@/utils/errors";
import * as haptics from "@/utils/haptics";
import type { GameProps } from "./types";

// Friends-games track. Most Likely To: the crew voted for a friend; call the podium.
// After locking in, the vote bars build up from 3rd place to 1st, then the player finds
// out how many votes they got. Who voted for whom is never shown, only the counts.

type Round = NonNullable<FunctionReturnType<typeof api.mostLikely.get>>;
type Result = NonNullable<Round["result"]>;

const TITLE = "Most Likely To";
const ORDINALS = ["1st", "2nd", "3rd"];
const MEDALS = ["🥇", "🥈", "🥉"];
/** The podium seen from the front: 2nd on the left, 1st in the middle, 3rd on the right. */
const PODIUM_ORDER: Record<number, number[]> = { 1: [0], 2: [1, 0], 3: [1, 0, 2] };
const PLINTH = [92, 68, 52];

export function MostLikelyGame({ groupId, gameId, multiplier, revealAt }: GameProps) {
  const token = useToken();
  const round = useQuery(api.mostLikely.get, token ? { token, gameId } : "skip");
  const submit = useMutation(api.mostLikely.submit);
  const [podium, setPodium] = useState<(Id<"members"> | null)[]>([null, null, null]);
  const [active, setActive] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leave = () => (router.canGoBack() ? router.back() : router.replace(`/g/${groupId}`));

  if (round === undefined) {
    return (
      <Screen place="quote" back title={TITLE} backTo={`/g/${groupId}`}>
        <Loading label="Counting the votes…" />
      </Screen>
    );
  }
  if (round === null || round.places === 0) {
    return (
      <Screen place="quote" back title={TITLE} backTo={`/g/${groupId}`}>
        <EmptyState emoji="🤷" title="Nothing to play" body="This round isn't yours to play.">
          <Button label="Back to the group" onPress={leave} />
        </EmptyState>
      </Screen>
    );
  }

  const finished = result ?? round.result;
  if (finished) {
    return (
      <Results
        groupId={groupId}
        gameId={gameId}
        multiplier={multiplier}
        revealAt={revealAt}
        round={round}
        result={finished}
        onDone={leave}
      />
    );
  }

  const places = round.places;
  const slots = podium.slice(0, places);
  const byId = new Map(round.candidates.map((c) => [c.memberId, c]));
  const filled = slots.filter(Boolean).length;
  const complete = filled === places;

  function place(memberId: Id<"members">) {
    haptics.tap();
    const at = slots.indexOf(memberId);
    if (at !== -1) {
      // Tapping someone already placed takes them back off the podium.
      const next = [...slots];
      next[at] = null;
      setPodium(next);
      setActive(at);
      return;
    }
    const target = slots[active] === null ? active : Math.max(0, slots.indexOf(null));
    const next = [...slots];
    next[target] = memberId;
    setPodium(next);
    const open = next.indexOf(null);
    setActive(open === -1 ? target : open);
  }

  function tapSlot(i: number) {
    haptics.tap();
    if (slots[i]) {
      const next = [...slots];
      next[i] = null;
      setPodium(next);
    }
    setActive(i);
  }

  async function lockIn() {
    if (!token || busy || !complete) return;
    setBusy(true);
    setError(null);
    try {
      const r = await submit({ token, gameId, picks: slots.filter((s): s is Id<"members"> => s !== null) });
      setResult(r);
      if (r.correct > 0) haptics.success();
      else haptics.warning();
    } catch (e) {
      setError(errorMessage(e));
      haptics.error();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen place="quote" back title={TITLE} subtitle="Call the podium" backTo={`/g/${groupId}`}>
      <SourceQuestion askedWhen={round.askedWhen} question={round.question}>
        <Txt color={colors.muted}>
          The crew voted. Who came {places === 1 ? "out on top" : `in the top ${places}`}?
        </Txt>
      </SourceQuestion>

      <View style={styles.podium} accessibilityRole="list">
        {PODIUM_ORDER[places].map((i) => {
          const who = slots[i] ? byId.get(slots[i]) : undefined;
          const isActive = i === active && !complete;
          return (
            <Pressable
              key={i}
              testID={`ml-slot-${i}`}
              accessibilityRole="button"
              accessibilityLabel={`${ORDINALS[i]} place: ${who ? who.name : "empty"}`}
              accessibilityHint={who ? "Clears this place" : "Choose who goes here next"}
              onPress={() => tapSlot(i)}
              style={styles.slot}
            >
              <View style={styles.piece}>
                {who ? (
                  <Animated.View key={who.memberId} entering={ZoomIn.springify().damping(12)}>
                    <Avatar emoji={who.emoji} size={i === 0 ? 60 : 50} />
                  </Animated.View>
                ) : (
                  <View style={[styles.emptyPiece, isActive && styles.emptyPieceActive, i === 0 && styles.emptyPieceBig]}>
                    <Txt variant="title" color={isActive ? colors.accent : colors.muted}>
                      ?
                    </Txt>
                  </View>
                )}
              </View>
              <Txt variant="caption" numberOfLines={1} align="center" color={who ? colors.ink : colors.muted}>
                {who ? who.name : isActive ? "Pick…" : " "}
              </Txt>
              <View
                style={[
                  styles.plinth,
                  { height: PLINTH[i] },
                  i === 0 && styles.plinthFirst,
                  isActive && styles.plinthActive,
                ]}
              >
                <Text style={[styles.plinthLabel, i === 0 && styles.plinthLabelFirst]}>{ORDINALS[i]}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.grid}>
        {round.candidates.map((c) => {
          const at = slots.indexOf(c.memberId);
          return (
            <Pressable
              key={c.memberId}
              testID="ml-candidate"
              accessibilityRole="button"
              accessibilityState={{ selected: at !== -1 }}
              accessibilityLabel={`${c.name}${c.isMe ? " (you)" : ""}${at !== -1 ? `, ${ORDINALS[at]}` : ""}`}
              onPress={() => place(c.memberId)}
              style={({ pressed }) => [styles.chip, at !== -1 && styles.chipOn, pressed && styles.chipPressed]}
            >
              <Avatar emoji={c.emoji} size={34} />
              <Txt
                variant="label"
                numberOfLines={1}
                style={styles.grow}
                color={at !== -1 ? colors.accent : colors.ink}
              >
                {c.isMe ? `${c.name} (you)` : c.name}
              </Txt>
              {at !== -1 ? <Text style={styles.medal}>{MEDALS[at]}</Text> : null}
            </Pressable>
          );
        })}
      </View>

      {error ? <Txt color={colors.bad}>{error}</Txt> : null}
      {complete ? (
        <Button testID="ml-lock-in" label="Lock in my podium" onPress={lockIn} loading={busy} />
      ) : (
        <Txt variant="caption" color={colors.muted} align="center" tabular>
          {filled} of {places} placed · tap a place to change it
        </Txt>
      )}
    </Screen>
  );
}

// ---------------------------------------------------------------------------------------
// The reveal

const REVEAL_START = 1300; // after the sealed-points lock lands
const REVEAL_STEP = 1000;

function Results({
  groupId,
  gameId,
  multiplier,
  revealAt,
  round,
  result,
  onDone,
}: {
  groupId: Id<"groups">;
  gameId: Id<"games">;
  multiplier: number;
  revealAt: number | null;
  round: Round;
  result: Result;
  onDone: () => void;
}) {
  const reduced = useReducedMotion();
  const bars = result.bars;
  const max = Math.max(1, ...bars.map((b) => b.votes));
  const places = result.places;
  const hasRest = bars.length > places;
  // The rest appear together, then 3rd, 2nd and finally 1st, a beat apart.
  const delayFor = (i: number) => {
    if (reduced) return 0;
    if (i >= places) return REVEAL_START;
    return REVEAL_START + (hasRest ? REVEAL_STEP : 0) + (places - 1 - i) * REVEAL_STEP;
  };
  const afterPodium = reduced ? 0 : delayFor(0) + REVEAL_STEP;
  const rankOf = (votes: number) => 1 + bars.filter((b) => b.votes > votes).length;
  const topVotes = bars[0]?.votes ?? 0;
  const iWon = result.myVotes > 0 && result.myVotes === topVotes;

  useEffect(() => {
    if (reduced) return;
    const timers = bars.slice(0, places).map((_, i) =>
      setTimeout(() => (i === 0 ? haptics.success() : haptics.tap()), delayFor(i) + 500),
    );
    return () => timers.forEach(clearTimeout);
    // The reveal runs once, when the result first shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen place="quote" back title={TITLE} subtitle="The votes are in" backTo={`/g/${groupId}`}>
      <SealedResult
        testID="ml-result"
        groupId={groupId}
        gameId={gameId}
        points={result.points}
        multiplier={multiplier}
        revealAt={revealAt}
        onBack={onDone}
      >
        <Txt variant="overline" color={colors.muted}>
          You called
        </Txt>
        <Txt variant="display" align="center" tabular>
          {result.correct} of {places}
        </Txt>
        <Txt variant="caption" color={colors.muted} align="center">
          {places === 1 ? "the winner" : "places on the podium"}
        </Txt>
      </SealedResult>

      <Card style={styles.revealCard}>
        <Txt variant="overline" color={colors.accent}>
          {round.question}
        </Txt>
        <Txt variant="caption" color={colors.muted} tabular>
          {result.voters} vote{result.voters === 1 ? "" : "s"} cast
        </Txt>
        <View style={styles.bars}>
          {bars.map((b, i) => (
            <VoteBar
              key={b.memberId}
              name={b.name}
              emoji={b.emoji}
              votes={b.votes}
              isMe={b.isMe}
              rank={rankOf(b.votes)}
              top={rankOf(b.votes) === 1}
              share={b.votes / max}
              delay={delayFor(i)}
              reduced={reduced}
            />
          ))}
        </View>
      </Card>

      <Animated.View entering={reduced ? undefined : ZoomIn.delay(afterPodium).springify().damping(13)}>
        <Card tone={result.myVotes > 0 ? "soft" : "surface"} style={styles.callout}>
          <Text style={styles.calloutEmoji}>{iWon ? "👑" : result.myVotes > 0 ? "😳" : "😇"}</Text>
          <Txt variant="title" align="center" tabular>
            {result.myVotes === 0
              ? "Nobody voted for you"
              : `You got ${result.myVotes} vote${result.myVotes === 1 ? "" : "s"}`}
          </Txt>
          <Txt color={colors.muted} align="center">
            {iWon
              ? "The crew has spoken. It's you."
              : result.myVotes > 0
                ? "Somebody out there thinks it's you."
                : "Squeaky clean. This time."}
          </Txt>
        </Card>
      </Animated.View>

      <Animated.View
        entering={reduced ? undefined : FadeInDown.delay(afterPodium + 500).duration(400)}
        style={styles.calls}
      >
        <Txt variant="overline" color={colors.muted}>
          Your call
        </Txt>
        {result.picks.map((p, i) => (
          <Card key={p.memberId} style={styles.callRow}>
            <Text style={styles.medal}>{MEDALS[i]}</Text>
            <Avatar emoji={p.emoji} size={32} />
            <View style={styles.grow}>
              <Txt variant="label" numberOfLines={1}>
                {p.name}
              </Txt>
              <Txt variant="caption" color={colors.muted} tabular>
                {p.votes} vote{p.votes === 1 ? "" : "s"}
              </Txt>
            </View>
            <Pill label={p.right ? "Spot on" : "Missed"} tone={p.right ? "goodSoft" : "badSoft"} />
          </Card>
        ))}
      </Animated.View>

      <Button variant="secondary" label="Back to today" onPress={onDone} />
    </Screen>
  );
}

function VoteBar({
  name,
  emoji,
  votes,
  isMe,
  rank,
  top,
  share,
  delay,
  reduced,
}: {
  name: string;
  emoji: string;
  votes: number;
  isMe: boolean;
  rank: number;
  top: boolean;
  share: number;
  delay: number;
  reduced: boolean;
}) {
  const fill = useSharedValue(reduced ? share : 0);
  useEffect(() => {
    if (reduced) {
      fill.value = share;
      return;
    }
    fill.value = withDelay(delay, withTiming(share, { duration: 800, easing: Easing.out(Easing.cubic) }));
  }, [fill, share, delay, reduced]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${Math.max(4, fill.value * 100)}%` }));
  const shown = useCountUp(votes, delay, reduced);
  const podium = rank <= 3;

  return (
    <Animated.View
      entering={reduced ? undefined : FadeIn.delay(delay).duration(350)}
      style={[styles.barRow, top && styles.barRowTop]}
      accessible
      accessibilityLabel={`${name}${isMe ? " (you)" : ""}: ${votes} vote${votes === 1 ? "" : "s"}`}
    >
      <Text style={[styles.rank, !podium && styles.rankPlain]}>{podium ? MEDALS[rank - 1] : `${rank}th`}</Text>
      <Avatar emoji={emoji} size={top ? 46 : 36} />
      <View style={styles.barBody}>
        <Txt variant={top ? "heading" : "label"} numberOfLines={1} color={isMe ? colors.accent : colors.ink}>
          {isMe ? `${name} (you)` : name}
        </Txt>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, top && styles.fillTop, fillStyle]} />
        </View>
      </View>
      <Text style={[styles.count, top && styles.countTop]}>{shown}</Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------------------
// Shared by the friends games

/** The question the round was built from, front and centre. */
export function SourceQuestion({
  askedWhen,
  question,
  children,
}: {
  askedWhen: string;
  question: string;
  children?: ReactNode;
}) {
  return (
    <Card tone="soft" style={styles.source}>
      <Txt variant="overline" color={colors.accent}>
        {askedWhen} the crew was asked
      </Txt>
      <Txt variant="title">{question}</Txt>
      {children}
    </Card>
  );
}

/** Counts from 0 to `to` with an ease-out, starting after `delayMs`. */
export function useCountUp(to: number, delayMs: number, reduced: boolean, durationMs = 800): number {
  const [value, setValue] = useState(reduced ? to : 0);
  useEffect(() => {
    if (reduced || to <= 0) {
      setValue(to);
      return;
    }
    let frame = 0;
    let start = 0;
    const timer = setTimeout(() => {
      const tick = (t: number) => {
        if (!start) start = t;
        const p = Math.min(1, (t - start) / durationMs);
        setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, delayMs);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [to, delayMs, reduced, durationMs]);
  return value;
}

const styles = StyleSheet.create({
  source: { gap: space(2), paddingVertical: space(5) },
  grow: { flex: 1 },

  podium: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: space(2) },
  slot: { flex: 1, maxWidth: 120, alignItems: "center", gap: space(1) },
  piece: { height: 64, justifyContent: "flex-end", alignItems: "center" },
  emptyPiece: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.brassDim,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyPieceBig: { width: 60, height: 60, borderRadius: 30 },
  emptyPieceActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  plinth: {
    alignSelf: "stretch",
    borderTopLeftRadius: radius.field,
    borderTopRightRadius: radius.field,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: glass.edge,
    backgroundColor: colors.raised,
    alignItems: "center",
    paddingTop: space(2),
  },
  plinthFirst: { backgroundColor: colors.primary, backgroundImage: glass.brassSolid, borderColor: glass.brassEdge },
  plinthActive: { borderColor: colors.accent, borderWidth: 2, borderBottomWidth: 0 },
  plinthLabel: { fontFamily: fonts.display, fontSize: 18, color: colors.muted, letterSpacing: 1 },
  plinthLabelFirst: { color: colors.primaryInk, fontSize: 22 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  chip: {
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space(2),
    padding: space(2.5),
    minHeight: 56,
    borderRadius: radius.tile,
    borderWidth: 1.5,
    borderColor: glass.edge,
    backgroundColor: glass.panel,
  },
  chipOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipPressed: { transform: [{ scale: 0.98 }] },
  medal: { fontSize: 20 },

  revealCard: { gap: space(2) },
  bars: { gap: space(3), marginTop: space(1) },
  barRow: { flexDirection: "row", alignItems: "center", gap: space(2) },
  barRowTop: {
    padding: space(2),
    marginHorizontal: -space(2),
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: glass.brassEdge,
    backgroundImage: glass.brassFill,
  },
  rank: { width: 30, fontSize: 22, textAlign: "center" },
  rankPlain: { fontFamily: fonts.mono, fontSize: 12, color: colors.muted },
  barBody: { flex: 1, gap: space(1) },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.sunken, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 5, backgroundColor: colors.brassDim },
  fillTop: { backgroundColor: colors.primary, backgroundImage: glass.brassSolid },
  count: {
    minWidth: 32,
    textAlign: "right",
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  countTop: { fontSize: 28, color: colors.accent },

  callout: { alignItems: "center", gap: space(1), paddingVertical: space(5) },
  calloutEmoji: { fontSize: 44 },
  calls: { gap: space(2) },
  callRow: { flexDirection: "row", alignItems: "center", gap: space(2), paddingVertical: space(3) },
});
