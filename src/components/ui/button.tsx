import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { colors, elevation, glass, motion, radius, space } from "@/theme";
import { tap } from "@/utils/haptics";
import { Icon, type IconName } from "./icon";
import { Txt } from "./txt";

/**
 * primary   — the one main action on a screen: solid brass
 * secondary — a glass alternative next to a primary
 * tonal     — brass-trimmed glass for a frequent action that shouldn't compete
 * ghost     — a quiet text action
 */
type Variant = "primary" | "secondary" | "tonal" | "ghost";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: "md" | "sm";
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  accessibilityHint?: string;
};

const INK: Record<Variant, string> = {
  primary: colors.primaryInk,
  secondary: colors.ink,
  tonal: colors.accent,
  ghost: colors.accent,
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  disabled,
  loading,
  testID,
  accessibilityHint,
}: Props) {
  const inactive = disabled || loading;
  const ink = INK[variant];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        size === "sm" && styles.sm,
        styles[variant],
        inactive && styles.inactive,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={ink} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} size={size === "sm" ? 18 : 20} color={ink} /> : null}
          <Txt variant={size === "sm" ? "label" : "heading"} color={ink} numberOfLines={1} style={styles.label}>
            {label}
          </Txt>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.field,
    paddingHorizontal: space(5),
    alignItems: "center",
    justifyContent: "center",
  },
  sm: { minHeight: 42, paddingHorizontal: space(4) },
  content: { flexDirection: "row", alignItems: "center", gap: space(2) },
  label: { letterSpacing: 0.3 },
  primary: {
    backgroundColor: colors.primary,
    backgroundImage: glass.brassSolid,
    boxShadow: elevation.brass,
  },
  secondary: {
    backgroundColor: "rgba(18, 22, 30, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)",
    boxShadow: elevation.card,
  },
  tonal: {
    backgroundColor: "rgba(18, 22, 30, 0.6)",
    backgroundImage: glass.brassFill,
    borderWidth: 1,
    borderColor: glass.brassEdge,
  },
  ghost: { backgroundColor: "transparent" },
  inactive: { opacity: 0.4 },
  pressed: { opacity: 0.88, transform: [{ scale: motion.press }] },
});
