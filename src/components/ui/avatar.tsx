import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "@/theme";

type Props = {
  emoji?: string;
  size?: number;
  hasPass?: boolean; // Season Pass ring, cosmetic only
  fog?: boolean;
};

/** A player's piece: their emoji on a round white token. */
export function Avatar({ emoji, size = 44, hasPass, fog }: Props) {
  return (
    <View
      style={[
        styles.token,
        { width: size, height: size, borderRadius: size / 2 },
        fog ? styles.fog : null,
        hasPass && styles.pass,
      ]}
    >
      <Text style={[styles.glyph, { fontSize: size * 0.52, lineHeight: size * 0.68 }, fog && styles.fogGlyph]}>
        {fog ? "?" : emoji}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  token: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  fog: { backgroundColor: colors.fog, borderColor: colors.fog },
  pass: { borderWidth: 3, borderColor: colors.primary },
  glyph: { textAlign: "center", color: colors.ink, includeFontPadding: false },
  fogGlyph: { color: colors.muted, fontFamily: fonts.heavy },
});
