import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, motion, radius, space } from "@/theme";
import { tap } from "@/utils/haptics";
import { Icon } from "./icon";
import { usePlace } from "./place";
import { Txt } from "./txt";

type Props = {
  /** The small line above the title: what kind of action, or the state of a group. */
  overline: string;
  title: string;
  onPress: () => void;
  /** brass: the main way forward, filled with the place's colour · glass: a white tile */
  tone?: "brass" | "glass";
  /** Something to the left of the text: an emoji tile, a group mark. */
  leading?: ReactNode;
  /** Hide the chevron (for compact grid buttons). */
  compact?: boolean;
  /** Shorter, with a smaller title: for screens that list many tiles, like Home. */
  dense?: boolean;
  selected?: boolean;
  testID?: string;
  accessibilityLabel?: string;
};

/** A tappable tile: a small label, a title, and a chevron that says "this goes somewhere". */
export function GameButton({
  overline,
  title,
  onPress,
  tone = "glass",
  leading,
  compact,
  dense,
  selected,
  testID,
  accessibilityLabel,
}: Props) {
  const place = usePlace();
  const bright = tone === "brass" || selected;
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
        dense && styles.dense,
        bright ? { backgroundColor: place.fill, borderColor: place.fill } : styles.plain,
        pressed && styles.pressed,
      ]}
    >
      {leading}
      <View style={styles.text}>
        <Txt variant="caption" color={bright ? colors.ink : colors.muted} numberOfLines={1}>
          {overline}
        </Txt>
        <Txt variant={dense ? "label" : "heading"} numberOfLines={1}>
          {title}
        </Txt>
      </View>
      {compact ? null : (
        <Icon name="chevron" size={dense ? 16 : 18} color={bright ? colors.ink : colors.muted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    minHeight: 68,
    paddingVertical: space(3),
    paddingHorizontal: space(4),
    borderRadius: radius.tile,
    borderWidth: 1.5,
  },
  compact: { minHeight: 64 },
  dense: { minHeight: 54, paddingVertical: space(2), paddingHorizontal: space(3), gap: space(2.5) },
  plain: { backgroundColor: colors.surface, borderColor: colors.border },
  pressed: { opacity: 0.85, transform: [{ scale: motion.press }] },
  text: { flex: 1, gap: 1 },
});
