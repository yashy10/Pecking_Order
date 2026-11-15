import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, elevation, glass, radius, space } from "@/theme";

type Props = {
  children: ReactNode;
  /**
   * surface — a glass panel on the table (default)
   * soft    — a brass-lit panel: the hero of a screen
   * accent  — the same brass panel (Phase 0 name)
   * fog     — a dimmed, hidden-information panel
   */
  tone?: "surface" | "accent" | "fog" | "soft";
  /** No padding or gap: for lists whose rows bring their own. */
  flush?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Card({ children, tone = "surface", flush, style, testID }: Props) {
  const lit = tone === "soft" || tone === "accent";
  return (
    <View
      testID={testID}
      style={[styles.card, lit ? styles.lit : tone === "fog" ? styles.fog : styles.surface, flush && styles.flush, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: space(4),
    gap: space(3),
    boxShadow: elevation.card,
  },
  flush: { padding: 0, gap: 0, overflow: "hidden" },
  surface: { backgroundColor: glass.panel, borderColor: glass.edge },
  lit: {
    backgroundColor: glass.panelStrong,
    backgroundImage: glass.brassFill,
    borderColor: "rgba(212, 175, 55, 0.35)",
  },
  fog: { backgroundColor: colors.fog, borderColor: colors.fog },
});
