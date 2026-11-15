import type { TabTriggerSlotProps } from "expo-router/ui";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, space } from "@/theme";
import { tap } from "@/utils/haptics";
import { Icon, type IconName } from "./icon";
import { Txt } from "./txt";

type Props = TabTriggerSlotProps & { icon: IconName; label: string; dot?: boolean };

/** One tab in the bottom bar. Used through TabTrigger's asChild, which passes isFocused and onPress. */
export function TabButton({ icon, label, dot, isFocused, onPress, ref, ...rest }: Props) {
  const ink = isFocused ? colors.primary : colors.muted;
  return (
    <Pressable
      {...rest}
      ref={ref as never}
      accessibilityRole="tab"
      accessibilityLabel={dot ? `${label}, something new` : label}
      accessibilityState={{ selected: !!isFocused }}
      onPress={(e) => {
        if (!isFocused) tap();
        onPress?.(e);
      }}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
    >
      <View>
        <View style={[styles.pill, isFocused && styles.pillOn]}>
          <Icon name={icon} size={22} color={ink} strokeWidth={isFocused ? 2.2 : 1.9} />
        </View>
        {dot ? <View style={styles.dot} /> : null}
      </View>
      <Txt variant="caption" color={ink} style={isFocused ? styles.labelOn : styles.label}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2, paddingTop: space(1.5), paddingBottom: space(1) },
  pressed: { opacity: 0.7 },
  pill: { width: 56, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  pillOn: { backgroundColor: colors.primarySoft },
  label: { fontWeight: "600" },
  labelOn: { fontWeight: "800" },
  dot: {
    position: "absolute",
    top: 2,
    right: 12,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
});
