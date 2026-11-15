import { useState, type ComponentProps } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { colors, radius, space, typography } from "@/theme";
import { Txt } from "./txt";

// React 19 passes `ref` as an ordinary prop, so it travels through `rest`.
type Props = ComponentProps<typeof TextInput> & { label?: string };

export function Field({ label, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      {label ? (
        <Txt variant="caption" color={colors.muted}>
          {label}
        </Txt>
      ) : null}
      <TextInput
        placeholderTextColor="#768090"
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        keyboardAppearance="dark"
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, focused && styles.focused, rest.multiline && styles.multiline, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space(1.5) },
  input: {
    ...typography.body,
    color: colors.ink,
    backgroundColor: colors.sunken,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)",
    borderRadius: radius.field,
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    minHeight: 52,
    boxShadow: "inset 0px 2px 4px rgba(0, 0, 0, 0.5)",
    // The brass border is the focus ring; drop the browser's default blue one on the web.
    outlineStyle: "solid",
    outlineWidth: 0,
  },
  focused: { borderColor: "rgba(212, 175, 55, 0.7)" },
  multiline: { minHeight: 92, textAlignVertical: "top" },
});
