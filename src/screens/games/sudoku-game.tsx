import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { api } from "@convex/_generated/api";
import { SealedResult } from "@/components/sealed-result";
import { Button, EmptyState, Loading, Pill, Screen, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, fonts, glass, layout, radius, space } from "@/theme";
import { errorMessage } from "@/utils/errors";
import * as haptics from "@/utils/haptics";
import { getItem, setItem } from "@/utils/storage";
import type { GameProps } from "./types";

// Owned by the sudoku track. Mini Sudoku: 6×6, digits 1–6, boxes of 2 rows × 3 columns.
// The server keeps the clock and the solution. The screen spots clashes as you go and
// submits by itself once all 36 squares are filled without one.

const N = 6;
const CELLS = N * N;
const DIGITS = ["1", "2", "3", "4", "5", "6"];
const TICK_MS = 500;
// The puzzle scoring from convex/lib/games.ts, mirrored for the live chip.
const MAX_POINTS = 100;
const MIN_POINTS = 30;
const MS_PER_POINT = 2_000;
const CHECK_PENALTY = 5;

type Puzzle = { givens: string; parMs: number };
type Result = { points: number; timeMs: number };

/** Every row, column and 2×3 box, as cell indexes. */
const UNITS: number[][] = (() => {
  const units: number[][] = [];
  for (let r = 0; r < N; r++) units.push(DIGITS.map((_, c) => r * N + c));
  for (let c = 0; c < N; c++) units.push(DIGITS.map((_, r) => r * N + c));
  for (let br = 0; br < N; br += 2)
    for (let bc = 0; bc < N; bc += 3) {
      const box: number[] = [];
      for (let r = br; r < br + 2; r++) for (let c = bc; c < bc + 3; c++) box.push(r * N + c);
      units.push(box);
    }
  return units;
})();

const boxOf = (i: number) => Math.floor(Math.floor(i / N) / 2) * 2 + Math.floor((i % N) / 3);

function conflicts(values: string[]): Set<number> {
  const bad = new Set<number>();
  for (const unit of UNITS) {
    const seen = new Map<string, number[]>();
    for (const i of unit) {
      if (!values[i]) continue;
      seen.set(values[i], [...(seen.get(values[i]) ?? []), i]);
    }
    for (const list of seen.values()) if (list.length > 1) list.forEach((i) => bad.add(i));
  }
  return bad;
}

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const storageKey = (gameId: string) => `sudoku.${gameId}`;

