import { StyleSheet, View } from "react-native";

/** The backdrop's divider: a brass hairline, a diamond, a brass hairline. */
export function Ornament({ width = 32 }: { width?: number }) {
  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.line, { width, backgroundImage: "linear-gradient(90deg, transparent, #D4AF37)" }]} />
      <View style={styles.diamond} />
      <View style={[styles.line, { width, backgroundImage: "linear-gradient(270deg, transparent, #D4AF37)" }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, opacity: 0.7 },
  line: { height: 1 },
  diamond: { width: 7, height: 7, borderWidth: 1, borderColor: "#D4AF37", transform: [{ rotate: "45deg" }] },
});
