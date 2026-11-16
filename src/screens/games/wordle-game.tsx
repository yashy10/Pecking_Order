import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { api } from "@convex/_generated/api";
import { SealedResult } from "@/components/sealed-result";
import { Button, EmptyState, Loading, Pill, Screen, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, fonts, radius, space } from "@/theme";
import { errorMessage } from "@/utils/errors";
import * as haptics from "@/utils/haptics";
import type { GameProps } from "./types";

// Owned by the wordle track. The server marks every guess and keeps the word; this screen
// types, flips tiles and colours the keyboard. Tiles turn emerald (right spot), brass
// (in the word, wrong spot) or fog (not in the word).

type State = FunctionReturnType<typeof api.wordle.start>;
type Mark = State["rows"][number]["marks"][number];

const LENGTH = 5;
const FLIP_MS = 320;
const STAGGER_MS = 260;
/** Time for a whole row to finish flipping. */
const ROW_MS = STAGGER_MS * (LENGTH - 1) + FLIP_MS;

const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "+zxcvbnm-"]; // + Enter, - Backspace
const RANK: Record<Mark, number> = { miss: 1, near: 2, hit: 3 };
const MARK_WORDS: Record<Mark, string> = { hit: "right spot", near: "in the word", miss: "not in the word" };

const TILE: Record<Mark, { bg: string; ink: string; border: string }> = {
  hit: { bg: colors.goodFill, ink: colors.primaryInk, border: colors.goodFill },
  near: { bg: colors.primary, ink: colors.primaryInk, border: colors.primary },
  miss: { bg: colors.fog, ink: colors.ink, border: colors.fog },
};

