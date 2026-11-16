import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Line, Polyline, Rect } from "react-native-svg";
import { api } from "@convex/_generated/api";
import { SealedResult } from "@/components/sealed-result";
import { Button, EmptyState, Loading, Pill, Screen, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, pipeColors, radius, space } from "@/theme";
import { errorMessage } from "@/utils/errors";
import * as haptics from "@/utils/haptics";
import type { GameProps } from "./types";

// Owned by the flow track. Connect each pair of dots with a pipe; pipes can't cross; fill
// every square. The server keeps the clock and checks the finished board; the screen only
// draws. Cells are numbered row by row: cell = row * size + column.

/**
 * One hue per colour, A to H. The theme has too few distinct colours for eight pipes, so
 * these live here: saturated, told apart on the obsidian board, and only ever used as pipes.
 */
const PIPE_COLORS = pipeColors;

const TICK_MS = 500;
const MAX_BOARD = 400;
/** Mirrors timedPuzzlePoints in convex/lib/games.ts, for the live chip only. */
const livePoints = (elapsed: number, par: number) => Math.max(30, 100 - Math.floor(Math.max(0, elapsed - par) / 2000));

type Dot = { color: number; ends: number[] };
type Board = { size: number; dots: Dot[]; parMs: number };
type Result = { points: number; elapsedMs: number };
type Drag = { color: number; base: number[][]; active: number[]; originX: number; originY: number };

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** A pipe joins its two dots. Pipes always start on a dot, so only the head needs checking. */
const isComplete = (path: number[], dot: Dot) => path.length >= 2 && dot.ends.includes(path[path.length - 1]);

/** The board while drawing: the pipe in hand, and every other pipe cut where it crosses it. */
function compose(base: number[][], color: number, active: number[]): number[][] {
  const taken = new Set(active);
  return base.map((p, i) => {
    if (i === color) return active;
    const k = p.findIndex((c) => taken.has(c));
    return k < 0 ? p : p.slice(0, k);
  });
}

