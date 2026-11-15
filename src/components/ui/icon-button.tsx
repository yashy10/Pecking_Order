import { Pressable, StyleSheet } from "react-native";
import { colors, motion, radius } from "@/theme";
import { tap } from "@/utils/haptics";
import { Icon, type IconName } from "./icon";

type Props = {
  icon: IconName;
  /** Required: an icon alone says nothing to a screen reader. */
  label: string;
  onPress: () => void;
  tone?: "plain" | "tonal";
  color?: string;
  testID?: string;
};

/** A 44-point round touch target holding one icon. */
export function IconButton({ icon, label, onPress, tone = "plain", color, testID }: Props) {
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
      style={({ pressed }) => [styles.base, tone === "tonal" && styles.tonal, pressed && styles.pressed]}
    >
      <Icon name={icon} size={22} color={color ?? (tone === "tonal" ? colors.primary : colors.ink)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { width: 44, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  tonal: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: "rgba(212, 175, 55, 0.35)" },
  pressed: { backgroundColor: colors.raised, transform: [{ scale: motion.press }] },
});