export function WordleGame({ groupId, gameId, multiplier, revealAt }: GameProps) {
  const token = useToken();
  const reduced = useReducedMotion();
  const start = useMutation(api.wordle.start);
  const guess = useMutation(api.wordle.guess);
  const [state, setState] = useState<State | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** The result card waits until the last row has flipped. */
  const [showResult, setShowResult] = useState(false);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    start({ token, gameId })
      .then((s) => {
        if (cancelled) return;
        setState(s);
        if (s.finished) setShowResult(true);
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [token, gameId, start]);

  // A message fades on its own after a moment.
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(null), 2200);
    return () => clearTimeout(id);
  }, [message]);

  const rejected = useCallback(
    (text: string) => {
      setMessage(text);
      haptics.error();
      shake.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withRepeat(withTiming(10, { duration: 80 }), 3, true),
        withTiming(0, { duration: 50 }),
      );
    },
    [shake],
  );

  const playing = state !== null && !state.finished && !busy;

  const submit = useCallback(async () => {
    if (!token || !state || state.finished || busy) return;
    if (typed.length < LENGTH) {
      rejected("Not enough letters");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const s = await guess({ token, gameId, word: typed });
      setState(s);
      setTyped("");
      if (s.finished) {
        const wait = reduced ? 0 : ROW_MS + 200;
        setTimeout(() => {
          if (s.won) haptics.success();
          else haptics.warning();
          setShowResult(true);
        }, wait);
      }
    } catch (e) {
      rejected(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [token, state, busy, typed, guess, gameId, reduced, rejected]);

  const press = useCallback(
    (key: string) => {
      if (!playing) return;
      if (key === "+") void submit();
      else if (key === "-") setTyped((t) => t.slice(0, -1));
      else setTyped((t) => (t.length < LENGTH ? t + key : t));
    },
    [playing, submit],
  );

  // A hardware keyboard on the web.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter") press("+");
      else if (e.key === "Backspace") press("-");
      else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toLowerCase());
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  const leave = () => (router.canGoBack() ? router.back() : router.replace(`/g/${groupId}`));

  if (error && !state) {
    return (
      <Screen place="blur" back title="Wordle" backTo={`/g/${groupId}`}>
        <EmptyState emoji="😵" title="Couldn't start the round" body={error}>
          <Button label="Back to the group" onPress={leave} />
        </EmptyState>
      </Screen>
    );
  }

  if (!state) {
    return (
      <Screen place="blur" back title="Wordle" backTo={`/g/${groupId}`}>
        <Loading label="Picking today's word…" />
      </Screen>
    );
  }

  // Best mark per letter, for the keyboard.
  const keyMarks = new Map<string, Mark>();
  for (const row of state.rows) {
    row.marks.forEach((m, i) => {
      const letter = row.guess[i];
      const had = keyMarks.get(letter);
      if (!had || RANK[m] > RANK[had]) keyMarks.set(letter, m);
    });
  }

  const used = state.rows.length;
  const solved = state.won;
  const subtitle = state.finished ? "Round over" : `Guess ${Math.min(used + 1, state.maxGuesses)} of ${state.maxGuesses}`;

  return (
    <Screen place="blur" back title="Wordle" subtitle={subtitle} backTo={`/g/${groupId}`}>
      {!state.finished ? (
        <View style={styles.hintRow}>
          <Pill label={`Solve now for ${(state.nextPoints ?? 0) * multiplier}`} tone="soft" />
          <Txt variant="caption" color={colors.muted}>
            {state.maxGuesses - used === 1 ? "Last guess" : `${state.maxGuesses - used} guesses left`}
          </Txt>
        </View>
      ) : null}

      <View style={styles.board} accessibilityLabel="Guesses">
        {Array.from({ length: state.maxGuesses }, (_, r) => {
          const row = state.rows[r];
          const isCurrent = !state.finished && r === used;
          const letters = row ? row.guess : isCurrent ? typed : "";
          // The same element for every row, so tiles keep their state and flip in place
          // when the current row's guess comes back.
          return (
            <Animated.View key={r} style={[styles.row, isCurrent ? shakeStyle : null]}>
              {Array.from({ length: LENGTH }, (_, c) => (
                <Tile
                  key={c}
                  letter={letters[c] ?? ""}
                  mark={row?.marks[c]}
                  delay={c * STAGGER_MS}
                  reduced={reduced}
                />
              ))}
            </Animated.View>
          );
        })}
      </View>

      <View style={styles.messageSlot} accessibilityLiveRegion="polite">
        {message ? (
          <View style={styles.toast}>
            <Txt variant="label" color={colors.onInk}>
              {message}
            </Txt>
          </View>
        ) : null}
      </View>

      {state.finished ? (
        showResult ? (
          <SealedResult
            testID="wordle-result"
            backTestID="back-to-group"
            groupId={groupId}
            gameId={gameId}
            points={state.points ?? 0}
            multiplier={multiplier}
            revealAt={revealAt}
            onBack={leave}
          >
            <Txt variant="overline" color={solved ? colors.good : colors.muted}>
              {solved ? `Solved in ${used} of ${state.maxGuesses}` : "Out of guesses. The word was"}
            </Txt>
            <Txt variant="display" align="center" style={styles.answer}>
              {(state.answer ?? "").toUpperCase()}
            </Txt>
          </SealedResult>
        ) : null
      ) : (
        <Keyboard marks={keyMarks} onKey={press} disabled={!playing} busy={busy} />
      )}
    </Screen>
  );
}

/** One letter tile. It flips to its colour when a mark arrives, unless it mounted with one. */
function Tile({ letter, mark, delay, reduced }: { letter: string; mark?: Mark; delay: number; reduced: boolean }) {
  const flip = useSharedValue(mark ? 1 : 0);
  const pop = useSharedValue(1);
  const [shown, setShown] = useState<Mark | undefined>(mark);

  useEffect(() => {
    if (!mark) {
      flip.value = 0;
      setShown(undefined);
      return;
    }
    if (flip.value >= 1) {
      setShown(mark);
      return;
    }
    if (reduced) {
      flip.value = 1;
      setShown(mark);
      return;
    }
    flip.value = withDelay(delay, withTiming(1, { duration: FLIP_MS }));
    // The colour swaps while the tile is edge-on.
    const id = setTimeout(() => setShown(mark), delay + FLIP_MS / 2);
    return () => clearTimeout(id);
  }, [mark, delay, reduced, flip]);

  useEffect(() => {
    if (!letter || mark || reduced) return;
    pop.value = withSequence(withTiming(1.1, { duration: 70 }), withTiming(1, { duration: 90 }));
  }, [letter, mark, reduced, pop]);

  const style = useAnimatedStyle(() => {
    const half = flip.value < 0.5 ? flip.value : 1 - flip.value;
    return { transform: [{ perspective: 500 }, { rotateX: `${half * 180}deg` }, { scale: pop.value }] };
  });

  const look = shown ? TILE[shown] : null;
  return (
    <Animated.View
      accessible
      accessibilityLabel={letter ? `${letter.toUpperCase()}${shown ? `, ${MARK_WORDS[shown]}` : ""}` : "empty"}
      style={[
        styles.tile,
        letter && !look ? styles.tileTyped : null,
        look ? { backgroundColor: look.bg, borderColor: look.border } : null,
        style,
      ]}
    >
      <Text style={[styles.tileLetter, { color: look ? look.ink : colors.ink }]}>{letter.toUpperCase()}</Text>
    </Animated.View>
  );
}

function Keyboard({
  marks,
  onKey,
  disabled,
  busy,
}: {
  marks: Map<string, Mark>;
  onKey: (key: string) => void;
  disabled: boolean;
  busy: boolean;
}) {
  return (
    <View style={styles.keyboard}>
      {KEY_ROWS.map((row) => (
        <View key={row} style={styles.keyRow}>
          {row.split("").map((k) => {
            const wide = k === "+" || k === "-";
            const mark = marks.get(k);
            const look = mark === "hit" ? styles.keyHit : mark === "near" ? styles.keyNear : mark === "miss" ? styles.keyMiss : null;
            const ink = mark === "hit" || mark === "near" ? colors.primaryInk : mark === "miss" ? colors.muted : colors.ink;
            const label = k === "+" ? "Enter" : k === "-" ? "Delete" : k.toUpperCase();
            return (
              <Pressable
                key={k}
                testID={k === "+" ? "wordle-enter" : k === "-" ? "wordle-delete" : `key-${k}`}
                accessibilityRole="button"
                accessibilityLabel={mark ? `${label}, ${MARK_WORDS[mark]}` : label}
                accessibilityState={{ disabled, busy: k === "+" && busy }}
                disabled={disabled}
                onPress={() => {
                  haptics.tap();
                  onKey(k);
                }}
                style={({ pressed }) => [styles.key, wide && styles.keyWide, look, pressed && styles.keyPressed]}
              >
                {k === "+" ? (
                  <Txt variant="overline" color={ink}>
                    Enter
                  </Txt>
                ) : (
                  <Text style={[styles.keyLetter, { color: ink }]}>{k === "-" ? "⌫" : k.toUpperCase()}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hintRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space(2) },
  board: { gap: space(1.5), width: "100%", maxWidth: 320, alignSelf: "center" },
  row: { flexDirection: "row", gap: space(1.5) },
  tile: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.field - 4,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tileTyped: { borderColor: colors.ink, backgroundColor: colors.surface },
  tileLetter: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32 },
  messageSlot: { minHeight: 36, alignItems: "center", justifyContent: "center", marginVertical: -space(2) },
  toast: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: space(4),
    paddingVertical: space(1.5),
  },
  answer: { letterSpacing: 6 },
  keyboard: { gap: space(2), width: "100%" },
  keyRow: { flexDirection: "row", justifyContent: "center", gap: space(1.5) },
  key: {
    flex: 1,
    maxWidth: 44,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.raised,
  },
  keyWide: { flex: 1.6, maxWidth: 68 },
  keyHit: { backgroundColor: colors.goodFill, borderColor: colors.goodFill },
  keyNear: { backgroundColor: colors.primary, borderColor: colors.primary },
  keyMiss: { backgroundColor: colors.sunken, borderColor: colors.sunken },
  keyPressed: { opacity: 0.75 },
  keyLetter: { fontFamily: fonts.heavy, fontSize: 17, lineHeight: 22 },
});
