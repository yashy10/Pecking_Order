import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import { StyleSheet, View } from "react-native";
import { Button, Card, Field, Icon, Pill, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, radius, space } from "@/theme";
import type { Today } from "@/utils/convex";
import { errorMessage } from "@/utils/errors";

// Owned by Track C. Phase 0: working version. Today's question; answers feed
// tomorrow's Who Said It.

export function PromptCard({ today }: { today: Today }) {
  const token = useToken();
  const save = useMutation(api.prompts.answer);
  const [draft, setDraft] = useState<string | null>(null); // null while not editing
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prompt = today.prompt;
  if (!prompt || today.group.phase !== "open") return null;

  const editing = draft !== null || prompt.myAnswer === null;
  const value = draft ?? prompt.myAnswer ?? "";

  async function submit() {
    if (!token || !prompt || !value.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await save({ token, promptId: prompt.promptId, text: value });
      setDraft(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card testID="prompt-card">
      <View style={styles.titleRow}>
        <Txt variant="overline" color={colors.muted} style={styles.grow}>
          Today's question
        </Txt>
        <Pill label="+10 points" tone="primary" />
      </View>
      <Txt variant="title">{prompt.question}</Txt>
      {editing ? (
        <>
          <Field
            testID="prompt-field"
            value={value}
            onChangeText={setDraft}
            placeholder="Keep it short and funny"
            accessibilityLabel="Your answer"
            maxLength={140}
            multiline
          />
          <View style={styles.footer}>
            <Txt variant="caption" color={colors.muted} tabular style={styles.grow}>
              {value.length}/140 · Tomorrow your friends guess who wrote it
            </Txt>
          </View>
          {error ? <Txt color={colors.bad}>{error}</Txt> : null}
          <Button label="Save answer" onPress={submit} loading={busy} disabled={!value.trim()} />
        </>
      ) : (
        <>
          <View style={styles.answer}>
            <Txt>“{prompt.myAnswer}”</Txt>
          </View>
          <View style={styles.footer}>
            <Icon name="check" size={16} color={colors.good} />
            <Txt variant="caption" color={colors.muted} style={styles.grow}>
              Saved for tomorrow's game
            </Txt>
            <Button
              label="Edit"
              icon="edit"
              variant="ghost"
              size="sm"
              onPress={() => setDraft(prompt.myAnswer ?? "")}
            />
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", gap: space(2) },
  grow: { flex: 1 },
  footer: { flexDirection: "row", alignItems: "center", gap: space(2) },
  answer: { backgroundColor: colors.sunken, borderRadius: radius.field, padding: space(3) },
});
