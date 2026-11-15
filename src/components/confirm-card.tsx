import { Pressable, StyleSheet, View } from "react-native";
import { Button, Card, Txt } from "@/components/ui";
import { colors, radius, space } from "@/theme";
import { tap } from "@/utils/haptics";

// An inline "are you sure?" for actions that can't be undone. Inline rather than an
// Alert, because Alert.alert does nothing on the web.

type Props = {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  error?: string | null;
  /** Red for actions that lose something (leaving a group); brass otherwise. */
  destructive?: boolean;
  testID?: string;
};

export function ConfirmCard({ title, body, confirmLabel, onConfirm, onCancel, busy, error, destructive, testID }: Props) {
  return (
    <Card style={[styles.card, destructive && styles.danger]} testID={testID}>
      <Txt variant="heading">{title}</Txt>
      <Txt variant="caption" color={colors.muted}>
        {body}
      </Txt>
      {error ? <Txt color={colors.bad}>{error}</Txt> : null}
      <View style={styles.row}>
        <View style={styles.grow}>
          <Button label="Cancel" variant="secondary" size="sm" onPress={onCancel} disabled={busy} />
        </View>
        <View style={styles.grow}>
          {destructive ? (
            <DangerButton label={confirmLabel} onPress={onConfirm} busy={busy} testID={testID && `${testID}-confirm`} />
          ) : (
            <Button label={confirmLabel} size="sm" onPress={onConfirm} loading={busy} testID={testID && `${testID}-confirm`} />
          )}
        </View>
      </View>
    </Card>
  );
}

/** A quiet red action: a terracotta outline, never a solid fill. */
export function DangerButton({
  label,
  onPress,
  busy,
  testID,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.danger, styles.dangerButton, (pressed || busy) && styles.pressed]}
    >
      <Txt variant="label" color={colors.bad}>
        {busy ? "One moment…" : label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: space(3) },
  danger: { borderWidth: 1, borderColor: "rgba(229, 130, 99, 0.45)", backgroundColor: colors.badSoft },
  row: { flexDirection: "row", gap: space(2) },
  grow: { flex: 1 },
  dangerButton: {
    minHeight: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space(4),
  },
  pressed: { opacity: 0.7 },
});
