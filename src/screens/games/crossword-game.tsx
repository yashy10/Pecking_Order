import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { api } from "@convex/_generated/api";
import { SealedResult } from "@/components/sealed-result";
import { Button, EmptyState, Icon, IconButton, Loading, Pill, Screen, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, fonts, glass, layout, radius, space } from "@/theme";
import { errorMessage } from "@/utils/errors";
import * as haptics from "@/utils/haptics";
import { getItem, setItem } from "@/utils/storage";
import type { GameProps } from "./types";

// Owned by the crossword track. Mini Crossword: 5×5. The server sends the grid's shape and
// the clues, keeps the letters and the clock, and checks the grid. Typing is an on-screen
// keyboard so it behaves the same on iOS, Android and the web (plus a hardware keyboard on web).

const N = 5;
const CELLS = N * N;
const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const TICK_MS = 500;
// The puzzle scoring from convex/lib/games.ts, mirrored for the live chip.
const MAX_POINTS = 100;
const MIN_POINTS = 30;
const MS_PER_POINT = 2_000;
const CHECK_PENALTY = 5;

type Dir = "across" | "down";
type Clue = { num: number; clue: string; cells: number[] };
type Puzzle = { rows: string[]; numbers: number[]; clues: { across: Clue[]; down: Clue[] }; parMs: number };
type Result = { points: number; timeMs: number; solution: string[] };

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const storageKey = (gameId: string) => `crossword.${gameId}`;
const other = (d: Dir): Dir => (d === "across" ? "down" : "across");

