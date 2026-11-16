import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { api } from "@convex/_generated/api";
import { SealedResult } from "@/components/sealed-result";
import { Button, Card, EmptyState, Field, Loading, Pill, Screen, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, fonts, radius, space } from "@/theme";
import { errorMessage } from "@/utils/errors";
import * as haptics from "@/utils/haptics";
import type { GameProps } from "./types";

// Owned by the krillion track. Krillion and Nokrillion: three categories a day, one answer
// each, three strikes. After each category the whole ranked list climbs in as a popularity
// ladder with your answer lit up. That reveal is the moment, so it gets the motion.

type State = FunctionReturnType<typeof api.krillion.start>;
type Round = State["rounds"][number];
type Rung = NonNullable<Round["list"]>[number];
type Mode = State["mode"];

const COPY: Record<Mode, { name: string; emoji: string; twist: string; hint: (max: number, min: number) => string }> = {
  rare: {
    name: "Krillion",
    emoji: "🦐",
    twist: "Rare answers score big. Obvious ones score 10.",
    hint: (max, min) => `Rarest answer: ${max}. Most obvious: ${min}.`,
  },
  common: {
    name: "Nokrillion",
    emoji: "🐟",
    twist: "Think like the crowd. The most obvious answer scores most.",
    hint: (max, min) => `Most obvious answer: ${max}. Rarest: ${min}.`,
  },
};

/** Lists longer than this are folded around your answer until you ask for all of it. */
const FOLD_OVER = 12;

