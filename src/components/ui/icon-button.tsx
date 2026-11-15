import { Pressable, StyleSheet } from "react-native";
import { colors, motion, radius } from "@/theme";
import { tap } from "@/utils/haptics";
import { Icon, type IconName } from "./icon";
import { usePlace } from "./place";

type Props = {
  icon: IconName;
  /** Required: an icon alone says nothing to a screen reader. */
  label: string;
  onPress: () => void;
  tone?: "plain" | "tonal";
  color?: string;
  testID?: string;
};

/** A 48-point round touch target holding one icon. */
export function IconButton({ icon, label, onPress, tone = "plain", color, testID }: Props) {
  const place = usePlace();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        tone === "tonal" && { backgroundColor: place.soft, borderColor: place.fill },
        pressed && styles.pressed,
      ]}
    >
      <Icon name={icon} size={22} color={color ?? colors.ink} strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  pressed: { backgroundColor: colors.raised, transform: [{ scale: motion.press }] },
});
