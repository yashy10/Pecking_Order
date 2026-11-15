import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import { Button, Card, Field, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors } from "@/theme";
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
    <Card>
      <Txt variant="caption" color={colors.muted}>
        TODAY'S QUESTION
      </Txt>
      <Txt variant="title">{prompt.question}</Txt>
      {editing ? (
        <>
          <Field
            testID="prompt-field"
            value={value}
            onChangeText={setDraft}
            placeholder="Keep it short and funny"
            maxLength={140}
            multiline
          />
          {error ? <Txt color={colors.bad}>{error}</Txt> : null}
          <Button label="Save answer" onPress={submit} loading={busy} disabled={!value.trim()} />
        </>
      ) : (
        <>
          <Txt>“{prompt.myAnswer}”</Txt>
          <Txt variant="caption" color={colors.muted}>
            Saved for tomorrow's game. +10 at the reveal.
          </Txt>
          <Button label="Edit" variant="ghost" onPress={() => setDraft(prompt.myAnswer ?? "")} />
        </>
      )}
    </Card>
  );
}
