import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FlipInXUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Avatar, Button, Card, Loading, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, radius, space } from "@/theme";
import * as haptics from "@/utils/haptics";

// Owned by Track D. Sunday night: the board flips from the bottom up, slowing
// for the top three, then a crown and a burst for the champion. Last place gets
// no label of any kind (PLAN §8).

const STEP_MS = 600;
const TOP_THREE_MS = 1300;

export function Finale({ groupId }: { groupId: Id<"groups"> }) {
  const token = useToken();
  const data = useQuery(api.weeks.finale, token ? { token, groupId } : "skip");
  const [shown, setShown] = useState(0); // rows revealed, counted from the bottom
  const total = data?.standings.length ?? 0;
  const done = total > 0 && shown >= total;

  useEffect(() => {
    if (!data || shown >= total) return;
    const left = total - shown;
    const wait = shown === 0 ? 500 : left <= 3 ? TOP_THREE_MS : STEP_MS;
    const timer = setTimeout(() => {
      setShown((s) => s + 1);
      haptics.tap();
    }, wait);
    return () => clearTimeout(timer);
  }, [data, shown, total]);

  useEffect(() => {
    if (done) haptics.success();
  }, [done]);

  if (data === undefined) {
    return (
      <Card>
        <Loading />
      </Card>
    );
  }
  if (data === null) return null;

  const champion = data.standings[0];
  const myPlace = data.standings.findIndex((s) => s.memberId === data.myMemberId);
  const iAmLast = myPlace === total - 1 && total > 1;

  return (
    <Card testID="finale">
      <Txt variant="caption" color={colors.muted}>
        WEEK {data.week} · THE PECKING ORDER
      </Txt>
      {done && champion ? (
        <Animated.View entering={FadeIn.duration(500)} style={styles.championWrap}>
          <Burst />
          <Txt variant="title" align="center">
            👑 {champion.name} rules the roost
          </Txt>
          {myPlace >= 0 ? (
            <Txt color={colors.muted} align="center">
              {myPlace === 0
                ? "That's you. Champion of the week."
                : iAmLast
                  ? "Thanks for playing this week. Monday is a fresh start."
                  : `You finished ${ordinal(myPlace + 1)} of ${total}.`}
            </Txt>
          ) : null}
        </Animated.View>
      ) : (
        <Txt variant="title">The full board drops…</Txt>
      )}

      {data.standings.map((s, i) => {
        const revealed = i >= total - shown;
        const isMe = s.memberId === data.myMemberId;
        if (!revealed) {
          return (
            <View key={s.memberId} style={styles.row}>
              <Txt style={styles.place}>{i + 1}</Txt>
              <Avatar fog size={36} />
              <Txt color={colors.muted} style={styles.grow}>
                ???
              </Txt>
            </View>
          );
        }
        return (
          <Animated.View
            key={s.memberId}
            entering={FlipInXUp.duration(450)}
            style={[styles.row, isMe && styles.me, i === 0 && done && styles.first]}
          >
            <Txt style={styles.place}>{i === 0 && done ? "👑" : i + 1}</Txt>
            <Avatar emoji={s.emoji} hasPass={s.hasPass} size={36} />
            <Txt style={[styles.grow, isMe && styles.bold]}>
              {s.name}
              {isMe ? " (you)" : ""}
            </Txt>
            <Txt style={styles.bold}>{s.points}</Txt>
          </Animated.View>
        );
      })}

      {done ? <Button label="Watch again" variant="ghost" onPress={() => setShown(0)} /> : null}
    </Card>
  );
}

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

const BURST = ["🎉", "🐔", "✨", "👑", "🥚", "🎊", "⭐", "🐣", "🎉", "✨", "🐥", "🎊"];

/** A one-shot emoji burst, plain Reanimated, no library. */
function Burst() {
  return (
    <View pointerEvents="none" style={styles.burst}>
      {BURST.map((emoji, i) => (
        <Particle key={i} emoji={emoji} angle={(i / BURST.length) * Math.PI * 2} delay={i * 30} />
      ))}
    </View>
  );
}

function Particle({ emoji, angle, delay }: { emoji: string; angle: number; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [
      { translateX: Math.cos(angle) * 130 * t.value },
      { translateY: Math.sin(angle) * 90 * t.value - 30 * t.value },
      { scale: 0.6 + t.value * 0.8 },
    ],
  }));
  return <Animated.Text style={[styles.particle, style]}>{emoji}</Animated.Text>;
}

const styles = StyleSheet.create({
  championWrap: { alignItems: "center", gap: space(1), paddingVertical: space(2) },
  burst: { position: "absolute", top: "50%", left: "50%", width: 0, height: 0 },
  particle: { position: "absolute", fontSize: 26 },
  row: { flexDirection: "row", alignItems: "center", gap: space(3), minHeight: 44 },
  me: {
    backgroundColor: colors.bg,
    borderRadius: radius.field,
    padding: space(2),
    marginHorizontal: -space(2),
  },
  first: {
    backgroundColor: colors.accent,
    borderRadius: radius.field,
    padding: space(2),
    marginHorizontal: -space(2),
  },
  place: { width: 28, fontWeight: "800", color: colors.muted, textAlign: "center" },
  grow: { flex: 1 },
  bold: { fontWeight: "800" },
});
