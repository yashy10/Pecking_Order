import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { colors, motion, radius, space } from "@/theme";
import { tap } from "@/utils/haptics";
import { Icon, type IconName } from "./icon";
import { Txt } from "./txt";

/**
 * primary   — the one main action on a screen
 * secondary — an outlined alternative next to a primary
 * tonal     — a soft, frequent action that shouldn't compete with the primary
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
  tonal: colors.primary,
  ghost: colors.primary,
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
          <Txt variant={size === "sm" ? "label" : "heading"} color={ink} numberOfLines={1}>
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
    borderRadius: radius.pill,
    paddingHorizontal: space(5),
    alignItems: "center",
    justifyContent: "center",
  },
  sm: { minHeight: 40, paddingHorizontal: space(4) },
  content: { flexDirection: "row", alignItems: "center", gap: space(2) },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  tonal: { backgroundColor: colors.primarySoft },
  ghost: { backgroundColor: "transparent" },
  inactive: { opacity: 0.45 },
  pressed: { opacity: 0.85, transform: [{ scale: motion.press }] },
});
