import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { colors, space } from "@/theme";
import { Txt } from "./txt";

type Props = {
  /** Sentence case; rendered as an overline. */
  title?: string;
  /** A short trailing element on the title line: a pill, a small link. */
  aside?: ReactNode;
  /** One line under the content, for context the player might need. */
  footnote?: string;
  children: ReactNode;
  testID?: string;
};

/** A titled group of content. Screens are built from sections, not stacks of cards. */
export function Section({ title, aside, footnote, children, testID }: Props) {
  return (
    <View style={styles.wrap} testID={testID}>
      {title || aside ? (
        <View style={styles.head}>
          {title ? (
            <Txt variant="overline" color={colors.ink} accessibilityRole="header" style={styles.title}>
              {title}
            </Txt>
          ) : null}
          {aside}
        </View>
      ) : null}
      {children}
      {footnote ? (
        <Txt variant="caption" color={colors.muted} style={styles.footnote}>
          {footnote}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space(2) },
  head: { flexDirection: "row", alignItems: "center", gap: space(2), minHeight: 24, paddingHorizontal: space(1) },
  title: { flex: 1 },
  footnote: { paddingHorizontal: space(1) },
});
