import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme";

type Props = {
  emoji?: string;
  size?: number;
  hasPass?: boolean; // Season Pass ring, cosmetic only
  fog?: boolean;
};

/** A player's piece: their emoji on a dark token with a brass rim. */
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
      <Text style={[styles.glyph, { fontSize: size * 0.5, lineHeight: size * 0.66 }, fog && styles.fogGlyph]}>
        {fog ? "?" : emoji}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  token: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1C212C",
    backgroundImage: "radial-gradient(circle at 35% 30%, #2A3140 0%, #161A23 70%)",
    borderWidth: 1.5,
    borderColor: "rgba(212, 175, 55, 0.45)",
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.6)",
  },
  fog: {
    backgroundColor: colors.fog,
    backgroundImage: "none",
    borderColor: "rgba(255, 255, 255, 0.10)",
    borderStyle: "dashed",
  },
  pass: { borderWidth: 2.5, borderColor: colors.accent, boxShadow: "0px 0px 12px rgba(243, 216, 120, 0.45)" },
  glyph: { textAlign: "center", color: colors.ink, includeFontPadding: false },
  fogGlyph: { color: colors.muted, fontWeight: "700" },
});
