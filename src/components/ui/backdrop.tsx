import { StyleSheet, View } from "react-native";
import { colors } from "@/theme";

// Owned by the lead. The page behind every screen: plain warm paper. Colour lives in the
// content (the hero card, the active tab), not behind it, so text always sits on a clean page.
// The `variant` prop is kept for callers; both variants draw the same page.
//
// Decorative only: hidden from screen readers, never takes a touch.

type Props = { variant?: "full" | "subtle" };

export function Backdrop(_: Props) {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.base]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.bg },
});
