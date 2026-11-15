import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, elevation, radius, space } from "@/theme";
import { usePlace } from "./place";

type Props = {
  children: ReactNode;
  /**
   * surface — a white card on the page (default)
   * soft    — tinted with the place's colour: the hero of a screen
   * accent  — the same tinted card (Phase 0 name)
   * fog     — a dimmed, hidden-information panel
   */
  tone?: "surface" | "accent" | "fog" | "soft";
  /** No padding or gap: for lists whose rows bring their own. */
  flush?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Card({ children, tone = "surface", flush, style, testID }: Props) {
  const place = usePlace();
  const lit = tone === "soft" || tone === "accent";
  return (
    <View
      testID={testID}
      style={[
        styles.card,
        lit
          ? { backgroundColor: place.soft, borderColor: place.soft }
          : tone === "fog"
            ? styles.fog
            : styles.surface,
        flush && styles.flush,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1.5,
    padding: space(5),
    gap: space(3),
  },
  flush: { padding: 0, gap: 0, overflow: "hidden" },
  surface: { backgroundColor: colors.surface, borderColor: colors.border, boxShadow: elevation.card },
  fog: { backgroundColor: colors.fog, borderColor: colors.fog },
});
