import { StyleSheet, View } from "react-native";
import { colors, radius, space } from "@/theme";
import { Txt } from "./txt";

// Solid tones shout (a ×2 badge, "passed you"); soft tones label (status, day).
type Tone = "accent" | "primary" | "good" | "bad" | "fog" | "soft" | "goodSoft" | "badSoft" | "neutral";

const TONES: Record<Tone, { bg: string; ink: string }> = {
  accent: { bg: colors.accent, ink: colors.ink },
  primary: { bg: colors.primary, ink: colors.primaryInk },
  good: { bg: colors.good, ink: colors.primaryInk },
  bad: { bg: colors.bad, ink: colors.primaryInk },
  fog: { bg: colors.fog, ink: colors.ink },
  soft: { bg: colors.primarySoft, ink: colors.primaryDeep },
  goodSoft: { bg: colors.goodSoft, ink: colors.good },
  badSoft: { bg: colors.badSoft, ink: colors.bad },
  neutral: { bg: colors.sunken, ink: colors.muted },
};

export function Pill({ label, tone = "accent" }: { label: string; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Txt variant="caption" color={t.ink} numberOfLines={1}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: space(2.5),
    paddingVertical: space(0.5),
  },
});
