import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, type AccessibilityActionEvent, type GestureResponderEvent } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInRight,
  FlipInEasyX,
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
import { SourceQuestion, useCountUp } from "./most-likely-game";
import type { GameProps } from "./types";

// Friends-games track. Read the Room: a this-or-that question split the crew. Guess the
// share on a slider, then call which way a few friends went. The reveal fills the real
// split in over the player's guess, then flips each friend's side.

type Round = NonNullable<FunctionReturnType<typeof api.readRoom.get>>;
type Result = NonNullable<Round["result"]>;

const TITLE = "Read the Room";
const STEP = 5;
const THUMB = 30;

export function ReadRoomGame({ groupId, gameId, multiplier, revealAt }: GameProps) {
  const token = useToken();
  const round = useQuery(api.readRoom.get, token ? { token, gameId } : "skip");
  const submit = useMutation(api.readRoom.submit);
  const [share, setShare] = useState(50);
  const [step, setStep] = useState<"share" | "friends">("share");
  const [calls, setCalls] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leave = () => (router.canGoBack() ? router.back() : router.replace(`/g/${groupId}`));

  if (round === undefined) {
    return (
      <Screen place="quote" back title={TITLE} backTo={`/g/${groupId}`}>
        <Loading label="Reading the room…" />
      </Screen>
    );
  }
  if (round === null || round.options.length !== 2) {
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

  const [a, b] = round.options;
  const friends = round.friends;
  const called = friends.filter((f) => calls[f.memberId] !== undefined).length;
  const allCalled = called === friends.length;

  async function lockIn() {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await submit({
        token,
        gameId,
        guess: share,
        calls: Object.entries(calls).map(([memberId, choice]) => ({
          memberId: memberId as Id<"members">,
          choice,
        })),
      });
      setResult(r);
    } catch (e) {
      setError(errorMessage(e));
      haptics.error();
    } finally {
      setBusy(false);
    }
  }

  function call(memberId: Id<"members">, choice: number) {
    haptics.tap();
    setCalls((c) => ({ ...c, [memberId]: choice }));
  }

  const source = (
    <SourceQuestion askedWhen={round.askedWhen} question={round.question}>
      <View style={styles.sidesRow}>
        <Pill label={a} tone="soft" />
        <Txt variant="caption" color={colors.muted}>
          or
        </Txt>
        <Pill label={b} tone="badSoft" />
      </View>
      {round.myChoice !== null ? (
        <Txt variant="caption" color={colors.muted}>
          You went “{round.options[round.myChoice]}”.
        </Txt>
      ) : null}
    </SourceQuestion>
  );

  if (step === "share" || friends.length === 0) {
    return (
      <Screen place="quote"
        back
        title={TITLE}
        subtitle={friends.length > 0 ? "Step 1 of 2 · the split" : "Guess the split"}
        backTo={`/g/${groupId}`}
      >
        {source}
        <Card style={styles.sliderCard}>
          <Txt variant="heading" align="center">
            What share of the crew picked “{a}”?
          </Txt>
          <View style={styles.readout}>
            <View style={styles.readoutSide}>
              <Text style={[styles.bigPct, styles.pctA]}>{share}%</Text>
              <Txt variant="caption" color={colors.accent} numberOfLines={2}>
                {a}
              </Txt>
            </View>
            <View style={[styles.readoutSide, styles.readoutRight]}>
              <Text style={[styles.bigPct, styles.pctB]}>{100 - share}%</Text>
              <Txt variant="caption" color={colors.bad} numberOfLines={2} align="right">
                {b}
              </Txt>
            </View>
          </View>
          <ShareSlider value={share} onChange={setShare} label={a} />
          <Txt variant="caption" color={colors.muted} align="center">
            Drag right for more “{a}”, left for more “{b}”.
          </Txt>
          <View style={styles.stepper}>
            <View style={styles.grow}>
              <Button
                size="sm"
                variant="secondary"
                label={`−${STEP}%`}
                disabled={share <= 0}
                onPress={() => setShare((s) => Math.max(0, s - STEP))}
              />
            </View>
            <View style={styles.grow}>
              <Button
                size="sm"
                variant="secondary"
                label={`+${STEP}%`}
                disabled={share >= 100}
                onPress={() => setShare((s) => Math.min(100, s + STEP))}
              />
            </View>
          </View>
        </Card>
        {error ? <Txt color={colors.bad}>{error}</Txt> : null}
        {friends.length > 0 ? (
          <Button testID="rr-next" label="Next: call your friends" onPress={() => setStep("friends")} />
        ) : (
          <Button testID="rr-lock-in" label="Lock in" onPress={lockIn} loading={busy} />
        )}
      </Screen>
    );
  }

  return (
    <Screen place="quote" back title={TITLE} subtitle="Step 2 of 2 · your friends" backTo={`/g/${groupId}`}>
      {source}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Your guess: ${share}% picked ${a}. Change it`}
        onPress={() => setStep("share")}
        style={styles.guessChip}
      >
        <Txt variant="caption" color={colors.muted}>
          Your guess
        </Txt>
        <Txt variant="label" color={colors.accent} tabular>
          {share}% “{a}”
        </Txt>
        <Txt variant="caption" color={colors.accent} style={styles.change}>
          Change
        </Txt>
      </Pressable>

      {friends.map((f, i) => {
        const mine = calls[f.memberId];
        return (
          <Animated.View key={f.memberId} entering={FadeInRight.delay(i * 70).duration(260)}>
            <Card style={styles.friendCard}>
              <View style={styles.friendHead}>
                <Avatar emoji={f.emoji} size={36} />
                <Txt variant="heading" style={styles.grow} numberOfLines={2}>
                  Which way did {f.name} go?
                </Txt>
              </View>
              <View style={styles.choiceRow}>
                {round.options.map((label, choice) => {
                  const on = mine === choice;
                  return (
                    <Pressable
                      key={choice}
                      testID={`rr-call-${choice}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`${f.name} went ${label}`}
                      onPress={() => call(f.memberId, choice)}
                      style={({ pressed }) => [
                        styles.choice,
                        on && (choice === 0 ? styles.choiceOnA : styles.choiceOnB),
                        pressed && styles.pressed,
                      ]}
                    >
                      <Txt
                        variant="label"
                        align="center"
                        numberOfLines={2}
                        color={on ? (choice === 0 ? colors.accent : colors.bad) : colors.ink}
                      >
                        {label}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          </Animated.View>
        );
      })}

      {error ? <Txt color={colors.bad}>{error}</Txt> : null}
      {allCalled ? (
        <Button testID="rr-lock-in" label="Lock in" onPress={lockIn} loading={busy} />
      ) : (
        <Txt variant="caption" color={colors.muted} align="center" tabular>
          {called} of {friends.length} called
        </Txt>
      )}
    </Screen>
  );
}

