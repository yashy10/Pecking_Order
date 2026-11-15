import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { colors, edgeShadow, radius, space } from "@/theme";
import { tap } from "@/utils/haptics";
import { Icon, type IconName } from "./icon";
import { usePlace } from "./place";
import { Txt } from "./txt";

/**
 * primary   — the one main action on a screen: a chunky block in the place's colour
 * secondary — a white block next to a primary
 * tonal     — a soft tint of the place's colour, for a frequent action that shouldn't compete
 * ghost     — a quiet text action
 *
 * The solid bottom edge is the "toy" depth: pressing the button pushes it down onto the edge.
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
  const depth = size === "sm" ? 3 : 5;
  const look = {
    primary: { bg: place.fill, edge: place.edge, ink: colors.primaryInk },
    secondary: { bg: colors.surface, edge: colors.edge, ink: colors.ink },
    tonal: { bg: place.soft, edge: place.fill, ink: colors.ink },
    ghost: { bg: "transparent", edge: null, ink: colors.accent },
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
        look.edge
          ? {
              marginBottom: depth,
              boxShadow: edgeShadow(look.edge, pressed ? 1 : depth),
              transform: [{ translateY: pressed ? depth - 1 : 0 }],
            }
          : pressed && styles.ghostPressed,
        inactive && styles.inactive,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={look.ink} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} size={size === "sm" ? 18 : 22} color={look.ink} strokeWidth={2.4} /> : null}
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
    minHeight: 58,
    borderRadius: radius.field,
    paddingHorizontal: space(5),
    alignItems: "center",
    justifyContent: "center",
  },
  sm: { minHeight: 44, paddingHorizontal: space(4), borderRadius: 14 },
  outlined: { borderWidth: 2, borderColor: colors.border },
  content: { flexDirection: "row", alignItems: "center", gap: space(2) },
  inactive: { opacity: 0.45 },
  ghostPressed: { opacity: 0.6 },
});
