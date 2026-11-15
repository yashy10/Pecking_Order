import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, space } from "@/theme";
import { Txt } from "./txt";

type Props = { emoji?: string; title: string; body?: string; children?: ReactNode; testID?: string };

/** What a screen shows when there's nothing yet, with the one thing to do about it. */
export function EmptyState({ emoji, title, body, children, testID }: Props) {
  return (
    <View style={styles.wrap} testID={testID}>
      {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
      <Txt variant="title" align="center">
        {title}
      </Txt>
      {body ? (
        <Txt color={colors.muted} align="center" style={styles.body}>
          {body}
        </Txt>
      ) : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: space(2), paddingVertical: space(8), paddingHorizontal: space(4) },
  emoji: { fontSize: 56, marginBottom: space(1) },
  body: { maxWidth: 320 },
  actions: { alignSelf: "stretch", gap: space(2), marginTop: space(3) },
});
