import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, elevation, radius, space } from "@/theme";

type Props = {
  children: ReactNode;
  /** surface: default · accent/fog: Phase 0 tones · soft: a warm highlight for the hero of a screen */
  tone?: "surface" | "accent" | "fog" | "soft";
  /** No padding or gap: for lists whose rows bring their own. */
  flush?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Card({ children, tone = "surface", flush, style, testID }: Props) {
  return (
    <View testID={testID} style={[styles.card, styles[tone], flush && styles.flush, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space(4),
    gap: space(3),
  },
  flush: { padding: 0, gap: 0, overflow: "hidden" },
  surface: { backgroundColor: colors.surface, boxShadow: elevation.card },
  accent: { backgroundColor: colors.accent, borderColor: colors.accent },
  fog: { backgroundColor: colors.fog, borderColor: colors.fog },
  soft: { backgroundColor: colors.accentSoft, borderColor: colors.accentSoft },
});
