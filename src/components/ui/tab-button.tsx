import type { TabTriggerSlotProps } from "expo-router/ui";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, places, space, type Place } from "@/theme";
import { tap } from "@/utils/haptics";
import { Icon, type IconName } from "./icon";
import { Txt } from "./txt";

type Props = TabTriggerSlotProps & {
  icon: IconName;
  label: string;
  dot?: boolean;
  /** The tab's own colour: the same one its screen wears. */
  place?: Place;
};

/** One tab in the bottom bar. Used through TabTrigger's asChild, which passes isFocused and onPress. */
export function TabButton({ icon, label, dot, place = "today", isFocused, onPress, ref, ...rest }: Props) {
  const tint = places[place];
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
        <View style={[styles.pill, isFocused && { backgroundColor: tint.fill }]}>
          <Icon name={icon} size={24} color={isFocused ? colors.ink : colors.muted} strokeWidth={isFocused ? 2.6 : 2.2} />
        </View>
        {dot ? <View style={styles.dot} /> : null}
      </View>
      <Txt variant="caption" color={isFocused ? colors.ink : colors.muted}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingTop: space(2), paddingBottom: space(1) },
  pressed: { opacity: 0.7 },
  pill: { width: 60, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  dot: {
    position: "absolute",
    top: 0,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.bad,
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
