import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme";

type Props = {
  emoji?: string;
  size?: number;
  hasPass?: boolean; // Season Pass ring, cosmetic only
  fog?: boolean;
};

export function Avatar({ emoji, size = 44, hasPass, fog }: Props) {
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: fog ? colors.fog : colors.accent,
        },
        hasPass && styles.pass,
      ]}
    >
      <Text style={[styles.glyph, { fontSize: size * 0.52, lineHeight: size * 0.68 }]}>
        {fog ? "?" : emoji}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center" },
  pass: { borderWidth: 3, borderColor: colors.primary },
  glyph: { textAlign: "center", color: colors.muted, fontWeight: "800", includeFontPadding: false },
});
