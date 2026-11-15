import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, elevation, glass, motion, radius, space } from "@/theme";
import { tap } from "@/utils/haptics";
import { Icon } from "./icon";
import { Txt } from "./txt";

type Props = {
  /** The small mono line above the title: what kind of action, or the state of a group. */
  overline: string;
  title: string;
  onPress: () => void;
  /** brass: the main way forward · glass: everything else */
  tone?: "brass" | "glass";
  /** Something to the left of the text: an emoji tile, a group mark. */
  leading?: ReactNode;
  /** Hide the chevron box (for compact grid buttons). */
  compact?: boolean;
  selected?: boolean;
  testID?: string;
  accessibilityLabel?: string;
};

/** The tabletop's big tappable panels, from the backdrop's button language. */
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
  const brass = tone === "brass" || selected;
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
        brass ? styles.brass : styles.glass,
        compact && styles.compact,
        pressed && styles.pressed,
      ]}
    >
      {leading}
      <View style={styles.text}>
        <Txt variant="overline" color={brass ? colors.accent : colors.muted} numberOfLines={1}>
          {overline}
        </Txt>
        <Txt variant="heading" numberOfLines={1}>
          {title}
        </Txt>
      </View>
      {compact ? null : (
        <View style={[styles.chev, brass ? styles.chevBrass : styles.chevGlass]}>
          <Icon name="chevron" size={16} color={brass ? colors.accent : colors.muted} strokeWidth={2.2} />
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
    minHeight: 64,
    paddingVertical: space(3),
    paddingHorizontal: space(4),
    borderRadius: radius.tile,
    borderWidth: 1,
  },
  compact: { minHeight: 60, paddingHorizontal: space(3.5) },
  brass: {
    backgroundColor: "rgba(18, 22, 30, 0.93)",
    backgroundImage: glass.brassFill,
    borderColor: glass.brassEdge,
    boxShadow: "0px 10px 30px -10px rgba(0, 0, 0, 0.8), inset 0px 1px 0px rgba(243, 216, 120, 0.25)",
  },
  glass: {
    backgroundColor: "rgba(18, 22, 30, 0.93)",
    borderColor: "rgba(255, 255, 255, 0.09)",
    boxShadow: elevation.card,
  },
  pressed: { transform: [{ scale: motion.press }], opacity: 0.92 },
  text: { flex: 1, gap: 2 },
  chev: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  chevBrass: { backgroundColor: "rgba(212, 175, 55, 0.15)", borderColor: "rgba(212, 175, 55, 0.3)" },
  chevGlass: { backgroundColor: "rgba(255, 255, 255, 0.04)", borderColor: "rgba(255, 255, 255, 0.08)" },
});
