import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { colors, motion, radius, space } from "@/theme";
import { tap } from "@/utils/haptics";
import { Icon, type IconName } from "./icon";
import { usePlace } from "./place";
import { Txt } from "./txt";

/**
 * primary   — the one main action on a screen: a black pill
 * secondary — a white pill with a hairline border, next to a primary
 * tonal     — a tint of the place's colour, for a frequent action that shouldn't compete
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
  const place = usePlace();
  const inactive = disabled || loading;
  const look = {
    primary: { bg: colors.ink, ink: colors.onInk },
    secondary: { bg: colors.surface, ink: colors.ink },
    tonal: { bg: place.soft, ink: colors.ink },
    ghost: { bg: "transparent", ink: colors.ink },
  }[variant];

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
        { backgroundColor: look.bg },
        variant === "secondary" && styles.outlined,
        pressed && styles.pressed,
        inactive && styles.inactive,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={look.ink} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} size={size === "sm" ? 17 : 20} color={look.ink} /> : null}
          <Txt variant={size === "sm" ? "label" : "heading"} color={look.ink} numberOfLines={1}>
            {label}
          </Txt>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radius.pill,
    paddingHorizontal: space(6),
    alignItems: "center",
    justifyContent: "center",
  },
  sm: { minHeight: 44, paddingHorizontal: space(4) },
  outlined: { borderWidth: 1.5, borderColor: colors.border },
  content: { flexDirection: "row", alignItems: "center", gap: space(2) },
  inactive: { opacity: 0.4 },
  pressed: { opacity: 0.85, transform: [{ scale: motion.press }] },
});
