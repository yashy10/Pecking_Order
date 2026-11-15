import { StyleSheet, View } from "react-native";
import { colors, radius, space } from "@/theme";
import { Txt } from "./txt";

type Tone = "accent" | "primary" | "good" | "bad" | "fog";

const background: Record<Tone, string> = {
  accent: colors.accent,
  primary: colors.primary,
  good: colors.good,
  bad: colors.bad,
  fog: colors.fog,
};

export function Pill({ label, tone = "accent" }: { label: string; tone?: Tone }) {
  const ink = tone === "accent" || tone === "fog" ? colors.ink : colors.primaryInk;
  return (
    <View style={[styles.pill, { backgroundColor: background[tone] }]}>
      <Txt variant="caption" color={ink}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: space(3),
    paddingVertical: space(1),
  },
});
