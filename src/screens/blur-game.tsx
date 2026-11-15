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
import { Button, Card, Field, Loading, Screen, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, radius } from "@/theme";
import { BLUR_IMAGE_SOURCES } from "@/utils/blur-images";
import { errorMessage } from "@/utils/errors";
import * as haptics from "@/utils/haptics";

// Owned by Track B. Phase 0: working version. The server keeps the time and
// checks the guess; the screen only animates. Track B: polish per PLAN §8.

const BLUR_START = 50;
const TICK_MS = 500;

type Round = { imageKey: string; roundMs: number; hardStopMs: number };
type Result = { points: number; answer: string; correct: boolean };

export function BlurGame({ groupId, gameId }: { groupId: Id<"groups">; gameId: Id<"games"> }) {
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
      <Screen back title="Blur">
        <Card>
          <Txt>{error}</Txt>
        </Card>
        <Button label="Back to the group" onPress={leave} />
      </Screen>
    );
  }

  if (!round) {
    return (
      <Screen back title="Blur">
        <Loading label="Blurring today's photo…" />
      </Screen>
    );
  }

  const blurRadius = result ? 0 : Math.max(0, BLUR_START * (1 - elapsed / round.roundMs));
  const livePoints = Math.max(10, 100 - Math.floor(elapsed / 200) - 5 * wrong);
  const source = BLUR_IMAGE_SOURCES[round.imageKey];

  return (
    <Screen back title="Blur">
      <View style={styles.photoWrap}>
        {source ? (
          <Image
            source={source}
            blurRadius={blurRadius}
            style={styles.photo}
            contentFit="cover"
            transition={0}
          />
        ) : (
          <View style={[styles.photo, styles.missing]} />
        )}
      </View>

      {result ? (
        <Card testID="blur-result">
          <Txt variant="caption" color={colors.muted}>
            {result.correct ? "YOU GOT IT. IT WAS" : "IT WAS"}
          </Txt>
          <Txt variant="display">{result.answer}</Txt>
          <Txt variant="title">🔒 {result.points} points sealed</Txt>
          <Txt color={colors.muted}>Nobody sees scores until tonight's reveal.</Txt>
          <Button testID="back-to-group" label="Back to the group" onPress={leave} />
        </Card>
      ) : (
        <>
          <Txt variant="title" align="center">
            {livePoints} points
          </Txt>
          <Animated.View style={shakeStyle}>
            <Field
              testID="guess-field"
              value={text}
              onChangeText={setText}
              placeholder="What is it?"
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={60}
              returnKeyType="go"
              onSubmitEditing={() => text.trim() && submit(text)}
            />
          </Animated.View>
          {wrong > 0 ? <Txt color={colors.bad}>Not quite. Each wrong guess costs 5.</Txt> : null}
          {error ? <Txt color={colors.bad}>{error}</Txt> : null}
          <Button
            testID="guess-button"
            label="Guess"
            onPress={() => submit(text)}
            loading={busy}
            disabled={!text.trim()}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoWrap: { alignItems: "center" },
  photo: { width: "100%", maxWidth: 360, aspectRatio: 1, borderRadius: radius.card },
  missing: { backgroundColor: colors.fog },
});
