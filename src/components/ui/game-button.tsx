import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, edgeShadow, radius, space } from "@/theme";
import { tap } from "@/utils/haptics";
import { Icon } from "./icon";
import { usePlace } from "./place";
import { Txt } from "./txt";

type Props = {
  /** The small line above the title: what kind of action, or the state of a group. */
  overline: string;
  title: string;
  onPress: () => void;
  /** brass: the main way forward, in the place's colour · glass: a white tile */
  tone?: "brass" | "glass";
  /** Something to the left of the text: an emoji tile, a group mark. */
  leading?: ReactNode;
  /** Hide the chevron (for compact grid buttons). */
  compact?: boolean;
  selected?: boolean;
  testID?: string;
  accessibilityLabel?: string;
};

const DEPTH = 5;

/** A big tappable tile: a small label, a title, and an arrow that says "this goes somewhere". */
export function GameButton({
  overline,
  title,
  onPress,
  tone = "glass",
  leading,
  compact,
  selected,
  testID,
  accessibilityLabel,
}: Props) {
  const place = usePlace();
  const bright = tone === "brass" || selected;
  const edge = bright ? place.edge : colors.edge;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${title}. ${overline}`}
      accessibilityState={{ selected: !!selected }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        bright ? { backgroundColor: place.fill, borderColor: place.fill } : styles.plain,
        {
          boxShadow: edgeShadow(edge, pressed ? 1 : DEPTH),
          transform: [{ translateY: pressed ? DEPTH - 1 : 0 }],
        },
      ]}
    >
      {leading}
      <View style={styles.text}>
        <Txt variant="caption" color={bright ? colors.ink : colors.muted} numberOfLines={1}>
          {overline}
        </Txt>
        <Txt variant="heading" numberOfLines={1}>
          {title}
        </Txt>
      </View>
      {compact ? null : (
        <View style={[styles.chev, !bright && { backgroundColor: place.soft }]}>
          <Icon name="chevron" size={18} color={colors.ink} strokeWidth={2.6} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    minHeight: 72,
    paddingVertical: space(3),
    paddingHorizontal: space(4),
    borderRadius: radius.tile,
    borderWidth: 2,
    marginBottom: DEPTH,
  },
  compact: { minHeight: 68, paddingHorizontal: space(3.5) },
  plain: { backgroundColor: colors.surface, borderColor: colors.border },
  text: { flex: 1, gap: 1 },
  chev: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.55)",
  },
});
