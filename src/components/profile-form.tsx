import { useMutation } from "convex/react";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@convex/_generated/api";
import { Button, Card, Field, Txt } from "@/components/ui";
import { EMOJIS } from "@/constants";
import { useToken } from "@/hooks/use-identity";
import { colors, radius, space } from "@/theme";
import { errorMessage } from "@/utils/errors";

// Owned by Track A. Name + emoji. Used on Home and on the join link.

export function ProfileForm({ cta = "Save" }: { cta?: string }) {
  const token = useToken();
  const save = useMutation(api.users.saveProfile);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(() => EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!token || !name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await save({ token, name, emoji });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Txt variant="title">Who are you?</Txt>
      <Field
        testID="name-field"
        label="Your name"
        value={name}
        onChangeText={setName}
        placeholder="Name"
        maxLength={20}
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <Txt variant="caption" color={colors.muted}>
        Pick your bird. Or any animal.
      </Txt>
      <View style={styles.grid}>
        {EMOJIS.map((e) => (
          <Pressable
            key={e}
            accessibilityRole="button"
            accessibilityState={{ selected: e === emoji }}
            onPress={() => setEmoji(e)}
            style={[styles.cell, e === emoji && styles.cellOn]}
          >
            <Text style={styles.emoji}>{e}</Text>
          </Pressable>
        ))}
      </View>
      {error ? <Txt color={colors.bad}>{error}</Txt> : null}
      <Button testID="save-profile" label={cta} onPress={submit} loading={busy} disabled={!name.trim()} />
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  cell: {
    width: 44,
    height: 44,
    borderRadius: radius.field,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  cellOn: { borderColor: colors.primary, backgroundColor: colors.surface },
  emoji: { fontSize: 24 },
});
