import type { ComponentProps } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { colors, radius, space, typography } from "@/theme";
import { Txt } from "./txt";

// React 19 passes `ref` as an ordinary prop, so it travels through `rest`.
type Props = ComponentProps<typeof TextInput> & { label?: string };

export function Field({ label, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      {label ? (
        <Txt variant="caption" color={colors.muted}>
          {label}
        </Txt>
      ) : null}
      <TextInput
        placeholderTextColor={colors.muted}
        {...rest}
        style={[styles.input, rest.multiline && styles.multiline, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space(1) },
  input: {
    ...typography.body,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.field,
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    minHeight: 52,
  },
  multiline: { minHeight: 88, textAlignVertical: "top" },
});
