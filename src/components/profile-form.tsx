import { useMutation } from "convex/react";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@convex/_generated/api";
import { Avatar, Button, Card, Field, Txt } from "@/components/ui";
import { EMOJIS } from "@/constants";
import { useToken } from "@/hooks/use-identity";
import { colors, radius, space } from "@/theme";
import { errorMessage } from "@/utils/errors";

// Owned by Track A. Name + emoji. Used on Home (first run and editing) and on the join link.

type Props = {
  cta?: string;
  title?: string;
  onSaved?: () => void;
  onCancel?: () => void;
  initialName?: string;
  initialEmoji?: string;
};

export function ProfileForm({ cta = "Save", title = "Who are you?", onSaved, onCancel, initialName, initialEmoji }: Props) {
  const token = useToken();
  const save = useMutation(api.users.saveProfile);
  const [name, setName] = useState(initialName ?? "");
  const [emoji, setEmoji] = useState(() => initialEmoji ?? EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!token || !name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await save({ token, name, emoji });
      onSaved?.();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Avatar emoji={emoji} size={56} />
        <View style={styles.grow}>
          <Txt variant="title">{title}</Txt>
          <Txt variant="caption" color={colors.muted}>
            Your friends see this on the board.
          </Txt>
        </View>
      </View>
      <Field
        testID="name-field"
        label="Your name"
        value={name}
        onChangeText={setName}
        placeholder="First name or nickname"
        maxLength={20}
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <View style={styles.pickHead}>
        <Txt variant="caption" color={colors.muted}>
          Pick your bird. Or any animal.
        </Txt>
      </View>
      <View style={styles.grid} accessibilityRole="radiogroup">
        {EMOJIS.map((e) => {
          const on = e === emoji;
          return (
            <Pressable
              key={e}
              accessibilityRole="radio"
              accessibilityLabel={e}
              accessibilityState={{ selected: on, checked: on }}
              onPress={() => setEmoji(e)}
              style={({ pressed }) => [styles.cell, on && styles.cellOn, pressed && styles.cellPressed]}
            >
              <Text style={styles.emoji}>{e}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Txt color={colors.bad}>{error}</Txt> : null}
      <View style={styles.actions}>
        {onCancel ? (
          <View style={styles.grow}>
            <Button label="Cancel" variant="secondary" onPress={onCancel} />
          </View>
        ) : null}
        <View style={styles.grow}>
          <Button testID="save-profile" label={cta} onPress={submit} loading={busy} disabled={!name.trim()} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space(4) },
  head: { flexDirection: "row", alignItems: "center", gap: space(3) },
  grow: { flex: 1 },
  pickHead: { marginBottom: -space(2) },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space(2), justifyContent: "flex-start" },
  cell: {
    width: 46,
    height: 46,
    borderRadius: radius.field,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sunken,
    borderWidth: 2,
    borderColor: colors.sunken,
  },
  cellOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  cellPressed: { transform: [{ scale: 0.94 }] },
  emoji: { fontSize: 24 },
  actions: { flexDirection: "row", gap: space(2) },
});
