import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";
import { chick } from "@/theme";

// Owned by the lead. Pip, the chick who walks a player through the week. One round body,
// five moods. Drawn in react-native-svg (no ids, so stacked web screens can't clash).
//
//   hello    — one wing up: home, welcome, join
//   thinking — eyes up and to the side: waiting, loading, "nothing yet"
//   cheering — both wings up, happy eyes: a right answer, a reveal, the finale
//   sleepy   — eyes shut: no game today, come back tomorrow
//   peeking  — covering its eyes with a wing gap: your score is a secret until tonight

export type Mood = "hello" | "thinking" | "cheering" | "sleepy" | "peeking";

type Props = {
  mood?: Mood;
  size?: number;
  /** Read out for screen readers; leave empty when the text beside it says the same thing. */
  label?: string;
};

export function Mascot({ mood = "hello", size = 120, label }: Props) {
  const reduced = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduced || mood === "sleepy") return;
    y.value = withRepeat(
      withTiming(-4, { duration: mood === "cheering" ? 380 : 1400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [y, reduced, mood]);
  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  const stroke = { stroke: chick.eye, strokeWidth: 3.2, strokeLinecap: "round" as const, fill: "none" };

  return (
    <View
      style={{ width: size, height: size }}
      accessible={!!label}
      accessibilityRole={label ? "image" : undefined}
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? "yes" : "no-hide-descendants"}
    >
      <Animated.View style={bob}>
        <Svg width={size} height={size} viewBox="0 0 120 120">
          {/* shadow on the ground */}
          <Ellipse cx="60" cy="110" rx="30" ry="5" fill={chick.eye} opacity={0.08} />
          {/* feet */}
          <Path d="M48 98 v8 M44 106 h8 M72 98 v8 M68 106 h8" stroke={chick.beak} strokeWidth={4} strokeLinecap="round" />
          {/* head tuft */}
          <Path d="M54 22 q-2 -12 6 -14 q-1 8 3 12 q4 -8 10 -6 q-5 5 -5 12 z" fill={chick.shade} />
          {/* body */}
          <Circle cx="60" cy="62" r="42" fill={chick.body} />
          <Path d="M24 76 a42 42 0 0 0 72 0 a44 30 0 0 1 -72 0 z" fill={chick.shade} opacity={0.55} />

          {/* wings */}
          {mood === "cheering" ? (
            <>
              <Ellipse cx="17" cy="42" rx="9" ry="16" fill={chick.shade} transform="rotate(-28 17 42)" />
              <Ellipse cx="103" cy="42" rx="9" ry="16" fill={chick.shade} transform="rotate(28 103 42)" />
            </>
          ) : mood === "hello" ? (
            <>
              <Ellipse cx="21" cy="70" rx="9" ry="15" fill={chick.shade} transform="rotate(14 21 70)" />
              <Ellipse cx="104" cy="44" rx="9" ry="16" fill={chick.shade} transform="rotate(30 104 44)" />
            </>
          ) : (
            <>
              <Ellipse cx="21" cy="70" rx="9" ry="15" fill={chick.shade} transform="rotate(14 21 70)" />
              <Ellipse cx="99" cy="70" rx="9" ry="15" fill={chick.shade} transform="rotate(-14 99 70)" />
            </>
          )}

          {/* cheeks */}
          <Circle cx="36" cy="68" r="7" fill={chick.cheek} opacity={0.8} />
          <Circle cx="84" cy="68" r="7" fill={chick.cheek} opacity={0.8} />

          {/* eyes */}
          {mood === "cheering" ? (
            <Path d="M38 56 q6 -9 12 0 M70 56 q6 -9 12 0" {...stroke} />
          ) : mood === "sleepy" ? (
            <>
              <Path d="M38 54 q6 7 12 0 M70 54 q6 7 12 0" {...stroke} />
              <Path d="M92 24 h9 l-9 10 h9" {...stroke} strokeWidth={2.6} opacity={0.6} />
            </>
          ) : mood === "peeking" ? (
            <>
              {/* one eye shut tight, one eye open: it's trying not to look */}
              <Path d="M38 54 q6 7 12 0" {...stroke} />
              <G>
                <Circle cx="76" cy="54" r="7.5" fill={chick.eye} />
                <Circle cx="78.5" cy="51.5" r="2.5" fill={chick.white} />
              </G>
              {/* a wing held over the shut eye */}
              <Ellipse cx="38" cy="50" rx="16" ry="10" fill={chick.shade} transform="rotate(-18 38 50)" />
            </>
          ) : (
            <G transform={mood === "thinking" ? "translate(3 -3)" : undefined}>
              <Circle cx="44" cy="54" r="7.5" fill={chick.eye} />
              <Circle cx="76" cy="54" r="7.5" fill={chick.eye} />
              <Circle cx="46.5" cy="51.5" r="2.5" fill={chick.white} />
              <Circle cx="78.5" cy="51.5" r="2.5" fill={chick.white} />
            </G>
          )}

          {/* beak */}
          {mood === "cheering" ? (
            <Path d="M51 64 h18 l-9 13 z" fill={chick.beak} stroke={chick.beak} strokeWidth={3} strokeLinejoin="round" />
          ) : (
            <Path d="M53 65 h14 l-7 8 z" fill={chick.beak} stroke={chick.beak} strokeWidth={3} strokeLinejoin="round" />
          )}
        </Svg>
      </Animated.View>
    </View>
  );
}
