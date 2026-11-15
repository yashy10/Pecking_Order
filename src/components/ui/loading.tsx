import { ActivityIndicator, StyleSheet, View } from "react-native";
import { colors, space } from "@/theme";
import { Txt } from "./txt";

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.accent} />
      {label ? <Txt color={colors.muted}>{label}</Txt> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", gap: space(2), paddingVertical: space(10) },
});