/**
 * A 0–100 slider in steps of 5, built from Views and the responder system (no gesture
 * library in the app). The track is the split itself: brass for the first option, terracotta
 * for the second. Screen readers adjust it with swipe up and down.
 */
function ShareSlider({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [width, setWidth] = useState(0);

  function setFromX(x: number) {
    if (width <= 0) return;
    const next = Math.min(100, Math.max(0, Math.round(((x / width) * 100) / STEP) * STEP));
    if (next === value) return;
    if (next % 10 === 0) haptics.tap();
    onChange(next);
  }
  const fromEvent = (e: GestureResponderEvent) => setFromX(e.nativeEvent.locationX - THUMB / 2);

  function onAction(e: AccessibilityActionEvent) {
    if (e.nativeEvent.actionName === "increment") onChange(Math.min(100, value + STEP));
    if (e.nativeEvent.actionName === "decrement") onChange(Math.max(0, value - STEP));
  }

  return (
    <View
      testID="rr-slider"
      style={styles.sliderHit}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width - THUMB)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={fromEvent}
      onResponderMove={fromEvent}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`Share who picked ${label}`}
      accessibilityValue={{ min: 0, max: 100, now: value, text: `${value}%` }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={onAction}
    >
      <View pointerEvents="none" style={styles.sliderInner}>
        <View style={styles.track}>
          <View style={[styles.trackA, { width: `${value}%` }]} />
          <View style={styles.trackB} />
        </View>
        <View style={[styles.thumb, { left: `${value}%` }]} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------------------
// The reveal

const REVEAL_START = 1300; // after the sealed-points lock lands
const FILL_MS = 1400;

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
  const [a, b] = round.options;
  const start = reduced ? 0 : REVEAL_START;
  const landed = reduced ? 0 : REVEAL_START + 500 + FILL_MS;
  const fill = useSharedValue(reduced ? result.actual : 0);
  const pctA = useCountUp(result.actual, start + 500, reduced, FILL_MS);
  const total = result.counts[0] + result.counts[1];
  const off = Math.abs(result.guess - result.actual);

  useEffect(() => {
    if (reduced) return;
    fill.value = withDelay(
      REVEAL_START + 500,
      withTiming(result.actual, { duration: FILL_MS, easing: Easing.inOut(Easing.cubic) }),
    );
    const t = setTimeout(() => (off <= 10 ? haptics.success() : haptics.warning()), landed);
    return () => clearTimeout(t);
    // The reveal runs once, when the result first shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value}%` }));

  return (
    <Screen place="quote" back title={TITLE} subtitle="The room has spoken" backTo={`/g/${groupId}`}>
      <SealedResult
        testID="rr-result"
        groupId={groupId}
        gameId={gameId}
        points={result.points}
        multiplier={multiplier}
        revealAt={revealAt}
        onBack={onDone}
      >
        <Txt variant="overline" color={colors.muted}>
          You were
        </Txt>
        <Txt variant="display" align="center" tabular>
          {off === 0 ? "Spot on" : `${off}% off`}
        </Txt>
        {result.asked > 0 ? (
          <Txt variant="caption" color={colors.muted} align="center" tabular>
            and called {result.correct} of {result.asked} friends
          </Txt>
        ) : null}
      </SealedResult>

      <Card tone="soft" style={styles.splitCard}>
        <Txt variant="overline" color={colors.accent}>
          The real split
        </Txt>
        <Txt variant="title">{round.question}</Txt>

        <View style={styles.readout}>
          <View style={styles.readoutSide}>
            <Text style={[styles.bigPct, styles.pctA]}>{pctA}%</Text>
            <Txt variant="caption" color={colors.accent} numberOfLines={2}>
              {a} · {result.counts[0]}
            </Txt>
          </View>
          <View style={[styles.readoutSide, styles.readoutRight]}>
            <Text style={[styles.bigPct, styles.pctB]}>{100 - pctA}%</Text>
            <Txt variant="caption" color={colors.bad} numberOfLines={2} align="right">
              {b} · {result.counts[1]}
            </Txt>
          </View>
        </View>

        <View
          style={styles.revealBar}
          accessible
          accessibilityLabel={`${result.actual}% picked ${a}. You guessed ${result.guess}%.`}
        >
          <View style={styles.revealTrack}>
            <Animated.View style={[styles.trackA, fillStyle]} />
            <View style={styles.trackB} />
          </View>
          <Animated.View
            entering={reduced ? undefined : FadeIn.delay(REVEAL_START).duration(300)}
            style={[styles.marker, { left: `${result.guess}%` }]}
          >
            <View style={[styles.markerTag, { marginLeft: result.guess < 15 ? -8 : result.guess > 85 ? -68 : -38 }]}>
              <Txt variant="caption" color={colors.primaryInk} tabular>
                You {result.guess}%
              </Txt>
            </View>
            <View style={styles.markerLine} />
          </Animated.View>
        </View>

        <View style={styles.crowds}>
          {result.sides.map((side, s) => (
            <View key={s} style={[styles.crowd, s === 1 && styles.crowdRight]}>
              {side.map((p, i) => (
                <Animated.View
                  key={p.memberId}
                  entering={
                    reduced ? undefined : ZoomIn.delay(landed - 300 + i * 60).springify().damping(14)
                  }
                  accessible
                  accessibilityLabel={`${p.name} went ${round.options[s]}`}
                >
                  <View style={[styles.crowdToken, s === 0 ? styles.crowdA : styles.crowdB]}>
                    <Avatar emoji={p.emoji} size={30} />
                  </View>
                </Animated.View>
              ))}
            </View>
          ))}
        </View>
        <Txt variant="caption" color={colors.muted} align="center" tabular>
          {total} answer{total === 1 ? "" : "s"} · share +{result.sharePoints}
          {result.asked > 0 ? ` · friends +${result.friendPoints}` : ""}
        </Txt>
      </Card>

      {result.friends.length > 0 ? (
        <Animated.View entering={reduced ? undefined : FadeInDown.delay(landed + 200).duration(300)} style={styles.friendsReveal}>
          <Txt variant="overline" color={colors.muted}>
            Which way they went
          </Txt>
          {result.friends.map((f, i) => (
            <Animated.View
              key={f.memberId}
              entering={reduced ? undefined : FlipInEasyX.delay(landed + 400 + i * 260).duration(450)}
            >
              <Card style={styles.friendRow}>
                <Avatar emoji={f.emoji} size={34} />
                <View style={styles.grow}>
                  <Txt variant="label" numberOfLines={1}>
                    {f.name}
                  </Txt>
                  <Txt variant="caption" color={f.choice === 0 ? colors.accent : colors.bad} numberOfLines={1}>
                    went “{round.options[f.choice]}”
                  </Txt>
                </View>
                <Pill label={f.right ? "Called it" : "Missed"} tone={f.right ? "goodSoft" : "badSoft"} />
              </Card>
            </Animated.View>
          ))}
        </Animated.View>
      ) : null}

      <Button variant="secondary" label="Back to today" onPress={onDone} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  pressed: { transform: [{ scale: 0.98 }] },
  sidesRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: space(2) },

  sliderCard: { gap: space(4), paddingVertical: space(5) },
  readout: { flexDirection: "row", justifyContent: "space-between", gap: space(3) },
  readoutSide: { flex: 1, gap: 2 },
  readoutRight: { alignItems: "flex-end" },
  bigPct: { fontFamily: fonts.display, fontSize: 40, lineHeight: 48, fontVariant: ["tabular-nums"] },
  pctA: { color: colors.accent },
  pctB: { color: colors.bad },

  sliderHit: { height: 48, justifyContent: "center" },
  sliderInner: { marginHorizontal: THUMB / 2, height: 48, justifyContent: "center" },
  track: {
    height: 14,
    borderRadius: 7,
    flexDirection: "row",
    overflow: "hidden",
    backgroundColor: colors.sunken,
  },
  trackA: { height: "100%", backgroundColor: colors.primary, backgroundImage: glass.brassSolid },
  trackB: { flex: 1, height: "100%", backgroundColor: colors.terracotta },
  thumb: {
    position: "absolute",
    width: THUMB,
    height: THUMB,
    marginLeft: -THUMB / 2,
    borderRadius: THUMB / 2,
    backgroundColor: colors.ink,
    borderWidth: 3,
    borderColor: colors.primary,
    boxShadow: "0px 2px 6px rgba(22, 22, 26, 0.25)",
  },
  stepper: { flexDirection: "row", gap: space(2) },

  guessChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(2),
    paddingHorizontal: space(3),
    paddingVertical: space(2.5),
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: glass.brassEdge,
    backgroundColor: glass.panel,
  },
  change: { marginLeft: "auto" },
  friendCard: { gap: space(3) },
  friendHead: { flexDirection: "row", alignItems: "center", gap: space(3) },
  choiceRow: { flexDirection: "row", gap: space(2) },
  choice: {
    flex: 1,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: space(2),
    borderRadius: radius.field,
    borderWidth: 1.5,
    borderColor: glass.edge,
    backgroundColor: colors.sunken,
  },
  choiceOnA: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  choiceOnB: { borderColor: colors.terracotta, backgroundColor: colors.badSoft },

  splitCard: { gap: space(3), paddingVertical: space(5) },
  revealBar: { height: 72, justifyContent: "flex-end", paddingBottom: space(1) },
  revealTrack: {
    height: 22,
    borderRadius: 11,
    flexDirection: "row",
    overflow: "hidden",
    backgroundColor: colors.sunken,
  },
  marker: { position: "absolute", top: 0, bottom: 0, alignItems: "center", width: 0 },
  markerTag: {
    position: "absolute",
    top: 0,
    width: 76,
    left: 0,
    alignItems: "center",
    borderRadius: radius.pill,
    paddingVertical: 2,
    backgroundColor: colors.ink,
  },
  markerLine: { position: "absolute", top: 22, bottom: 0, width: 3, marginLeft: -1.5, left: 0, borderRadius: 2, backgroundColor: colors.ink },
  crowds: { flexDirection: "row", gap: space(3) },
  crowd: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: space(1) },
  crowdRight: { justifyContent: "flex-end" },
  crowdToken: { borderRadius: 18, padding: 2, borderWidth: 2 },
  crowdA: { borderColor: colors.primary },
  crowdB: { borderColor: colors.terracotta },

  friendsReveal: { gap: space(2) },
  friendRow: { flexDirection: "row", alignItems: "center", gap: space(3), paddingVertical: space(3) },
});