export function FlowGame({ groupId, gameId, multiplier, revealAt }: GameProps) {
  const token = useToken();
  const start = useMutation(api.flow.start);
  const submit = useMutation(api.flow.submit);
  const [board, setBoard] = useState<Board | null>(null);
  const [paths, setPaths] = useState<number[][]>([]);
  const [zeroAt, setZeroAt] = useState(0); // local time when elapsed was 0
  const [now, setNow] = useState(() => Date.now());
  const [result, setResult] = useState<Result | null>(null);
  const [hand, setHand] = useState<number | null>(null); // the colour being drawn
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const drag = useRef<Drag | null>(null);
  const lastSent = useRef("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    start({ token, gameId })
      .then((r) => {
        if (cancelled) return;
        setBoard({ size: r.size, dots: r.dots, parMs: r.parMs });
        setPaths(r.dots.map(() => []));
        setZeroAt(Date.now() - r.elapsedMs);
        setNow(Date.now());
        if (r.finished) setResult({ points: r.points ?? 0, elapsedMs: r.elapsedMs });
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [token, gameId, start]);

  useEffect(() => {
    if (!board || result) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [board, result]);

  const size = board?.size ?? 0;
  const dots = useMemo(() => board?.dots ?? [], [board]);
  const dotOwner = useMemo(() => {
    const m = new Map<number, number>();
    for (const d of dots) for (const e of d.ends) m.set(e, d.color);
    return m;
  }, [dots]);

  const done = dots.filter((d, i) => isComplete(paths[i] ?? [], d)).length;
  const filled = paths.reduce((n, p) => n + (p.length >= 2 ? p.length : 0), 0);
  const total = size * size;
  const solved = board !== null && done === dots.length && filled === total;

  async function send(final: number[][]) {
    if (!token || busy || result) return;
    setBusy(true);
    setError(null);
    try {
      const r = await submit({ token, gameId, paths: final });
      if (r.finished) {
        setResult({ points: r.points ?? 0, elapsedMs: r.elapsedMs });
        if (r.solved) haptics.success();
      } else {
        setProblem(r.problem);
        haptics.warning();
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  // Every pipe joined and every square filled: check it with the server once the finger lifts.
  useEffect(() => {
    if (!solved || hand !== null || busy || result) return;
    const sig = JSON.stringify(paths);
    if (sig === lastSent.current) return;
    lastSent.current = sig;
    void send(paths);
  });

  // ---- Drawing -------------------------------------------------------------------------

  const boardPx = Math.floor(Math.min(area.width, area.height, MAX_BOARD));
  const cellPx = size ? boardPx / size : 0;

  function cellAt(x: number, y: number): number | null {
    if (!cellPx || x < 0 || y < 0 || x >= boardPx || y >= boardPx) return null;
    return Math.floor(y / cellPx) * size + Math.floor(x / cellPx);
  }

  /** Moves the pipe in hand one square. Returns false when that square is off limits. */
  function step(d: Drag, cell: number): boolean {
    const back = d.active.indexOf(cell);
    if (back >= 0) {
      d.active = d.active.slice(0, back + 1); // drawing back over your own pipe shortens it
      return true;
    }
    const head = d.active[d.active.length - 1];
    const dot = dots[d.color];
    const near =
      (Math.floor(head / size) === Math.floor(cell / size) && Math.abs(head - cell) === 1) ||
      Math.abs(head - cell) === size;
    if (!near || isComplete(d.active, dot)) return false;
    const owner = dotOwner.get(cell);
    if (owner !== undefined && owner !== d.color) return false;
    d.active = [...d.active, cell];
    if (owner === d.color) haptics.tap();
    return true;
  }

  function onGrant(e: GestureResponderEvent) {
    if (!board || result) return;
    const { locationX, locationY, pageX, pageY } = e.nativeEvent;
    const cell = cellAt(locationX, locationY);
    if (cell === null) return;
    let color = dotOwner.get(cell);
    let active: number[] = [cell];
    if (color === undefined) {
      color = paths.findIndex((p) => p.length >= 2 && p.includes(cell));
      if (color < 0) return; // an empty square: nothing to pick up
      active = paths[color].slice(0, paths[color].indexOf(cell) + 1);
    }
    const base = paths.map((p, i) => (i === color ? [] : p));
    // Measure moves against the board's own origin: locationX/Y is only reliable on the first touch.
    drag.current = { color, base, active, originX: pageX - locationX, originY: pageY - locationY };
    setProblem(null);
    setHand(color);
    setPaths(compose(base, color, active));
  }

  function onMove(e: GestureResponderEvent) {
    const d = drag.current;
    if (!d) return;
    const target = cellAt(e.nativeEvent.pageX - d.originX, e.nativeEvent.pageY - d.originY);
    if (target === null) return;
    const before = d.active;
    if (d.active.includes(target)) {
      step(d, target);
    } else {
      // A fast swipe can skip squares: walk toward the finger one square at a time.
      const tr = Math.floor(target / size);
      const tc = target % size;
      for (let guard = 0; guard < size * 2; guard++) {
        const head = d.active[d.active.length - 1];
        if (head === target) break;
        const hr = Math.floor(head / size);
        const hc = head % size;
        const next =
          Math.abs(tr - hr) >= Math.abs(tc - hc)
            ? head + Math.sign(tr - hr) * size
            : head + Math.sign(tc - hc);
        if (!step(d, next)) break;
      }
    }
    if (d.active !== before) setPaths(compose(d.base, d.color, d.active));
  }

  function onRelease() {
    if (!drag.current) return;
    drag.current = null;
    setHand(null);
  }

  function reset() {
    drag.current = null;
    setHand(null);
    setProblem(null);
    setPaths(dots.map(() => []));
  }

  function onArea(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setArea((a) => (a.width === width && a.height === height ? a : { width, height }));
  }

  const leave = () => (router.canGoBack() ? router.back() : router.replace(`/g/${groupId}`));

  // ---- Screens -------------------------------------------------------------------------

  if (error && !board) {
    return (
      <Screen back title="Flow" backTo={`/g/${groupId}`}>
        <EmptyState emoji="😵" title="Couldn't start the round" body={error}>
          <Button label="Back to the group" onPress={leave} />
        </EmptyState>
      </Screen>
    );
  }

  if (!board) {
    return (
      <Screen back title="Flow" backTo={`/g/${groupId}`}>
        <Loading label="Laying out the pipes…" />
      </Screen>
    );
  }

  if (result) {
    return (
      <Screen back title="Flow" subtitle="Round over" backTo={`/g/${groupId}`}>
        <SealedResult
          testID="flow-result"
          backTestID="back-to-group"
          groupId={groupId}
          gameId={gameId}
          points={result.points}
          multiplier={multiplier}
          revealAt={revealAt}
          onBack={leave}
        >
          <Txt variant="overline" color={result.points > 0 ? colors.good : colors.muted}>
            {result.points > 0 ? "Every pipe connected in" : "Round over"}
          </Txt>
          <Txt variant="display" align="center" tabular>
            {clock(result.elapsedMs)}
          </Txt>
        </SealedResult>
      </Screen>
    );
  }

  const elapsed = Math.max(0, now - zeroAt);
  const points = livePoints(elapsed, board.parMs);
  const underPar = elapsed < board.parMs;
  const percent = Math.floor((filled / total) * 100);
  const head = hand !== null ? (paths[hand]?.[paths[hand].length - 1] ?? null) : null;
  const center = (cell: number) => ({
    x: (cell % size) * cellPx + cellPx / 2,
    y: Math.floor(cell / size) * cellPx + cellPx / 2,
  });

  return (
    <Screen back title="Flow" subtitle="Join the pairs. Fill every square." backTo={`/g/${groupId}`} scroll={false} fill>
      <View style={styles.body}>
        <View style={styles.stats}>
          <View style={styles.chip} accessibilityLabel={`${points} points available`}>
            <Txt variant="heading" tabular color={colors.accent}>
              {points}
            </Txt>
            <Txt variant="caption" color={colors.muted}>
              pts
            </Txt>
          </View>
          <View style={styles.statText}>
            <Txt variant="heading" tabular color={underPar ? colors.ink : colors.bad}>
              {clock(elapsed)}
            </Txt>
            <Txt variant="caption" color={colors.muted} tabular>
              par {clock(board.parMs)}
            </Txt>
          </View>
          <View style={[styles.statText, styles.statRight]}>
            <Txt variant="heading" tabular>
              {done}/{dots.length}
            </Txt>
            <Txt variant="caption" color={colors.muted} tabular>
              pipes · {percent}%
            </Txt>
          </View>
        </View>

        <View style={styles.area} onLayout={onArea}>
          {boardPx > 0 ? (
            <View
              testID="flow-board"
              accessible
              accessibilityLabel={`Flow board, ${size} by ${size}. ${done} of ${dots.length} pipes connected, ${percent}% filled.`}
              style={[styles.board, { width: boardPx, height: boardPx }, webNoTouchScroll]}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderTerminationRequest={() => false}
              onResponderGrant={onGrant}
              onResponderMove={onMove}
              onResponderRelease={onRelease}
              onResponderTerminate={onRelease}
            >
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <Svg width={boardPx} height={boardPx}>
                  {paths.map((p, color) =>
                    p.length >= 2
                      ? p.map((cell) => (
                          <Rect
                            key={`t${cell}`}
                            x={(cell % size) * cellPx}
                            y={Math.floor(cell / size) * cellPx}
                            width={cellPx}
                            height={cellPx}
                            fill={PIPE_COLORS[color]}
                            fillOpacity={0.16}
                          />
                        ))
                      : null,
                  )}
                  {Array.from({ length: size - 1 }, (_, i) => (i + 1) * cellPx).map((at) => (
                    <Line key={`h${at}`} x1={0} y1={at} x2={boardPx} y2={at} stroke={colors.border} strokeWidth={1} />
                  ))}
                  {Array.from({ length: size - 1 }, (_, i) => (i + 1) * cellPx).map((at) => (
                    <Line key={`v${at}`} x1={at} y1={0} x2={at} y2={boardPx} stroke={colors.border} strokeWidth={1} />
                  ))}
                  {hand !== null && head !== null ? (
                    <Circle
                      cx={center(head).x}
                      cy={center(head).y}
                      r={cellPx * 0.48}
                      fill={PIPE_COLORS[hand]}
                      fillOpacity={0.22}
                    />
                  ) : null}
                  {paths.map((p, color) =>
                    p.length >= 2 ? (
                      <Polyline
                        key={`p${color}`}
                        points={p.map((cell) => `${center(cell).x},${center(cell).y}`).join(" ")}
                        fill="none"
                        stroke={PIPE_COLORS[color]}
                        strokeWidth={cellPx * 0.34}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : null,
                  )}
                  {dots.map((d, i) =>
                    d.ends.map((cell) => (
                      <Circle
                        key={`d${cell}`}
                        cx={center(cell).x}
                        cy={center(cell).y}
                        r={cellPx * 0.3}
                        fill={PIPE_COLORS[d.color]}
                        stroke={isComplete(paths[i] ?? [], d) ? colors.ink : "none"}
                        strokeOpacity={0.55}
                        strokeWidth={2}
                      />
                    )),
                  )}
                  <Rect
                    x={0.5}
                    y={0.5}
                    width={boardPx - 1}
                    height={boardPx - 1}
                    rx={radius.tile}
                    fill="none"
                    stroke={colors.fog}
                    strokeWidth={1}
                  />
                </Svg>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          {error ? (
            <View style={styles.footerRow}>
              <Txt variant="caption" color={colors.bad} style={styles.grow}>
                {error}
              </Txt>
              {solved ? <Button size="sm" variant="tonal" label="Try again" onPress={() => send(paths)} loading={busy} /> : null}
            </View>
          ) : problem ? (
            <View style={styles.footerRow}>
              <Pill label="Not yet" tone="badSoft" />
              <Txt variant="caption" color={colors.bad} style={styles.grow}>
                {problem}
              </Txt>
            </View>
          ) : (
            <Txt variant="caption" color={colors.muted} align="center">
              {busy ? "Checking…" : "Drag from a dot to its twin. Full marks inside par."}
            </Txt>
          )}
          <Button testID="flow-reset" variant="ghost" size="sm" label="Reset" onPress={reset} disabled={busy} />
        </View>
      </View>
    </Screen>
  );
}

/** On the web, stop the browser from scrolling or selecting text while you draw. */
const webNoTouchScroll = Platform.OS === "web" ? ({ touchAction: "none", userSelect: "none", cursor: "pointer" } as object) : null;

const styles = StyleSheet.create({
  body: { flex: 1, gap: space(3) },
  stats: { flexDirection: "row", alignItems: "center", gap: space(4) },
  chip: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    paddingHorizontal: space(3),
    paddingVertical: space(1),
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.4)",
  },
  statText: { gap: 0 },
  statRight: { marginLeft: "auto", alignItems: "flex-end" },
  area: { flex: 1, minHeight: 200, alignItems: "center", justifyContent: "center" },
  board: {
    borderRadius: radius.tile,
    overflow: "hidden",
    backgroundColor: colors.sunken,
  },
  footer: { gap: space(1), alignItems: "center" },
  footerRow: { flexDirection: "row", alignItems: "center", gap: space(2), alignSelf: "stretch" },
  grow: { flex: 1 },
});
