import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FlipInEasyX, useReducedMotion, ZoomIn } from "react-native-reanimated";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { SealedResult } from "@/components/sealed-result";
import { Avatar, Button, Card, EmptyState, Icon, Loading, Pill, Screen, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { useNow } from "@/hooks/use-now";
import { colors, fonts, glass, radius, space } from "@/theme";
import { errorMessage } from "@/utils/errors";
import * as haptics from "@/utils/haptics";
import { SourceQuestion } from "./most-likely-game";
import type { GameProps } from "./types";

// Friends-games track. Match-Up: anonymised answers and the friends who wrote them. Tap an
// answer, then a friend (or the other way round) to pair them; re-pair freely; lock in.
// The clock runs on the server from `start`. A perfect match earns a speed bonus.

type Round = NonNullable<FunctionReturnType<typeof api.matchUp.get>>;
type Result = NonNullable<Round["result"]>;

const TITLE = "Match-Up";
const BONUS = 50;
const GRACE_S = 10;

/** Mirrors convex/lib/friends.ts: full bonus for ten seconds, then a point a second. */
function bonusAt(seconds: number): number {
  return Math.min(BONUS, Math.max(0, BONUS - Math.floor(seconds - GRACE_S)));
}

export function MatchUpGame({ groupId, gameId, multiplier, revealAt }: GameProps) {
  const token = useToken();
  const round = useQuery(api.matchUp.get, token ? { token, gameId } : "skip");
  const start = useMutation(api.matchUp.start);
  const submit = useMutation(api.matchUp.submit);
  /** Server time minus this device's time, so the on-screen clock matches the one that scores. */
  const [offset, setOffset] = useState<number | null>(null);
  const [pairs, setPairs] = useState<Record<string, Id<"members">>>({});
  const [selected, setSelected] = useState<Id<"answers"> | null>(null);
  const [held, setHeld] = useState<Id<"members"> | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = round?.status;
  const playing = status === "playing" && !result;
  const now = useNow(playing, 200);

  // Back mid-round (a refresh, a reopened app): line the clock up with the server again.
  useEffect(() => {
    if (!token || status !== "playing" || offset !== null) return;
    let live = true;
    start({ token, gameId })
      .then((r) => live && setOffset(r.now - Date.now()))
      .catch(() => live && setOffset(0));
    return () => {
      live = false;
    };
  }, [token, gameId, status, offset, start]);

  const leave = () => (router.canGoBack() ? router.back() : router.replace(`/g/${groupId}`));

  if (round === undefined) {
    return (
      <Screen back title={TITLE} backTo={`/g/${groupId}`}>
        <Loading label="Shuffling the answers…" />
      </Screen>
    );
  }
  if (round === null || round.size === 0) {
    return (
      <Screen back title={TITLE} backTo={`/g/${groupId}`}>
        <EmptyState
          emoji="🤷"
          title="Nothing to match"
          body="Too many of these answers are yours, so there's nothing for you to match today."
        >
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
        picks={pairs}
        onDone={leave}
      />
    );
  }
  if (round.status === "closed") {
    return (
      <Screen back title={TITLE} backTo={`/g/${groupId}`}>
        <EmptyState emoji="🌙" title="This round has closed" body="Catch the next one when it drops.">
          <Button label="Back to the group" onPress={leave} />
        </EmptyState>
      </Screen>
    );
  }

  async function begin() {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await start({ token, gameId });
      setOffset(r.now - Date.now());
      haptics.tap();
    } catch (e) {
      setError(errorMessage(e));
      haptics.error();
    } finally {
      setBusy(false);
    }
  }

  if (round.status === "ready" || round.answers.length === 0) {
    return (
      <Screen back title={TITLE} subtitle="Against the clock" backTo={`/g/${groupId}`}>
        <SourceQuestion askedWhen={round.askedWhen} question={round.question} />
        <Card style={styles.rules}>
          <Text style={styles.rulesEmoji}>🧩</Text>
          <Txt variant="title" align="center">
            {round.size} answers. {round.size} friends.
          </Txt>
          <Txt color={colors.muted} align="center">
            Pair each answer with the friend who wrote it. Every match counts, and a perfect set
            earns a speed bonus: the full {BONUS} if you lock in within {GRACE_S} seconds.
          </Txt>
          <Txt variant="caption" color={colors.muted} align="center">
            The clock starts when you tap Start.
          </Txt>
        </Card>
        {error ? <Txt color={colors.bad}>{error}</Txt> : null}
        <Button testID="mu-start" label="Start the clock" icon="hourglass" onPress={begin} loading={busy} />
      </Screen>
    );
  }

  const answers = round.answers;
  const friends = round.friends;
  const byId = new Map(friends.map((f) => [f.memberId, f]));
  const firstOpen = answers.find((a) => !pairs[a.answerId])?.answerId ?? null;
  const active = selected ?? (held ? null : firstOpen);
  const paired = answers.filter((a) => pairs[a.answerId]).length;
  const complete = paired === answers.length;
  const seconds = Math.max(0, (now + (offset ?? 0) - (round.startedAt ?? now)) / 1000);
  const bonus = bonusAt(seconds);

  function pair(answerId: Id<"answers">, memberId: Id<"members">) {
    haptics.tap();
    setPairs((p) => {
      const next: Record<string, Id<"members">> = {};
      for (const [a, m] of Object.entries(p)) if (m !== memberId) next[a] = m;
      next[answerId] = memberId;
      return next;
    });
    setSelected(null);
    setHeld(null);
  }

  function tapAnswer(answerId: Id<"answers">) {
    if (held) return pair(answerId, held);
    haptics.tap();
    setSelected(answerId);
  }

  function tapFriend(memberId: Id<"members">) {
    if (active) return pair(active, memberId);
    haptics.tap();
    setHeld(held === memberId ? null : memberId);
  }

  function unpair(answerId: Id<"answers">) {
    haptics.tap();
    setPairs((p) => {
      const next = { ...p };
      delete next[answerId];
      return next;
    });
    setSelected(answerId);
    setHeld(null);
  }

  async function lockIn() {
    if (!token || busy || !complete) return;
    setBusy(true);
    setError(null);
    try {
      const r = await submit({
        token,
        gameId,
        picks: Object.entries(pairs).map(([answerId, memberId]) => ({
          answerId: answerId as Id<"answers">,
          memberId,
        })),
      });
      setResult(r);
      if (r.correct === r.asked) haptics.success();
      else if (r.correct > 0) haptics.tap();
      else haptics.warning();
    } catch (e) {
      setError(errorMessage(e));
      haptics.error();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen back title={TITLE} subtitle={round.question} backTo={`/g/${groupId}`}>
      <View style={styles.clock} accessible accessibilityLabel={`${Math.floor(seconds)} seconds. Speed bonus ${bonus}.`}>
        <Icon name="hourglass" size={18} color={colors.accent} />
        <Text style={styles.clockTime}>{seconds.toFixed(1)}s</Text>
        <View style={styles.bonusTrack}>
          <View style={[styles.bonusFill, { width: `${(bonus / BONUS) * 100}%` }, bonus === 0 && styles.bonusGone]} />
        </View>
        <Pill label={bonus > 0 ? `Bonus +${bonus}` : "No bonus"} tone={bonus > 0 ? "soft" : "neutral"} />
      </View>

      <View style={styles.tray}>
        {friends.map((f) => {
          const used = Object.values(pairs).includes(f.memberId);
          const isHeld = held === f.memberId;
          return (
            <Pressable
              key={f.memberId}
              testID="mu-friend"
              accessibilityRole="button"
              accessibilityState={{ selected: isHeld }}
              accessibilityLabel={`${f.name}${used ? ", already paired" : ""}`}
              onPress={() => tapFriend(f.memberId)}
              style={({ pressed }) => [
                styles.friend,
                isHeld && styles.friendHeld,
                used && !isHeld && styles.friendUsed,
                pressed && styles.pressed,
              ]}
            >
              <Avatar emoji={f.emoji} size={40} />
              <Txt variant="caption" numberOfLines={1} align="center" color={isHeld ? colors.accent : colors.ink}>
                {f.name}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <Txt variant="caption" color={colors.muted} align="center">
        {held
          ? `Now tap what ${byId.get(held)?.name ?? "they"} wrote`
          : active
            ? "Who wrote the highlighted answer? Tap a friend."
            : "Tap an answer, then a friend."}
      </Txt>

      {answers.map((a, i) => {
        const who = pairs[a.answerId] ? byId.get(pairs[a.answerId]) : undefined;
        const isActive = active === a.answerId;
        return (
          <Animated.View key={a.answerId} entering={FadeInDown.delay(i * 80).duration(280)}>
            <Pressable
              testID="mu-answer"
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`“${a.text}”${who ? `, paired with ${who.name}` : ""}`}
              onPress={() => tapAnswer(a.answerId)}
              style={({ pressed }) => [styles.answer, isActive && styles.answerActive, pressed && styles.pressed]}
            >
              <Txt variant="heading" style={styles.grow}>
                “{a.text}”
              </Txt>
              {who ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Unpair ${who.name}`}
                  hitSlop={6}
                  onPress={() => unpair(a.answerId)}
                  style={styles.slotFilled}
                >
                  <Animated.View key={who.memberId} entering={ZoomIn.springify().damping(13)}>
                    <Avatar emoji={who.emoji} size={34} />
                  </Animated.View>
                  <Txt variant="caption" numberOfLines={1} style={styles.slotName}>
                    {who.name}
                  </Txt>
                  <Icon name="close" size={14} color={colors.muted} />
                </Pressable>
              ) : (
                <View style={[styles.slotEmpty, isActive && styles.slotEmptyActive]}>
                  <Txt variant="label" color={isActive ? colors.accent : colors.muted}>
                    ?
                  </Txt>
                </View>
              )}
            </Pressable>
          </Animated.View>
        );
      })}

      {error ? <Txt color={colors.bad}>{error}</Txt> : null}
      {complete ? (
        <Button testID="mu-lock-in" label="Lock in" onPress={lockIn} loading={busy} />
      ) : (
        <Txt variant="caption" color={colors.muted} align="center" tabular>
          {paired} of {answers.length} paired · tap a friend's face on an answer to undo
        </Txt>
      )}
    </Screen>
  );
}

// ---------------------------------------------------------------------------------------
// The reveal

const REVEAL_START = 1300; // after the sealed-points lock lands
const FLIP_STEP = 450;

function Results({
  groupId,
  gameId,
  multiplier,
  revealAt,
  round,
  result,
  picks,
  onDone,
}: {
  groupId: Id<"groups">;
  gameId: Id<"games">;
  multiplier: number;
  revealAt: number | null;
  round: Round;
  result: Result;
  picks: Record<string, Id<"members">>;
  onDone: () => void;
}) {
  const reduced = useReducedMotion();
  const byAnswer = new Map(result.reveal.map((r) => [r.answerId, r]));
  const names = new Map(round.friends.map((f) => [f.memberId as string, f.name]));
  const perfect = result.asked > 0 && result.correct === result.asked;

  useEffect(() => {
    if (reduced) return;
    const timers = result.reveal.map((r, i) =>
      setTimeout(() => (r.right ? haptics.tap() : undefined), REVEAL_START + i * FLIP_STEP + 300),
    );
    return () => timers.forEach(clearTimeout);
    // The reveal runs once, when the result first shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen back title={TITLE} subtitle="Round over" backTo={`/g/${groupId}`}>
      <SealedResult
        testID="mu-result"
        groupId={groupId}
        gameId={gameId}
        points={result.points}
        multiplier={multiplier}
        revealAt={revealAt}
        onBack={onDone}
      >
        <Txt variant="overline" color={colors.muted}>
          You matched
        </Txt>
        <Txt variant="display" align="center" tabular>
          {result.correct} of {result.asked}
        </Txt>
        <Txt variant="caption" color={perfect ? colors.accent : colors.muted} align="center" tabular>
          {perfect
            ? `Perfect in ${result.seconds}s${result.bonus > 0 ? ` · +${result.bonus} speed bonus` : ""}`
            : `in ${result.seconds}s`}
        </Txt>
      </SealedResult>

      <Txt variant="overline" color={colors.muted}>
        Who really wrote them
      </Txt>
      {round.answers.map((a, i) => {
        const r = byAnswer.get(a.answerId);
        if (!r) return null;
        const picked = r.pickedId ?? picks[a.answerId] ?? null;
        return (
          <Animated.View
            key={a.answerId}
            entering={reduced ? undefined : FlipInEasyX.delay(REVEAL_START + i * FLIP_STEP).duration(450)}
          >
            <Card style={[styles.revealCard, r.right ? styles.revealRight : styles.revealWrong]}>
              <Txt variant="heading">“{a.text}”</Txt>
              <View style={styles.authorRow}>
                <Avatar emoji={r.authorEmoji} size={34} />
                <Txt variant="label" style={styles.grow} numberOfLines={1}>
                  {r.authorName}
                </Txt>
                <Pill
                  label={r.right ? "Matched" : picked ? `You said ${names.get(picked) ?? "someone else"}` : "Missed"}
                  tone={r.right ? "goodSoft" : "badSoft"}
                />
              </View>
            </Card>
          </Animated.View>
        );
      })}
      <Button variant="secondary" label="Back to today" onPress={onDone} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  pressed: { transform: [{ scale: 0.98 }] },

  rules: { alignItems: "center", gap: space(2), paddingVertical: space(5) },
  rulesEmoji: { fontSize: 40 },

  clock: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(2),
    paddingHorizontal: space(3),
    paddingVertical: space(2),
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: glass.brassEdge,
    backgroundColor: glass.panelStrong,
  },
  clockTime: {
    minWidth: 58,
    fontFamily: fonts.mono,
    fontSize: 17,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  bonusTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.sunken, overflow: "hidden" },
  bonusFill: { height: "100%", borderRadius: 3, backgroundColor: colors.primary },
  bonusGone: { backgroundColor: colors.fog },

  tray: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space(2) },
  friend: {
    width: 76,
    alignItems: "center",
    gap: space(1),
    paddingVertical: space(2),
    paddingHorizontal: space(1),
    borderRadius: radius.tile,
    borderWidth: 1.5,
    borderColor: glass.edge,
    backgroundColor: glass.panel,
  },
  friendHeld: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  friendUsed: { opacity: 0.45 },

  answer: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    padding: space(4),
    minHeight: 76,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: glass.edge,
    backgroundColor: glass.panel,
  },
  answerActive: { borderColor: colors.primary, backgroundImage: glass.brassFill },
  slotEmpty: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  slotEmptyActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  slotFilled: { alignItems: "center", gap: 2, maxWidth: 72 },
  slotName: { maxWidth: 72 },

  revealCard: { gap: space(2), borderLeftWidth: 4 },
  revealRight: { borderLeftColor: colors.good },
  revealWrong: { borderLeftColor: colors.bad },
  authorRow: { flexDirection: "row", alignItems: "center", gap: space(2) },
});