export function KrillionGame({ groupId, gameId, multiplier, revealAt }: GameProps) {
  const token = useToken();
  const start = useMutation(api.krillion.start);
  const answer = useMutation(api.krillion.answer);
  const [state, setState] = useState<State | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** The round whose ladder is showing, or null to play / see the total. */
  const [reveal, setReveal] = useState<number | null>(null);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    start({ token, gameId })
      .then((s) => {
        if (!cancelled) setState(s);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [token, gameId, start]);

  const leave = () => (router.canGoBack() ? router.back() : router.replace(`/g/${groupId}`));

  async function submit() {
    if (!token || !state || busy || state.finished || !text.trim()) return;
    const round = state.current;
    setBusy(true);
    setError(null);
    try {
      const s = await answer({ token, gameId, text });
      setState(s);
      setText("");
      if (s.rounds[round]?.status === "done") {
        Keyboard.dismiss();
        setReveal(round);
        if (s.last === "hit") haptics.success();
        else haptics.warning();
      } else {
        haptics.error();
        shake.value = withSequence(
          withTiming(-10, { duration: 50 }),
          withRepeat(withTiming(10, { duration: 80 }), 3, true),
          withTiming(0, { duration: 50 }),
        );
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const title = state ? COPY[state.mode].name : "";

  if (loadError && !state) {
    return (
      <Screen place="blur" back title={title} backTo={`/g/${groupId}`}>
        <EmptyState emoji="😵" title="Couldn't start the round" body={loadError}>
          <Button label="Back to the group" onPress={leave} />
        </EmptyState>
      </Screen>
    );
  }

  if (!state) {
    return (
      <Screen place="blur" back backTo={`/g/${groupId}`}>
        <Loading label="Shuffling the categories…" />
      </Screen>
    );
  }

  const copy = COPY[state.mode];
  const total = state.rounds.length;
  const showing = reveal ?? Math.min(state.current, total - 1);
  const subtitle =
    reveal === null && state.finished ? "All three categories done" : `Category ${showing + 1} of ${total}`;

  return (
    <Screen place="blur" back title={copy.name} subtitle={subtitle} backTo={`/g/${groupId}`}>
      <View style={styles.twist}>
        <Text style={styles.twistEmoji}>{copy.emoji}</Text>
        <Txt variant="caption" color={colors.muted} style={styles.grow}>
          {copy.twist}
        </Txt>
      </View>

      <RoundTrack rounds={state.rounds} focus={showing} />

      {reveal !== null ? (
        <RevealView
          key={reveal}
          index={reveal}
          round={state.rounds[reveal]}
          mode={state.mode}
          multiplier={multiplier}
          nextLabel={state.finished ? "See your total" : "Next category"}
          onNext={() => setReveal(null)}
        />
      ) : !state.finished ? (
        <PlayView
          key={state.current}
          index={state.current}
          total={total}
          round={state.rounds[state.current]}
          maxStrikes={state.maxStrikes}
          hint={copy.hint(state.rounds[state.current].maxPoints, state.minPoints)}
          text={text}
          onText={(t) => {
            setText(t);
            if (error) setError(null);
          }}
          onSubmit={submit}
          busy={busy}
          error={error}
          shakeStyle={shakeStyle}
        />
      ) : (
        <SealedResult
          testID="krillion-result"
          backTestID="back-to-group"
          groupId={groupId}
          gameId={gameId}
          points={state.points ?? 0}
          multiplier={multiplier}
          revealAt={revealAt}
          onBack={leave}
        >
          <Txt variant="overline" color={colors.muted}>
            Your answers
          </Txt>
          <View style={styles.summary}>
            {state.rounds.map((r, i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`${r.prompt}: ${r.myAnswer ?? "no answer"}, ${r.points ?? 0} points. Show the list.`}
                onPress={() => setReveal(i)}
                style={({ pressed }) => [styles.summaryRow, pressed && styles.pressed]}
              >
                <View style={styles.grow}>
                  <Txt variant="caption" color={colors.muted} numberOfLines={1}>
                    {r.prompt}
                  </Txt>
                  <Txt variant="heading" color={r.myAnswer ? colors.ink : colors.muted} numberOfLines={1}>
                    {r.myAnswer ?? "Three strikes"}
                  </Txt>
                </View>
                <Text style={[styles.mono, { color: r.points ? colors.accent : colors.muted }]}>
                  {r.points ? `+${r.points}` : "0"}
                </Text>
              </Pressable>
            ))}
          </View>
          <Txt variant="caption" color={colors.muted}>
            Tap a category to see its list.
          </Txt>
        </SealedResult>
      )}
    </Screen>
  );
}

/** Three slots across the top: what each category scored, which one is live. */
function RoundTrack({ rounds, focus }: { rounds: Round[]; focus: number }) {
  return (
    <View style={styles.track} accessibilityRole="summary">
      {rounds.map((r, i) => {
        const done = r.status === "done";
        const label = done ? (r.points ? `+${r.points}` : "0") : r.status === "open" ? "Now" : "—";
        return (
          <View
            key={i}
            style={[styles.slot, done && styles.slotDone, i === focus && styles.slotFocus]}
            accessible
            accessibilityLabel={`Category ${i + 1}: ${done ? `${r.points ?? 0} points` : r.status === "open" ? "playing now" : "still to come"}`}
          >
            <Txt variant="overline" color={colors.muted}>
              {`Cat. ${i + 1}`}
            </Txt>
            <Text style={[styles.mono, { color: done && r.points ? colors.accent : colors.ink }]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function PlayView({
  index,
  total,
  round,
  maxStrikes,
  hint,
  text,
  onText,
  onSubmit,
  busy,
  error,
  shakeStyle,
}: {
  index: number;
  total: number;
  round: Round;
  maxStrikes: number;
  hint: string;
  text: string;
  onText: (t: string) => void;
  onSubmit: () => void;
  busy: boolean;
  error: string | null;
  shakeStyle: ReturnType<typeof useAnimatedStyle>;
}) {
  const left = maxStrikes - round.strikes;
  return (
    <>
      <Card tone="soft" style={styles.promptCard}>
        <Txt variant="overline" color={colors.accent}>
          {`Category ${index + 1} of ${total} · up to ${round.maxPoints}`}
        </Txt>
        <Txt variant="display" align="center" style={styles.prompt} accessibilityRole="header">
          {round.prompt}
        </Txt>
        <View style={styles.pips} accessible accessibilityLabel={`${left} ${left === 1 ? "try" : "tries"} left`}>
          {Array.from({ length: maxStrikes }, (_, i) => (
            <View key={i} style={[styles.pip, i < round.strikes && styles.pipStruck]}>
              {i < round.strikes ? <Text style={styles.pipX}>✕</Text> : null}
            </View>
          ))}
        </View>
      </Card>

      <Animated.View style={[styles.answerRow, shakeStyle]}>
        <View style={styles.grow}>
          <Field
            testID="krillion-field"
            value={text}
            onChangeText={onText}
            placeholder="Your answer"
            accessibilityLabel="Your answer"
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={60}
            returnKeyType="go"
            submitBehavior="submit"
            onSubmitEditing={onSubmit}
          />
        </View>
        <Button testID="krillion-submit" label="Submit" onPress={onSubmit} loading={busy} disabled={!text.trim()} />
      </Animated.View>

      {round.misses.length > 0 ? (
        <View style={styles.misses}>
          {round.misses.map((m, i) => (
            <Pill key={i} tone="badSoft" label={`✕ ${m}`} />
          ))}
          <Txt variant="caption" color={colors.bad}>
            {left === 1 ? "Not on the list. Last try." : `Not on the list. ${left} tries left.`}
          </Txt>
        </View>
      ) : (
        <Txt variant="caption" color={colors.muted} align="center">
          {hint} Typos are forgiven.
        </Txt>
      )}
      {error ? (
        <Txt color={colors.bad} align="center">
          {error}
        </Txt>
      ) : null}
    </>
  );
}

function RevealView({
  index,
  round,
  mode,
  multiplier,
  nextLabel,
  onNext,
}: {
  index: number;
  round: Round;
  mode: Mode;
  multiplier: number;
  nextLabel: string;
  onNext: () => void;
}) {
  const reduced = useReducedMotion();
  const list = round.list ?? [];
  const mine = list.findIndex((r) => r.mine);
  const pop = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    pop.value = withDelay(120, withSpring(1, { damping: 10, stiffness: 170, mass: 0.7 }));
  }, [pop, reduced]);
  const popStyle = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{ scale: 0.6 + 0.4 * pop.value }],
  }));

  return (
    <>
      <Card tone="soft" style={styles.revealCard}>
        <Txt variant="overline" color={colors.muted}>
          {`Category ${index + 1}`}
        </Txt>
        <Txt variant="title" align="center">
          {round.prompt}
        </Txt>
        {round.myAnswer ? (
          <>
            <Txt variant="caption" color={colors.muted}>
              You said
            </Txt>
            <Txt variant="display" align="center" style={styles.myAnswer}>
              {round.myAnswer}
            </Txt>
            <Animated.View style={[styles.earned, popStyle]}>
              <Text style={styles.earnedPoints}>{`+${round.points ?? 0}`}</Text>
              {multiplier > 1 ? <Pill label={`×${multiplier} today`} tone="soft" /> : null}
            </Animated.View>
            <Txt color={colors.muted} align="center">
              {verdict(mode, mine, list.length)}
            </Txt>
          </>
        ) : (
          <>
            <Txt variant="display" align="center" color={colors.bad} style={styles.myAnswer}>
              Three strikes
            </Txt>
            <Txt color={colors.muted} align="center">
              Nothing this round. Here's what was on the list.
            </Txt>
          </>
        )}
      </Card>

      <Ladder list={list} mode={mode} mine={mine} reduced={reduced} />

      <Button testID="krillion-next" label={nextLabel} onPress={onNext} />
    </>
  );
}

/** A line about where your answer landed on the list. */
function verdict(mode: Mode, rank: number, size: number): string {
  const place = size <= 1 ? 0 : rank / (size - 1);
  if (mode === "rare") {
    if (place >= 0.8) return "A deep cut. Hardly anyone goes there.";
    if (place >= 0.45) return "Off the beaten path. Nicely done.";
    if (place >= 0.15) return "A fairly popular pick.";
    return "That's what everyone says.";
  }
  if (place <= 0.1) return "Great minds. That's the crowd's favourite.";
  if (place <= 0.35) return "Close to the crowd.";
  if (place <= 0.7) return "A bit of an outlier.";
  return "Nobody else is thinking that.";
}

type LadderRow = { kind: "rung"; rank: number; rung: Rung } | { kind: "gap"; hidden: number; at: number };

/** Ranks to show when a long list is folded: the top, the bottom and around your answer. */
function foldedRows(list: Rung[], mine: number): LadderRow[] {
  const keep = new Set<number>();
  const n = list.length;
  for (const i of [0, 1, 2, n - 3, n - 2, n - 1]) keep.add(i);
  for (let i = mine - 2; i <= mine + 2; i++) keep.add(i);
  const rows: LadderRow[] = [];
  let hidden = 0;
  list.forEach((rung, rank) => {
    if (keep.has(rank)) {
      if (hidden) rows.push({ kind: "gap", hidden, at: rank });
      hidden = 0;
      rows.push({ kind: "rung", rank, rung });
    } else hidden++;
  });
  return rows;
}

function Ladder({ list, mode, mine, reduced }: { list: Rung[]; mode: Mode; mine: number; reduced: boolean }) {
  const [all, setAll] = useState(list.length <= FOLD_OVER);
  const rows: LadderRow[] = all ? list.map((rung, rank) => ({ kind: "rung", rank, rung })) : foldedRows(list, mine);
  const n = list.length;
  return (
    <Card style={styles.ladder}>
      <View style={styles.ladderHead}>
        <Txt variant="overline" color={colors.muted}>
          Most said
        </Txt>
        <Txt variant="overline" color={colors.muted}>
          {mode === "rare" ? "Points ↓ grow" : "Points ↓ shrink"}
        </Txt>
      </View>
      {rows.map((row, i) =>
        row.kind === "gap" ? (
          <View key={`gap-${row.at}`} style={styles.gap}>
            <Txt variant="caption" color={colors.muted}>
              {`· · ·  ${row.hidden} more  · · ·`}
            </Txt>
          </View>
        ) : (
          <LadderRung key={row.rank} rank={row.rank} size={n} rung={row.rung} order={i} reduced={reduced} />
        ),
      )}
      <View style={styles.ladderHead}>
        <Txt variant="overline" color={colors.muted}>
          Rarest
        </Txt>
      </View>
      {!all ? (
        <Button variant="ghost" size="sm" label={`Show all ${n}`} onPress={() => setAll(true)} />
      ) : null}
    </Card>
  );
}

function LadderRung({
  rank,
  size,
  rung,
  order,
  reduced,
}: {
  rank: number;
  size: number;
  rung: Rung;
  order: number;
  reduced: boolean;
}) {
  const enter = useSharedValue(reduced ? 1 : 0);
  const glow = useSharedValue(reduced || !rung.mine ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    const delay = 250 + Math.min(order * 45, 900);
    enter.value = withDelay(delay, withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }));
    if (rung.mine) glow.value = withDelay(delay + 220, withSpring(1, { damping: 9, stiffness: 160 }));
  }, [enter, glow, order, reduced, rung.mine]);

  const style = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 10 }, { scale: rung.mine ? 0.94 + 0.06 * glow.value : 1 }],
  }));

  // The bar shows popularity: full width at the top of the list, a sliver at the bottom.
  const width = size <= 1 ? 100 : Math.round(100 - (rank / (size - 1)) * 82);
  return (
    <Animated.View
      style={[styles.rung, rung.mine && styles.rungMine, style]}
      accessible
      accessibilityLabel={`${rank + 1}. ${rung.name}, ${rung.points} points${rung.mine ? ", your answer" : ""}`}
    >
      <View style={[styles.bar, rung.mine && styles.barMine, { width: `${width}%` }]} />
      <Text style={[styles.rank, rung.mine && { color: colors.accent }]}>{rank + 1}</Text>
      <Txt
        variant={rung.mine ? "heading" : "body"}
        color={rung.mine ? colors.accent : colors.ink}
        numberOfLines={1}
        style={styles.grow}
      >
        {rung.name}
      </Txt>
      {rung.mine ? <Pill label="You" tone="primary" /> : null}
      <Text style={[styles.rungPoints, { color: rung.mine ? colors.accent : colors.muted }]}>{rung.points}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  pressed: { opacity: 0.8 },
  twist: { flexDirection: "row", alignItems: "center", gap: space(2) },
  twistEmoji: { fontSize: 22 },
  mono: { fontFamily: fonts.mono, fontSize: 15, lineHeight: 20, fontVariant: ["tabular-nums"] },
  track: { flexDirection: "row", gap: space(2) },
  slot: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: space(2),
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.sunken,
  },
  slotDone: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  slotFocus: { borderColor: colors.primary },
  promptCard: { alignItems: "center", paddingVertical: space(6) },
  prompt: { fontSize: 26, lineHeight: 34 },
  pips: { flexDirection: "row", gap: space(2), marginTop: space(1) },
  pip: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.fog,
    alignItems: "center",
    justifyContent: "center",
  },
  pipStruck: { backgroundColor: colors.badSoft, borderColor: colors.bad },
  pipX: { color: colors.bad, fontSize: 11, lineHeight: 13, fontFamily: fonts.heavy },
  answerRow: { flexDirection: "row", alignItems: "center", gap: space(2) },
  misses: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space(2) },
  revealCard: { alignItems: "center", gap: space(2), paddingVertical: space(6) },
  myAnswer: { fontSize: 28, lineHeight: 36 },
  earned: { flexDirection: "row", alignItems: "center", gap: space(2) },
  earnedPoints: {
    fontFamily: fonts.display,
    fontSize: 48,
    lineHeight: 56,
    color: colors.accent,
    fontVariant: ["tabular-nums"],
  },
  ladder: { gap: space(1.5) },
  ladderHead: { flexDirection: "row", justifyContent: "space-between" },
  gap: { alignItems: "center", paddingVertical: space(1) },
  rung: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(2.5),
    minHeight: 40,
    paddingHorizontal: space(3),
    borderRadius: radius.field - 2,
    borderWidth: 1,
    borderColor: "transparent",
    overflow: "hidden",
  },
  rungMine: { borderColor: colors.primary, minHeight: 48 },
  bar: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: colors.fog, opacity: 0.55 },
  barMine: { backgroundColor: colors.primarySoft, opacity: 1 },
  rank: { width: 22, fontFamily: fonts.mono, fontSize: 12, lineHeight: 16, color: colors.muted, textAlign: "right" },
  rungPoints: { minWidth: 26, fontFamily: fonts.mono, fontSize: 14, lineHeight: 18, textAlign: "right" },
  summary: { alignSelf: "stretch", gap: space(1), marginTop: space(1) },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    paddingVertical: space(2),
    paddingHorizontal: space(3),
    borderRadius: radius.field,
    backgroundColor: colors.sunken,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