export function CrosswordGame({ groupId, gameId, multiplier, revealAt }: GameProps) {
  const token = useToken();
  const start = useMutation(api.crossword.start);
  const checkGrid = useMutation(api.crossword.check);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [zeroAt, setZeroAt] = useState(0); // local time when elapsed was 0
  const [now, setNow] = useState(() => Date.now());
  const [letters, setLetters] = useState<string[]>(() => new Array<string>(CELLS).fill(""));
  const [cursor, setCursor] = useState(0);
  const [dir, setDir] = useState<Dir>("across");
  const [wrong, setWrong] = useState<Set<number>>(() => new Set());
  const [checks, setChecks] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastChecked = useRef("");
  const { width: winW, height: winH } = useWindowDimensions();

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    start({ token, gameId })
      .then(async (r) => {
        const saved = r.finished ? null : await getItem(storageKey(gameId));
        if (cancelled) return;
        const shape = r.rows.join("");
        setPuzzle({ rows: r.rows, numbers: r.numbers, clues: r.clues, parMs: r.parMs });
        setZeroAt(Date.now() - r.elapsedMs);
        setNow(Date.now());
        setChecks(r.checks);
        if (r.finished && r.solution) {
          setLetters([...r.solution.join("")].map((ch) => (ch === "#" ? "" : ch)));
          setResult({ points: r.points ?? 0, timeMs: r.elapsedMs, solution: r.solution });
          return;
        }
        if (saved && saved.length === CELLS) {
          setLetters([...saved].map((ch, i) => (shape[i] !== "#" && /^[A-Z]$/.test(ch) ? ch : "")));
        }
        const first = r.clues.across[0] ?? r.clues.down[0];
        if (first) {
          setDir(r.clues.across[0] ? "across" : "down");
          setCursor(first.cells[0]);
        }
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
    void setItem(storageKey(gameId), letters.map((ch) => ch || ".").join(""));
  }, [letters, puzzle, result, gameId]);

  /** For each cell, the index of its across and down clue (-1 for none). */
  const owner = useMemo(() => {
    const map = { across: new Array<number>(CELLS).fill(-1), down: new Array<number>(CELLS).fill(-1) };
    if (!puzzle) return map;
    (["across", "down"] as const).forEach((d) =>
      puzzle.clues[d].forEach((clue, k) => clue.cells.forEach((i) => (map[d][i] = k))),
    );
    return map;
  }, [puzzle]);

  /** Every clue in order, across first: the order the arrows step through. */
  const order = useMemo(
    () =>
      puzzle
        ? [
            ...puzzle.clues.across.map((_, k) => ({ dir: "across" as Dir, k })),
            ...puzzle.clues.down.map((_, k) => ({ dir: "down" as Dir, k })),
          ]
        : [],
    [puzzle],
  );

  const isOpen = (i: number) => puzzle !== null && puzzle.rows.join("")[i] !== "#";
  const activeK = owner[dir][cursor];
  const active: Clue | undefined = puzzle && activeK >= 0 ? puzzle.clues[dir][activeK] : undefined;
  const full = puzzle !== null && letters.every((ch, i) => !isOpen(i) || ch !== "");

  function gridString(values: string[]): string {
    const shape = puzzle?.rows.join("") ?? "";
    return values.map((ch, i) => (shape[i] === "#" ? "#" : ch || " ")).join("");
  }

  async function check(values: string[]) {
    if (!token || busy || result || !puzzle) return;
    const grid = gridString(values);
    lastChecked.current = grid;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const r = await checkGrid({ token, gameId, letters: grid });
      if (r.finished) {
        const solution = puzzle.rows.map((row, ri) =>
          [...row].map((ch, ci) => (ch === "#" ? "#" : values[ri * N + ci])).join(""),
        );
        setResult({ points: r.points ?? 0, timeMs: Date.now() - zeroAt, solution });
        if (r.solved) haptics.success();
      } else {
        setWrong(new Set(r.wrongCells));
        setChecks((c) => c + 1);
        setNote(
          r.wrongCells.length === 0
            ? "Everything so far is right."
            : `${r.wrongCells.length} square${r.wrongCells.length === 1 ? " is" : "s are"} wrong.`,
        );
        if (r.wrongCells.length > 0) haptics.error();
        else haptics.warning();
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  // A full grid checks itself, once per version of the grid.
  useEffect(() => {
    if (!puzzle || result || busy || !full) return;
    if (gridString(letters) !== lastChecked.current) void check(letters);
  });

  function select(i: number) {
    if (!puzzle || result || !isOpen(i)) return;
    if (i === cursor) {
      if (owner[other(dir)][i] >= 0) setDir(other(dir));
      return;
    }
    setCursor(i);
    if (owner[dir][i] < 0) setDir(other(dir));
  }

  function goToClue(step: number) {
    if (!puzzle || order.length === 0) return;
    const at = Math.max(0, order.findIndex((o) => o.dir === dir && o.k === activeK));
    const next = order[(at + step + order.length) % order.length];
    const cells = puzzle.clues[next.dir][next.k].cells;
    setDir(next.dir);
    setCursor(cells.find((i) => !letters[i]) ?? cells[0]);
  }

  function type(letter: string) {
    if (!puzzle || result || !active || !isOpen(cursor)) return;
    haptics.tap();
    const next = [...letters];
    next[cursor] = letter;
    setLetters(next);
    clearWrong(cursor);
    const pos = active.cells.indexOf(cursor);
    if (pos < active.cells.length - 1) setCursor(active.cells[pos + 1]);
    else goToClue(1);
  }

  function erase() {
    if (!puzzle || result || !active) return;
    haptics.tap();
    const next = [...letters];
    let at = cursor;
    if (!next[at]) {
      const pos = active.cells.indexOf(cursor);
      if (pos > 0) at = active.cells[pos - 1];
    }
    next[at] = "";
    setLetters(next);
    setCursor(at);
    clearWrong(at);
  }

  function clearWrong(i: number) {
    if (!wrong.has(i)) return;
    const next = new Set(wrong);
    next.delete(i);
    setWrong(next);
  }

  function step(d: Dir, delta: number) {
    if (!puzzle) return;
    if (d !== dir && owner[d][cursor] >= 0) {
      setDir(d);
      return;
    }
    const dr = d === "down" ? delta : 0;
    const dc = d === "across" ? delta : 0;
    let r = Math.floor(cursor / N);
    let c = cursor % N;
    for (let n = 0; n < N; n++) {
      r += dr;
      c += dc;
      if (r < 0 || r >= N || c < 0 || c >= N) return;
      if (isOpen(r * N + c)) {
        setCursor(r * N + c);
        return;
      }
    }
  }

  useWebKeys((e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[a-zA-Z]$/.test(e.key)) type(e.key.toUpperCase());
    else if (e.key === "Backspace" || e.key === "Delete") erase();
    else if (e.key === "Tab" || e.key === "Enter") goToClue(e.shiftKey ? -1 : 1);
    else if (e.key === " ") select(cursor);
    else if (e.key === "ArrowLeft") step("across", -1);
    else if (e.key === "ArrowRight") step("across", 1);
    else if (e.key === "ArrowUp") step("down", -1);
    else if (e.key === "ArrowDown") step("down", 1);
    else return;
    e.preventDefault();
  }, Boolean(puzzle && !result));

  const leave = () => (router.canGoBack() ? router.back() : router.replace(`/g/${groupId}`));

  if (error && !puzzle) {
    return (
      <Screen place="blur" back title="Mini Crossword" backTo={`/g/${groupId}`}>
        <EmptyState emoji="😵" title="Couldn't start the puzzle" body={error}>
          <Button label="Back to the group" onPress={leave} />
        </EmptyState>
      </Screen>
    );
  }

  if (!puzzle) {
    return (
      <Screen place="blur" back title="Mini Crossword" backTo={`/g/${groupId}`}>
        <Loading label="Inking the grid…" />
      </Screen>
    );
  }

  const elapsed = result ? result.timeMs : Math.max(0, now - zeroAt);
  const livePoints = Math.max(
    MIN_POINTS,
    MAX_POINTS - Math.floor(Math.max(0, elapsed - puzzle.parMs) / MS_PER_POINT) - CHECK_PENALTY * checks,
  );
  const contentW = Math.min(winW, layout.maxWidth) - layout.gutter * 2;
  const size = Math.floor(Math.min(360, contentW, Math.max(220, winH - 440)));
  const activeCells = new Set(active?.cells ?? []);

  if (result) {
    return (
      <Screen place="blur" back title="Mini Crossword" subtitle="Solved" backTo={`/g/${groupId}`}>
        <SealedResult
          testID="crossword-result"
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
          <View style={styles.solvedGrid}>
            <Grid
              size={Math.min(200, size)}
              shape={puzzle.rows.join("")}
              numbers={puzzle.numbers}
              letters={[...result.solution.join("")].map((ch) => (ch === "#" ? "" : ch))}
            />
          </View>
        </SealedResult>
      </Screen>
    );
  }

  return (
    <Screen place="blur" back title="Mini Crossword" subtitle={`Five by five. Par ${clock(puzzle.parMs)}.`} backTo={`/g/${groupId}`}>
      <View style={styles.stack}>
        <View style={styles.status}>
          <View style={styles.timer} accessibilityLabel={`Time ${clock(elapsed)}`}>
            <Txt variant="heading" tabular>
              {clock(elapsed)}
            </Txt>
            <View style={styles.pointsChip} accessibilityLiveRegion="polite" accessibilityLabel={`${livePoints} points available`}>
              <Txt variant="heading" tabular color={colors.accent}>
                {livePoints}
              </Txt>
              <Txt variant="caption" color={colors.muted}>
                pts
              </Txt>
            </View>
          </View>
          <Button
            testID="crossword-check"
            label="Check · −5"
            variant="tonal"
            size="sm"
            loading={busy}
            disabled={letters.every((ch) => !ch)}
            onPress={() => void check(letters)}
          />
        </View>

        <Grid
          size={size}
          shape={puzzle.rows.join("")}
          numbers={puzzle.numbers}
          letters={letters}
          cursor={cursor}
          activeCells={activeCells}
          wrong={wrong}
          onPress={select}
        />

        {note || checks > 0 ? (
          <View style={styles.noteRow}>
            {checks > 0 ? <Pill label={`−${CHECK_PENALTY * checks}`} tone="badSoft" /> : null}
            {note ? (
              <Txt variant="caption" color={wrong.size > 0 ? colors.bad : colors.good} style={styles.grow}>
                {note}
              </Txt>
            ) : null}
          </View>
        ) : null}

        <View style={styles.clueBar}>
          <IconButton icon="back" label="Previous clue" onPress={() => goToClue(-1)} color={colors.accent} />
          <Pressable
            style={styles.clueText}
            onPress={() => select(cursor)}
            accessibilityRole="button"
            accessibilityLabel={active ? `${active.num} ${dir}: ${active.clue}. Tap to switch direction.` : "Clue"}
          >
            <Txt variant="label" numberOfLines={2}>
              <Text style={styles.clueNum}>{active ? `${active.num}${dir === "across" ? "A" : "D"}` : ""}</Text>
              {active ? `  ${active.clue}` : ""}
            </Txt>
          </Pressable>
          <IconButton icon="chevron" label="Next clue" onPress={() => goToClue(1)} color={colors.accent} />
        </View>

        <Keyboard width={contentW} onLetter={type} onErase={erase} />

        {error ? <Txt color={colors.bad}>{error}</Txt> : null}

        <View style={styles.clueLists}>
          {(["across", "down"] as const).map((d) => (
            <View key={d} style={styles.clueList}>
              <Txt variant="overline" color={colors.muted}>
                {d === "across" ? "Across" : "Down"}
              </Txt>
              {puzzle.clues[d].map((clue, k) => {
                const on = d === dir && k === activeK;
                return (
                  <Pressable
                    key={clue.num}
                    accessibilityRole="button"
                    accessibilityLabel={`${clue.num} ${d}: ${clue.clue}`}
                    onPress={() => {
                      setDir(d);
                      setCursor(clue.cells.find((i) => !letters[i]) ?? clue.cells[0]);
                    }}
                    style={[styles.clueRow, on && styles.clueRowOn]}
                  >
                    <Text style={styles.clueListNum}>{clue.num}</Text>
                    <Txt variant="caption" color={on ? colors.ink : colors.muted} style={styles.grow}>
                      {clue.clue}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

type GridProps = {
  size: number;
  shape: string;
  numbers: number[];
  letters: string[];
  cursor?: number;
  activeCells?: Set<number>;
  wrong?: Set<number>;
  onPress?: (i: number) => void;
};

function Grid({ size, shape, numbers, letters, cursor, activeCells, wrong, onPress }: GridProps) {
  const cell = (size - 4) / N;
  return (
    <View style={[styles.grid, { width: size, height: size }]} accessibilityLabel="Crossword grid">
      {Array.from({ length: N }, (_, r) => (
        <View key={r} style={styles.row}>
          {Array.from({ length: N }, (_, c) => {
            const i = r * N + c;
            const lines = [c < N - 1 && styles.lineRight, r < N - 1 && styles.lineBottom];
            if (shape[i] === "#") {
              return <View key={c} style={[styles.black, { width: cell, height: cell }, ...lines]} />;
            }
            const isCursor = cursor === i;
            const inWord = activeCells?.has(i) ?? false;
            const bad = wrong?.has(i) ?? false;
            const ink = isCursor ? colors.primaryInk : bad ? colors.bad : colors.ink;
            return (
              <Pressable
                key={c}
                testID={`crossword-cell-${i}`}
                disabled={!onPress}
                onPress={() => onPress?.(i)}
                accessibilityRole={onPress ? "button" : undefined}
                accessibilityLabel={`${numbers[i] ? `${numbers[i]}, ` : ""}${letters[i] || "blank"}${bad ? ", wrong" : ""}`}
                accessibilityState={onPress ? { selected: isCursor } : undefined}
                style={[
                  styles.cell,
                  { width: cell, height: cell },
                  ...lines,
                  inWord && styles.inWord,
                  bad && styles.badCell,
                  isCursor && styles.cursor,
                ]}
              >
                {numbers[i] ? (
                  <Text
                    style={[
                      styles.num,
                      { fontSize: Math.max(8, cell * 0.2), lineHeight: Math.max(10, cell * 0.24) },
                      { color: isCursor ? colors.primaryInk : colors.muted },
                    ]}
                  >
                    {numbers[i]}
                  </Text>
                ) : null}
                <Text style={[styles.letter, { fontSize: cell * 0.5, lineHeight: cell * 0.62, color: ink }]}>
                  {letters[i]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Keyboard({ width, onLetter, onErase }: { width: number; onLetter: (l: string) => void; onErase: () => void }) {
  const gap = space(1.5);
  const keyW = Math.floor((width - gap * 9) / 10);
  return (
    <View style={[styles.keyboard, { width }]}>
      {KEY_ROWS.map((row, ri) => (
        <View key={row} style={[styles.keyRow, { gap }]}>
          {[...row].map((l) => (
            <Pressable
              key={l}
              testID={`crossword-key-${l}`}
              accessibilityRole="button"
              accessibilityLabel={l}
              onPress={() => onLetter(l)}
              style={({ pressed }) => [styles.key, { width: keyW }, pressed && styles.keyPressed]}
            >
              <Text style={styles.keyText}>{l}</Text>
            </Pressable>
          ))}
          {ri === KEY_ROWS.length - 1 ? (
            <Pressable
              testID="crossword-key-erase"
              accessibilityRole="button"
              accessibilityLabel="Delete"
              onPress={onErase}
              style={({ pressed }) => [styles.key, { width: keyW * 1.5 + gap / 2 }, pressed && styles.keyPressed]}
            >
              <Icon name="back" size={20} color={colors.ink} />
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

type KeyEvt = { key: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey: boolean; preventDefault(): void };
type KeyTarget = {
  addEventListener(type: "keydown", fn: (e: KeyEvt) => void): void;
  removeEventListener(type: "keydown", fn: (e: KeyEvt) => void): void;
};

/** A hardware keyboard on the web. Phones use the on-screen keys. */
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

const styles = StyleSheet.create({
  stack: { alignItems: "center", gap: space(3) },
  status: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timer: { flexDirection: "row", alignItems: "center", gap: space(3) },
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
    borderWidth: 2,
    borderColor: colors.brassDim,
    borderRadius: radius.tile,
    overflow: "hidden",
    backgroundColor: colors.bg,
  },
  row: { flexDirection: "row" },
  cell: { alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  black: { backgroundColor: colors.ink },
  lineRight: { borderRightWidth: 1, borderRightColor: colors.border },
  lineBottom: { borderBottomWidth: 1, borderBottomColor: colors.border },
  inWord: { backgroundColor: colors.primarySoft },
  badCell: { backgroundColor: colors.badSoft },
  cursor: { backgroundColor: colors.primary },
  num: { position: "absolute", top: 2, left: 4, fontFamily: fonts.mono, includeFontPadding: false },
  letter: { fontFamily: fonts.title, textAlign: "center", includeFontPadding: false, marginTop: 4 },
  solvedGrid: { marginTop: space(3) },
  noteRow: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: space(2) },
  clueBar: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingHorizontal: space(1),
    borderRadius: radius.field,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: glass.brassEdge,
  },
  clueText: { flex: 1, paddingVertical: space(2), paddingHorizontal: space(1) },
  clueNum: { fontFamily: fonts.mono, color: colors.accent },
  keyboard: { gap: space(2), alignItems: "center" },
  keyRow: { flexDirection: "row", justifyContent: "center" },
  key: {
    height: 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  keyPressed: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  keyText: { fontSize: 17, fontFamily: fonts.bold, color: colors.ink },
  clueLists: { alignSelf: "stretch", gap: space(4), marginTop: space(2) },
  clueList: { gap: space(1) },
  clueRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space(3),
    paddingVertical: space(1.5),
    paddingHorizontal: space(2),
    borderRadius: radius.field,
  },
  clueRowOn: { backgroundColor: colors.raised },
  clueListNum: { width: 20, fontFamily: fonts.mono, fontSize: 13, lineHeight: 18, color: colors.accent },
  grow: { flex: 1 },
});
