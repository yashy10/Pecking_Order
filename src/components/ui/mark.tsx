import { StyleSheet, View } from "react-native";
import { colors } from "@/theme";
import { Icon, type IconName } from "./icon";
import { usePlace } from "./place";

type Props = {
  icon: IconName;
  size?: number;
  /** fill: the place's accent · soft: its tint · plain: white, for use on a tinted card */
  tone?: "fill" | "soft" | "plain";
};

/** A line icon in a circle. The one piece of illustration the app uses. */
export function Mark({ icon, size = 72, tone = "fill" }: Props) {
  const place = usePlace();
  const bg = tone === "fill" ? place.fill : tone === "soft" ? place.soft : colors.surface;
  return (
    <View
      style={[styles.mark, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Icon name={icon} size={Math.round(size * 0.44)} color={colors.ink} strokeWidth={2} />
    </View>
  );
}

/**
 * The brand mark: three stacked bars, an "order". The middle one is fogged, because nobody
 * knows the middle of the board until Sunday.
 */
export function Logo({ size = 44 }: { size?: number }) {
  const place = usePlace();
  const h = size * 0.22;
  const bar = { height: h, borderRadius: h / 2 };
  return (
    <View
      style={{ width: size, gap: size * 0.11, alignItems: "flex-start" }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[bar, { width: size * 0.62, backgroundColor: place.fill }]} />
      <View style={[bar, { width: size, backgroundColor: colors.fog }]} />
      <View style={[bar, { width: size * 0.8, backgroundColor: colors.ink }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { alignItems: "center", justifyContent: "center" },
});
