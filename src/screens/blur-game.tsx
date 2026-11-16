import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { SealedResult } from "@/components/sealed-result";
import { Button, EmptyState, Field, Loading, Pill, Screen, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, radius, space } from "@/theme";
import { BLUR_IMAGE_SOURCES } from "@/utils/blur-images";
import { errorMessage } from "@/utils/errors";
import * as haptics from "@/utils/haptics";

// Owned by Track B. Phase 0: working version. The server keeps the time and
// checks the guess; the screen only animates. Track B: polish per PLAN §8.

const BLUR_START = 50;
const TICK_MS = 500;

type Round = { imageKey: string; roundMs: number; hardStopMs: number };
type Result = { points: number; answer: string; correct: boolean };

type GameProps = {
  groupId: Id<"groups">;
  gameId: Id<"games">;
  multiplier: number;
  /** Automatic groups: when today's scores are revealed. */
  revealAt: number | null;
};

export function BlurGame({ groupId, gameId, multiplier, revealAt }: GameProps) {
  const token = useToken();
  const start = useMutation(api.blur.start);
  const guess = useMutation(api.blur.guess);
  const [round, setRound] = useState<Round | null>(null);
  const [zeroAt, setZeroAt] = useState(0); // local time when elapsed was 0
  const [now, setNow] = useState(() => Date.now());
  const [text, setText] = useState("");
  const [wrong, setWrong] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    start({ token, gameId })
      .then((r) => {
        if (cancelled) return;
        setRound({ imageKey: r.imageKey, roundMs: r.roundMs, hardStopMs: r.hardStopMs });
        setZeroAt(Date.now() - r.elapsedMs);
        setNow(Date.now());
        if (r.finished) setResult({ points: r.points ?? 0, answer: r.answer ?? "", correct: (r.points ?? 0) > 0 });
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [token, gameId, start]);

  useEffect(() => {
    if (!round || result) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [round, result]);

  const elapsed = round ? Math.max(0, now - zeroAt) : 0;
  const outOfTime = round !== null && elapsed >= round.hardStopMs;

  async function submit(value: string) {
    if (!token || busy || result) return;
    setBusy(true);
    setError(null);
    try {
      const r = await guess({ token, gameId, guess: value });
      if (r.finished) {
        setResult({ points: r.points ?? 0, answer: r.answer ?? "", correct: r.correct });
        if (r.correct) haptics.success();
        else haptics.warning();
      } else {
        setWrong((w) => w + 1);
        setText("");
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

  useEffect(() => {
    if (outOfTime && !result && !busy) void submit("");
  });

  const leave = () => (router.canGoBack() ? router.back() : router.replace(`/g/${groupId}`));

  if (error && !round) {
    return (
      <Screen place="blur" back title="Blur" backTo={`/g/${groupId}`}>
        <EmptyState emoji="😵" title="Couldn't start the round" body={error}>
          <Button label="Back to the group" onPress={leave} />
        </EmptyState>
      </Screen>
    );
  }

  if (!round) {
    return (
      <Screen place="blur" back title="Blur" backTo={`/g/${groupId}`}>
        <Loading label="Blurring today's photo…" />
      </Screen>
    );
  }

  const blurRadius = result ? 0 : Math.max(0, BLUR_START * (1 - elapsed / round.roundMs));
  const livePoints = Math.max(10, 100 - Math.floor(elapsed / 200) - 5 * wrong);
  const timeLeft = result ? 0 : Math.max(0, 1 - elapsed / round.hardStopMs);
  const source = BLUR_IMAGE_SOURCES[round.imageKey];

  return (
    <Screen place="blur"
      back
      title="Blur"
      subtitle={result ? "Round over" : "Guess before it sharpens"}
      backTo={`/g/${groupId}`}
    >
      <View style={styles.photoWrap}>
        <View style={styles.photoFrame}>
          {source ? (
            <Image
              source={source}
              blurRadius={blurRadius}
              style={styles.photo}
              contentFit="cover"
              transition={0}
              accessibilityLabel={result ? `Photo of ${result.answer}` : "A blurred photo"}
            />
          ) : (
            <View style={[styles.photo, styles.missing]} />
          )}
          {!result ? (
            <View style={styles.pointsChip} accessibilityLiveRegion="polite" accessibilityLabel={`${livePoints} points available`}>
              <Txt variant="heading" tabular>
                {livePoints}
              </Txt>
              <Txt variant="caption" color={colors.muted}>
                pts
              </Txt>
            </View>
          ) : null}
        </View>
        {!result ? (
          <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={[styles.fill, { width: `${timeLeft * 100}%` }]} />
          </View>
        ) : null}
      </View>

      {result ? (
        <SealedResult
          testID="blur-result"
          backTestID="back-to-group"
          groupId={groupId}
          gameId={gameId}
          points={result.points}
          multiplier={multiplier}
          revealAt={revealAt}
          onBack={leave}
        >
          <Txt variant="overline" color={result.correct ? colors.good : colors.muted}>
            {result.correct ? "You got it. It was" : "Out of time. It was"}
          </Txt>
          <Txt variant="display" align="center">
            {result.answer}
          </Txt>
        </SealedResult>
      ) : (
        <>
          <Animated.View style={[styles.guessRow, shakeStyle]}>
            <View style={styles.grow}>
              <Field
                testID="guess-field"
                value={text}
                onChangeText={setText}
                placeholder="What is it?"
                accessibilityLabel="Your guess"
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={60}
                returnKeyType="go"
                onSubmitEditing={() => text.trim() && submit(text)}
              />
            </View>
            <Button
              testID="guess-button"
              label="Guess"
              onPress={() => submit(text)}
              loading={busy}
              disabled={!text.trim()}
            />
          </Animated.View>
          {wrong > 0 ? (
            <View style={styles.wrongRow}>
              <Pill label={`−${5 * wrong}`} tone="badSoft" />
              <Txt variant="caption" color={colors.bad} style={styles.grow}>
                Not quite. Each wrong guess costs 5.
              </Txt>
            </View>
          ) : (
            <Txt variant="caption" color={colors.muted} align="center">
              One word is usually enough. Typos are forgiven.
            </Txt>
          )}
          {error ? <Txt color={colors.bad}>{error}</Txt> : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoWrap: { alignItems: "center", gap: space(2) },
  // Clip the blur to the square: a blurred photo bleeds into the cream background otherwise.
  photoFrame: {
    width: "100%",
    maxWidth: 400,
    borderRadius: radius.card,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  photo: { width: "100%", aspectRatio: 1 },
  missing: { backgroundColor: colors.fog },
  pointsChip: {
    position: "absolute",
    top: space(3),
    left: space(3),
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    paddingHorizontal: space(3),
    paddingVertical: space(1),
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  track: {
    width: "100%",
    maxWidth: 400,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.raised,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 3, backgroundColor: colors.ink },
  guessRow: { flexDirection: "row", alignItems: "center", gap: space(2) },
  grow: { flex: 1 },
  wrongRow: { flexDirection: "row", alignItems: "center", gap: space(2) },
});