export function SudokuGame({ groupId, gameId, multiplier, revealAt }: GameProps) {
  const token = useToken();
  const start = useMutation(api.sudoku.start);
  const submitGrid = useMutation(api.sudoku.submit);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [zeroAt, setZeroAt] = useState(0); // local time when elapsed was 0
  const [now, setNow] = useState(() => Date.now());
  const [entries, setEntries] = useState<string[]>(() => new Array<string>(CELLS).fill(""));
  const [selected, setSelected] = useState<number | null>(null);
  const [wrong, setWrong] = useState<Set<number>>(() => new Set());
  const [misses, setMisses] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSubmitted = useRef("");
  const { width: winW, height: winH } = useWindowDimensions();

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    start({ token, gameId })
      .then(async (r) => {
        let restored: string[] | null = null;
        if (r.finished && r.solution) restored = [...r.solution];
        else {
          const saved = await getItem(storageKey(gameId));
          if (saved && saved.length === CELLS) restored = [...saved].map((ch) => (DIGITS.includes(ch) ? ch : ""));
        }
        if (cancelled) return;
        const givens = r.givens;
        setPuzzle({ givens, parMs: r.parMs });
        setZeroAt(Date.now() - r.elapsedMs);
        setNow(Date.now());
        if (restored) setEntries(restored.map((ch, i) => (givens[i] !== "." ? givens[i] : ch)));
        else setEntries([...givens].map((ch) => (ch === "." ? "" : ch)));
        if (r.finished) setResult({ points: r.points ?? 0, timeMs: r.elapsedMs });
        else setSelected(givens.indexOf("."));
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [token, gameId, start]);

  useEffect(() => {
    if (!puzzle || result) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [puzzle, result]);

  // Keep progress on this device, so a refresh doesn't wipe the grid (the clock keeps running anyway).
  useEffect(() => {
    if (!puzzle || result) return;
    void setItem(storageKey(gameId), entries.map((ch) => ch || ".").join(""));
  }, [entries, puzzle, result, gameId]);

  const clashes = useMemo(() => conflicts(entries), [entries]);
  const full = entries.every(Boolean);

  async function submit(grid: string) {
    if (!token || busy || result) return;
    lastSubmitted.current = grid;
    setBusy(true);
    setError(null);
    try {
      const r = await submitGrid({ token, gameId, grid });
      if (r.finished) {
        setResult({ points: r.points ?? 0, timeMs: Date.now() - zeroAt });
        setSelected(null);
        if (r.solved) haptics.success();
      } else {
        setWrong(new Set(r.wrongCells));
        setMisses((m) => m + 1);
        haptics.error();
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  // All 36 filled and nothing clashes: that's the solution, so send it.
  useEffect(() => {
    if (!puzzle || result || busy || !full || clashes.size > 0) return;
    const grid = entries.join("");
    if (grid !== lastSubmitted.current) void submit(grid);
  });

  function place(digit: string) {
    if (!puzzle || result || selected === null || puzzle.givens[selected] !== ".") return;
    haptics.tap();
    setEntries((prev) => {
      const next = [...prev];
      next[selected] = digit;
      return next;
    });
    if (wrong.has(selected)) {
      const next = new Set(wrong);
      next.delete(selected);
      setWrong(next);
    }
  }

  function move(dr: number, dc: number) {
    const from = selected ?? 0;
    const r = (Math.floor(from / N) + dr + N) % N;
    const c = ((from % N) + dc + N) % N;
    setSelected(r * N + c);
  }

  useWebKeys((e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (DIGITS.includes(e.key)) place(e.key);
    else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") place("");
    else if (e.key === "ArrowUp") move(-1, 0);
    else if (e.key === "ArrowDown") move(1, 0);
    else if (e.key === "ArrowLeft") move(0, -1);
    else if (e.key === "ArrowRight") move(0, 1);
    else return;
    e.preventDefault();
  }, Boolean(puzzle && !result));

  const leave = () => (router.canGoBack() ? router.back() : router.replace(`/g/${groupId}`));

  if (error && !puzzle) {
    return (
      <Screen back title="Mini Sudoku" backTo={`/g/${groupId}`}>
        <EmptyState emoji="😵" title="Couldn't start the puzzle" body={error}>
          <Button label="Back to the group" onPress={leave} />
        </EmptyState>
      </Screen>
    );
  }

  if (!puzzle) {
    return (
      <Screen back title="Mini Sudoku" backTo={`/g/${groupId}`}>
        <Loading label="Setting out the grid…" />
      </Screen>
    );
  }

  const elapsed = result ? result.timeMs : Math.max(0, now - zeroAt);
  const livePoints = Math.max(
    MIN_POINTS,
    MAX_POINTS - Math.floor(Math.max(0, elapsed - puzzle.parMs) / MS_PER_POINT) - CHECK_PENALTY * misses,
  );
  const contentW = Math.min(winW, layout.maxWidth) - layout.gutter * 2;
  const size = Math.floor(Math.min(360, contentW, Math.max(240, winH - 360)));
  const cell = (size - 4) / N;
  const selectedValue = selected !== null ? entries[selected] : "";
  const placed = (d: string) => entries.filter((x) => x === d).length;

  return (
    <Screen
      back
      title="Mini Sudoku"
      subtitle={result ? "Solved" : "1 to 6 in every row, column and box"}
      backTo={`/g/${groupId}`}
    >
      {result ? (
        <SealedResult
          testID="sudoku-result"
          backTestID="back-to-group"
          groupId={groupId}
          gameId={gameId}
          points={result.points}
          multiplier={multiplier}
          revealAt={revealAt}
          onBack={leave}
        >
          <Txt variant="overline" color={colors.good}>
            Solved in
          </Txt>
          <Txt variant="display" align="center" tabular>
            {clock(result.timeMs)}
          </Txt>
        </SealedResult>
      ) : (
        <View style={styles.stack}>
          <View style={styles.status}>
            <View style={styles.timer} accessibilityLabel={`Time ${clock(elapsed)}`}>
              <Txt variant="heading" tabular>
                {clock(elapsed)}
              </Txt>
              <Txt variant="caption" color={colors.muted}>
                par {clock(puzzle.parMs)}
              </Txt>
            </View>
            <View style={styles.pointsChip} accessibilityLiveRegion="polite" accessibilityLabel={`${livePoints} points available`}>
              <Txt variant="heading" tabular color={colors.accent}>
                {livePoints}
              </Txt>
              <Txt variant="caption" color={colors.muted}>
                pts
              </Txt>
            </View>
          </View>

          <View style={[styles.grid, { width: size, height: size }]} accessibilityLabel="Sudoku grid">
            {Array.from({ length: N }, (_, r) => (
              <View key={r} style={styles.row}>
                {Array.from({ length: N }, (_, c) => {
                  const i = r * N + c;
                  const given = puzzle.givens[i] !== ".";
                  const value = entries[i];
                  const isSel = selected === i;
                  const peer =
                    selected !== null &&
                    !isSel &&
                    (Math.floor(selected / N) === r || selected % N === c || boxOf(selected) === boxOf(i));
                  const same = !isSel && value !== "" && value === selectedValue;
                  const bad = clashes.has(i) || wrong.has(i);
                  return (
                    <Pressable
                      key={c}
                      testID={`sudoku-cell-${i}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Row ${r + 1}, column ${c + 1}, ${value || "blank"}${given ? ", given" : ""}`}
                      accessibilityState={{ selected: isSel }}
                      onPress={() => setSelected(i)}
                      style={[
                        styles.cell,
                        { width: cell, height: cell },
                        c < N - 1 && (c === 2 ? styles.boxRight : styles.lineRight),
                        r < N - 1 && (r === 1 || r === 3 ? styles.boxBottom : styles.lineBottom),
                        peer && styles.peer,
                        same && styles.same,
                        bad && styles.badCell,
                        isSel && styles.selected,
                      ]}
                    >
                      {isSel ? <View pointerEvents="none" style={styles.ring} /> : null}
                      <Text
                        style={[
                          styles.digit,
                          { fontSize: cell * 0.5, lineHeight: cell * 0.62 },
                          { color: bad ? colors.bad : given ? colors.ink : colors.accent },
                        ]}
                      >
                        {value}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={[styles.pad, { width: size }]}>
            {DIGITS.map((d) => {
              const done = placed(d) >= N;
              return (
                <Pressable
                  key={d}
                  testID={`sudoku-key-${d}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Place ${d}`}
                  onPress={() => place(d)}
                  style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                >
                  <Text style={[styles.keyDigit, done && styles.keyDone]}>{d}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={[styles.padFoot, { width: size }]}>
            <View style={styles.footNote}>
              {misses > 0 ? <Pill label={`−${CHECK_PENALTY * misses}`} tone="badSoft" /> : null}
              <Txt variant="caption" color={busy ? colors.accent : colors.muted} style={styles.grow}>
                {busy
                  ? "Checking…"
                  : full && clashes.size > 0
                    ? "Something clashes. Look for the red."
                    : "Checks itself when the grid is full."}
              </Txt>
            </View>
            <Button
              testID="sudoku-erase"
              label="Erase"
              variant="secondary"
              size="sm"
              onPress={() => place("")}
              disabled={selected === null || puzzle.givens[selected] !== "." || !entries[selected]}
            />
          </View>
          {error ? <Txt color={colors.bad}>{error}</Txt> : null}
        </View>
      )}
    </Screen>
  );
}

type KeyEvt = { key: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey: boolean; preventDefault(): void };
type KeyTarget = {
  addEventListener(type: "keydown", fn: (e: KeyEvt) => void): void;
  removeEventListener(type: "keydown", fn: (e: KeyEvt) => void): void;
};

/** A hardware keyboard on the web. Phones use the on-screen pad. */
function useWebKeys(handler: (e: KeyEvt) => void, active: boolean) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    if (Platform.OS !== "web" || !active) return;
    const target = globalThis as unknown as Partial<KeyTarget>;
    if (!target.addEventListener || !target.removeEventListener) return;
    const on = (e: KeyEvt) => ref.current(e);
    target.addEventListener("keydown", on);
    return () => target.removeEventListener?.("keydown", on);
  }, [active]);
}

const THIN = 1;
const THICK = 2;

const styles = StyleSheet.create({
  stack: { alignItems: "center", gap: space(4) },
  status: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timer: { flexDirection: "row", alignItems: "baseline", gap: space(2) },
  pointsChip: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    paddingHorizontal: space(3),
    paddingVertical: space(1),
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: glass.brassEdge,
  },
  grid: {
    borderWidth: THICK,
    borderColor: colors.brassDim,
    borderRadius: radius.tile,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  row: { flexDirection: "row" },
  cell: { alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  lineRight: { borderRightWidth: THIN, borderRightColor: colors.border },
  boxRight: { borderRightWidth: THICK, borderRightColor: colors.brassDim },
  lineBottom: { borderBottomWidth: THIN, borderBottomColor: colors.border },
  boxBottom: { borderBottomWidth: THICK, borderBottomColor: colors.brassDim },
  peer: { backgroundColor: colors.raised },
  same: { backgroundColor: colors.accentSoft },
  badCell: { backgroundColor: colors.badSoft },
  selected: { backgroundColor: colors.primarySoft },
  ring: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderWidth: 2, borderColor: colors.primary },
  digit: { fontFamily: fonts.display, textAlign: "center", includeFontPadding: false },
  pad: { flexDirection: "row", gap: space(1.5) },
  key: {
    flex: 1,
    height: 52,
    borderRadius: radius.field,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  keyPressed: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  keyDigit: { fontFamily: fonts.display, fontSize: 22, color: colors.ink, includeFontPadding: false },
  keyDone: { color: colors.muted },
  padFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space(2) },
  footNote: { flex: 1, flexDirection: "row", alignItems: "center", gap: space(2) },
  grow: { flex: 1 },
});
