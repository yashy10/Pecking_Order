import { StyleSheet, View } from "react-native";
import { usePlace } from "./place";

/** A small divider: three dots in the place's colour. */
export function Ornament({ width = 32 }: { width?: number }) {
  const place = usePlace();
  return (
    <View
      style={[styles.row, { minWidth: width }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.dot, { backgroundColor: place.soft }]} />
      <View style={[styles.dot, styles.big, { backgroundColor: place.fill }]} />
      <View style={[styles.dot, { backgroundColor: place.soft }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  big: { width: 12, height: 12, borderRadius: 6 },
});
