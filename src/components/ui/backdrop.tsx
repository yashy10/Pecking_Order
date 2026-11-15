import { StyleSheet, View } from "react-native";
import { colors } from "@/theme";
import { usePlace } from "./place";

// Owned by the lead. The page behind every screen: cream paper with a few big, flat shapes in
// the colour of the place you're in. Shapes hug the corners; the middle stays clear for content.
//
//   "full"   — home, welcome and join: bolder shapes, a little confetti
//   "subtle" — every other screen: one bright corner and one soft one
//
// Decorative only: hidden from screen readers, never takes a touch. Plain views, no SVG ids.

type Props = { variant?: "full" | "subtle" };

export function Backdrop({ variant = "subtle" }: Props) {
  const place = usePlace();
  const full = variant === "full";
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.base]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.blob, full ? styles.topFull : styles.top, { backgroundColor: place.fill }]} />
      <View style={[styles.blob, full ? styles.bottomFull : styles.bottom, { backgroundColor: place.soft }]} />
      {full ? (
        <>
          <View style={[styles.blob, styles.side, { backgroundColor: place.soft }]} />
          <View style={[styles.bit, styles.bitA, { backgroundColor: place.edge }]} />
          <View style={[styles.bit, styles.bitB, { backgroundColor: place.fill }]} />
          <View style={[styles.bit, styles.bitC, { backgroundColor: place.edge }]} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.bg, overflow: "hidden" },
  blob: { position: "absolute", borderRadius: 999 },
  top: { width: 220, height: 220, top: -130, right: -70 },
  bottom: { width: 300, height: 300, bottom: -170, left: -120 },
  topFull: { width: 340, height: 340, top: -190, right: -110 },
  bottomFull: { width: 380, height: 380, bottom: -220, left: -150 },
  side: { width: 150, height: 150, top: 150, left: -95 },
  bit: { position: "absolute", width: 14, height: 14, borderRadius: 7 },
  bitA: { top: 190, right: 34 },
  bitB: { top: 96, left: 40, width: 20, height: 20, borderRadius: 10 },
  bitC: { bottom: 150, right: 22, width: 10, height: 10, borderRadius: 5 },
});
