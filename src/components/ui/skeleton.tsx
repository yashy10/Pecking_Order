import { useEffect } from "react";
import { StyleSheet, View, type DimensionValue } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors, radius, space } from "@/theme";

/** A placeholder block that breathes while data loads. Holds the layout so nothing jumps. */
export function Skeleton({ height = 16, width = "100%", round }: { height?: number; width?: DimensionValue; round?: boolean }) {
  const reduced = useReducedMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (!reduced) o.value = withRepeat(withTiming(0.5, { duration: 700 }), -1, true);
  }, [o, reduced]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[styles.block, { height, width, borderRadius: round ? height / 2 : radius.field }, style]}
    />
  );
}

/** A screen's worth of skeleton: a hero card and a list. */
export function ScreenSkeleton() {
  return (
    <View style={styles.screen} accessibilityLabel="Loading" accessibilityRole="progressbar">
      <Skeleton height={168} />
      <Skeleton height={12} width={120} />
      <Skeleton height={64} />
      <Skeleton height={64} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.raised },
  screen: { gap: space(3), paddingTop: space(2) },
});
