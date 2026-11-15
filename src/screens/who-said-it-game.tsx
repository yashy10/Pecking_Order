import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInRight, FlipInEasyX } from "react-native-reanimated";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Avatar, Button, Card, Loading, Pill, Screen, Txt } from "@/components/ui";
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
      <Screen back title="Who Said It">
        <Loading label="Shuffling yesterday's answers…" />
      </Screen>
    );
  }
  if (round === null || round.quotes.length === 0) {
    return (
      <Screen back title="Who Said It">
        <Card>
          <Txt>There's nothing for you to guess in this round.</Txt>
        </Card>
        <Button label="Back to the group" onPress={leave} />
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
    <Screen back title="Who Said It">
      <View style={styles.dots}>
        {quotes.map((q, i) => (
          <Pressable
            key={q.answerId}
            accessibilityLabel={`Quote ${i + 1}`}
            onPress={() => setIndex(i)}
            style={[styles.dot, picks[q.answerId] && styles.dotPicked, i === current && styles.dotCurrent]}
          />
        ))}
      </View>

      <Animated.View key={quote.answerId} entering={FadeInRight.duration(250)}>
        <Card tone="accent" style={styles.quoteCard}>
          <Txt variant="caption">WHO SAID IT?</Txt>
          <Txt variant="title">“{quote.text}”</Txt>
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
              style={[styles.chip, selected && styles.chipOn]}
            >
              <Avatar emoji={o.emoji} size={36} />
              <Txt style={styles.chipName} color={selected ? colors.primaryInk : colors.ink}>
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
        <Txt variant="caption" color={colors.muted} align="center">
          {pickedCount} of {quotes.length} picked
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
    <Screen back title="Who Said It">
      <Card testID="wsi-result">
        <Txt variant="title">🔒 {result.points} points sealed</Txt>
        <Txt color={colors.muted}>
          {result.correct} of {result.asked} right. Nobody sees scores until tonight's reveal.
        </Txt>
      </Card>
      {round.quotes.map((q, i) => {
        const author = byAnswer.get(q.answerId);
        const mine = picks[q.answerId];
        return (
          <Animated.View key={q.answerId} entering={FlipInEasyX.delay(i * 250).duration(450)}>
            <Card>
              <Txt>“{q.text}”</Txt>
              <View style={styles.authorRow}>
                <Avatar emoji={author?.authorEmoji} size={32} />
                <Txt style={styles.grow}>{author?.authorName}</Txt>
                {mine ? (
                  <Pill
                    label={mine === author?.authorId ? "you got it" : "missed"}
                    tone={mine === author?.authorId ? "good" : "bad"}
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
  dots: { flexDirection: "row", justifyContent: "center", gap: space(2) },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.fog },
  dotPicked: { backgroundColor: colors.primary },
  dotCurrent: { transform: [{ scale: 1.4 }] },
  quoteCard: { minHeight: 150, justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space(3) },
  chip: {
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space(2),
    padding: space(3),
    borderRadius: radius.field,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipName: { flex: 1, fontWeight: "800" },
  authorRow: { flexDirection: "row", alignItems: "center", gap: space(2) },
  grow: { flex: 1 },
});
