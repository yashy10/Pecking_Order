import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, space } from "@/theme";

type Props = {
  children: ReactNode;
  tone?: "surface" | "accent" | "fog";
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Card({ children, tone = "surface", style, testID }: Props) {
  return (
    <View testID={testID} style={[styles.card, styles[tone], style]}>
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
  surface: { backgroundColor: colors.surface },
  accent: { backgroundColor: colors.accent, borderColor: colors.accent },
  fog: { backgroundColor: colors.fog, borderColor: colors.fog },
});
