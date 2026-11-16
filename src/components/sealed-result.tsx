import { useQuery } from "convex/react";
import { router } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { GAME_INFO } from "@/components/game-info";
import { NotifyCard } from "@/components/notify-card";
import { Button, Card, Icon, Pill, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { useNow } from "@/hooks/use-now";
import { colors, fonts, space } from "@/theme";
import * as haptics from "@/utils/haptics";
import { clockTime, eveningName } from "@/utils/time";

// Owned by the lead. The moment a round ends, for every game alike: the lock snaps shut,
// the points count up, and the player is sent on to today's other game if there is one,
// otherwise toward the Board, where the suspense lives. Scores stay sealed, so this never
// says where anyone stands.

type Props = {
  groupId: Id<"groups">;
  /** The game just played, so the other game today can be offered next. */
  gameId?: Id<"games">;
  /** The sealed points, multiplier included. */
  points: number;
  multiplier: number;
  /** Automatic groups: when today's scores are revealed. Null for demo groups. */
  revealAt: number | null;
  onBack: () => void;
  testID?: string;
  backTestID?: string;
  /** What happened in the round: the answer, or "3 of 4 right". */
  children: ReactNode;
};

const COUNT_MS = 900;
const LOCK_MS = 260;

export function SealedResult({ groupId, gameId, points, multiplier, revealAt, onBack, testID, backTestID, children }: Props) {
  const token = useToken();
  const today = useQuery(api.today.get, token && gameId ? { token, groupId } : "skip");
  const next =
    today?.group.phase === "open"
      ? today.games.find((g) => g.gameId !== gameId && g.myPlay.status !== "done")
      : undefined;
  const reduced = useReducedMotion();
  const shown = useCountUp(points, reduced);
  const now = useNow(false);
  const scored = points > 0;

  // The lock drops in and snaps shut; then one brass ring pulses out from it.
  const lock = useSharedValue(reduced ? 1 : 0);
  const ring = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    lock.value = withSpring(1, { damping: 11, stiffness: 180, mass: 0.7 });
    if (scored) {
      ring.value = withDelay(LOCK_MS, withSequence(withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }), withTiming(0, { duration: 0 })));
    }
  }, [lock, ring, reduced, scored]);
  useEffect(() => {
    if (!scored) return;
    const id = setTimeout(() => haptics.tap(), reduced ? 0 : LOCK_MS);
    return () => clearTimeout(id);
  }, [scored, reduced]);

  const lockStyle = useAnimatedStyle(() => ({
    opacity: lock.value,
    transform: [{ scale: 0.6 + 0.4 * lock.value }, { rotate: `${(1 - lock.value) * -14}deg` }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.value === 0 ? 0 : 0.7 * (1 - ring.value),
    transform: [{ scale: 1 + 0.9 * ring.value }],
  }));

  // "tonight's reveal at 9 PM", "tomorrow's reveal at 9 PM", or, for demo groups, "tonight's reveal".
  const reveal = revealAt === null ? "tonight's reveal" : `${eveningName(revealAt, now)}'s reveal at ${clockTime(revealAt)}`;

  return (
    <>
      <Card tone="soft" testID={testID} style={styles.card}>
        <View style={styles.what}>{children}</View>
  
        <View style={styles.lockWrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Animated.View style={[styles.ring, ringStyle]} />
          <Animated.View style={[styles.lock, !scored && styles.lockQuiet, lockStyle]}>
            <Icon name="lock" size={30} color={scored ? colors.primaryInk : colors.muted} strokeWidth={2.4} />
          </Animated.View>
        </View>
  
        <View style={styles.score} accessible accessibilityLabel={`${points} points sealed`}>
          <Text style={[styles.points, !scored && styles.pointsQuiet]}>
            {scored ? `+${shown}` : "0"}
          </Text>
          <Txt variant="title" align="center">
            {scored ? "points sealed!" : "points sealed"}
          </Txt>
        </View>
  
        {scored && multiplier > 1 ? <Pill label={`×${multiplier} Wildcard Wednesday`} tone="soft" /> : null}
  
        <Txt color={colors.muted} align="center" style={styles.tease}>
          {scored
            ? `Did you just pass someone? Find out at ${reveal}.`
            : "Nothing sealed this time. Tomorrow is a new round."}
        </Txt>
  
        <View style={styles.actions}>
          {next ? (
            <Button
              testID="play-next"
              label={`Next: ${GAME_INFO[next.type].name}${next.slot === "friends" ? " · up to " + next.maxPoints * next.multiplier : ""}`}
              onPress={() => router.replace(`/g/${groupId}/play?game=${next.gameId}`)}
            />
          ) : null}
          <Button
            testID="see-board"
            variant={next ? "secondary" : "primary"}
            label="See the board"
            onPress={() => router.dismissTo(`/g/${groupId}/board`)}
          />
          <Button testID={backTestID} variant="ghost" label="Back to today" onPress={onBack} />
        </View>
      </Card>
      {/* The best moment to ask: they just played and want to know how it lands. */}
      {scored ? <NotifyCard variant="ask" /> : null}
    </>
  );
}

/** Counts from 0 to `to` with an ease-out, after the lock has landed. */
function useCountUp(to: number, reduced: boolean): number {
  const [value, setValue] = useState(reduced ? to : 0);
  useEffect(() => {
    if (reduced || to <= 0) {
      setValue(to);
      return;
    }
    let frame = 0;
    let start = 0;
    const delay = setTimeout(() => {
      const tick = (t: number) => {
        if (!start) start = t;
        const p = Math.min(1, (t - start) / COUNT_MS);
        setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, LOCK_MS);
    return () => {
      clearTimeout(delay);
      cancelAnimationFrame(frame);
    };
  }, [to, reduced]);
  return value;
}

const LOCK = 64;

const styles = StyleSheet.create({
  card: { alignItems: "center", gap: space(3), paddingVertical: space(6) },
  what: { alignItems: "center", gap: space(1) },
  lockWrap: { width: LOCK * 2, height: LOCK + space(4), alignItems: "center", justifyContent: "center" },
  ring: {
    position: "absolute",
    width: LOCK,
    height: LOCK,
    borderRadius: LOCK / 2,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  lock: {
    width: LOCK,
    height: LOCK,
    borderRadius: LOCK / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    backgroundImage: "linear-gradient(180deg, #E7C75A 0%, #C9A02E 100%)",
    boxShadow: "0px 0px 24px rgba(243, 216, 120, 0.45), inset 0px 1px 0px rgba(255, 245, 210, 0.5)",
  },
  lockQuiet: {
    backgroundColor: colors.raised,
    backgroundImage: "none",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    boxShadow: "none",
  },
  score: { alignItems: "center" },
  points: {
    fontFamily: fonts.display,
    fontSize: 56,
    lineHeight: 64,
    letterSpacing: 1,
    color: colors.accent,
    fontVariant: ["tabular-nums"],
    textShadowColor: "rgba(243, 216, 120, 0.35)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  pointsQuiet: { color: colors.muted, textShadowRadius: 0 },
  tease: { maxWidth: 300 },
  actions: { alignSelf: "stretch", gap: space(1), marginTop: space(1) },
});
