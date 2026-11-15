import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInRight, FlipInEasyX } from "react-native-reanimated";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Avatar, Button, Card, EmptyState, Icon, Loading, Pill, Screen, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, radius, space } from "@/theme";
import { errorMessage } from "@/utils/errors";
import * as haptics from "@/utils/haptics";

// Track C (built by the lead). One quote per card, four name chips, progress dots.
// After locking in, each card flips to show who really said it.

type Round = NonNullable<FunctionReturnType<typeof api.whoSaidIt.get>>;
type Result = NonNullable<Round["result"]>;

export function WhoSaidItGame({ groupId, gameId }: { groupId: Id<"groups">; gameId: Id<"games"> }) {
  const token = useToken();
  const round = useQuery(api.whoSaidIt.get, token ? { token, gameId } : "skip");
  const submit = useMutation(api.whoSaidIt.submit);
  const [picks, setPicks] = useState<Record<string, Id<"members">>>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leave = () => (router.canGoBack() ? router.back() : router.replace(`/g/${groupId}`));

  if (round === undefined) {
    return (
      <Screen back title="Who Said It" backTo={`/g/${groupId}`}>
        <Loading label="Shuffling yesterday's answers…" />
      </Screen>
    );
  }
  if (round === null || round.quotes.length === 0) {
    return (
      <Screen back title="Who Said It" backTo={`/g/${groupId}`}>
        <EmptyState
          emoji="🤷"
          title="Nothing to guess"
          body="Every quote in this round is yours, so there's nothing for you to guess today."
        >
          <Button label="Back to the group" onPress={leave} />
        </EmptyState>
      </Screen>
    );
  }

  const finished = result ?? round.result;
  if (finished) {
    return <Results round={round} result={finished} picks={picks} onDone={leave} />;
  }

  const quotes = round.quotes;
  const current = Math.min(index, quotes.length - 1);
  const quote = quotes[current];
  const pickedCount = quotes.filter((q) => picks[q.answerId]).length;
  const allPicked = pickedCount === quotes.length;

  function pick(memberId: Id<"members">) {
    haptics.tap();
    setPicks((p) => ({ ...p, [quote.answerId]: memberId }));
    if (current < quotes.length - 1) setTimeout(() => setIndex(current + 1), 220);
  }

  async function lockIn() {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await submit({
        token,
        gameId,
        picks: Object.entries(picks).map(([answerId, memberId]) => ({
          answerId: answerId as Id<"answers">,
          memberId,
        })),
      });
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
    <Screen
      back
      title="Who Said It"
      subtitle={`Quote ${current + 1} of ${quotes.length}`}
      backTo={`/g/${groupId}`}
    >
      <View style={styles.dots}>
        {quotes.map((q, i) => (
          <Pressable
            key={q.answerId}
            accessibilityRole="button"
            accessibilityLabel={`Quote ${i + 1}${picks[q.answerId] ? ", picked" : ""}`}
            hitSlop={8}
            onPress={() => setIndex(i)}
            style={[styles.dot, picks[q.answerId] && styles.dotPicked, i === current && styles.dotCurrent]}
          />
        ))}
      </View>

      <Animated.View key={quote.answerId} entering={FadeInRight.duration(250)}>
        <Card tone="soft" style={styles.quoteCard}>
          <Text style={styles.quoteMark}>“</Text>
          <Txt variant="title">{quote.text}</Txt>
          <Txt variant="overline" color={colors.muted}>
            Who said it?
          </Txt>
        </Card>
      </Animated.View>

      <View style={styles.grid}>
        {quote.options.map((o) => {
          const selected = picks[quote.answerId] === o.memberId;
          return (
            <Pressable
              key={o.memberId}
              testID="wsi-option"
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => pick(o.memberId)}
              accessibilityLabel={o.name}
              style={({ pressed }) => [styles.chip, selected && styles.chipOn, pressed && styles.chipPressed]}
            >
              <Avatar emoji={o.emoji} size={36} />
              <Txt variant="heading" numberOfLines={1} style={styles.chipName} color={selected ? colors.accent : colors.ink}>
                {o.name}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      {error ? <Txt color={colors.bad}>{error}</Txt> : null}
      {allPicked ? (
        <Button testID="wsi-lock-in" label="Lock in" onPress={lockIn} loading={busy} />
      ) : (
        <Txt variant="caption" color={colors.muted} align="center" tabular>
          {pickedCount} of {quotes.length} picked · tap the dots to go back
        </Txt>
      )}
    </Screen>
  );
}

function Results({
  round,
  result,
  picks,
  onDone,
}: {
  round: Round;
  result: Result;
  picks: Record<string, Id<"members">>;
  onDone: () => void;
}) {
  const byAnswer = new Map(result.reveal.map((r) => [r.answerId, r]));
  return (
    <Screen back title="Who Said It" subtitle="Round over">
      <Card testID="wsi-result" style={styles.resultHead}>
        <Txt variant="overline" color={colors.muted}>
          {result.correct} of {result.asked} right
        </Txt>
        <View style={styles.sealed}>
          <Icon name="lock" size={20} color={colors.primary} />
          <Txt variant="title" tabular>
            {result.points} points sealed
          </Txt>
        </View>
        <Txt color={colors.muted} align="center">
          Nobody sees scores until tonight's reveal.
        </Txt>
      </Card>
      {round.quotes.map((q, i) => {
        const author = byAnswer.get(q.answerId);
        const mine = picks[q.answerId];
        return (
          <Animated.View key={q.answerId} entering={FlipInEasyX.delay(i * 250).duration(450)}>
            <Card>
              <Txt variant="heading">“{q.text}”</Txt>
              <View style={styles.authorRow}>
                <Avatar emoji={author?.authorEmoji} size={32} />
                <Txt variant="label" color={colors.muted} style={styles.grow}>
                  {author?.authorName}
                </Txt>
                {mine ? (
                  <Pill
                    label={mine === author?.authorId ? "You got it" : "Missed"}
                    tone={mine === author?.authorId ? "goodSoft" : "badSoft"}
                  />
                ) : null}
              </View>
            </Card>
          </Animated.View>
        );
      })}
      <Button label="Back to the group" onPress={onDone} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: "row", justifyContent: "center", gap: space(2), paddingVertical: space(1) },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.fog },
  dotPicked: { backgroundColor: colors.primary },
  dotCurrent: { transform: [{ scale: 1.4 }] },
  quoteCard: { minHeight: 180, justifyContent: "center", gap: space(2), paddingVertical: space(6) },
  quoteMark: { fontSize: 56, lineHeight: 48, color: colors.primary, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  chip: {
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space(2),
    padding: space(3),
    minHeight: 60,
    borderRadius: radius.tile,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.09)",
    backgroundColor: "rgba(18, 22, 30, 0.82)",
  },
  chipOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipPressed: { transform: [{ scale: 0.98 }] },
  chipName: { flex: 1 },
  resultHead: { alignItems: "center" },
  sealed: { flexDirection: "row", alignItems: "center", gap: space(2) },
  authorRow: { flexDirection: "row", alignItems: "center", gap: space(2) },
  grow: { flex: 1 },
});
