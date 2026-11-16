import { useMutation } from "convex/react";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Avatar, Button, Card, Field, Icon, Pill, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, radius, space } from "@/theme";
import type { Today } from "@/utils/convex";
import { errorMessage } from "@/utils/errors";
import * as haptics from "@/utils/haptics";

// Owned by Track C. Today's question, in one of three shapes. Its answers become a
// friends game on a later day (from week 2), so this card says what they'll be used for.
//   text   → a short written answer   (Who Said It, Match-Up)
//   vote   → pick a friend            (Most Likely To)
//   either → this or that             (Read the Room)

type Prompt = NonNullable<Today["prompt"]>;

const USED_FOR: Record<Prompt["feeds"], string> = {
  whoSaidIt: "Friends will guess who wrote it",
  matchUp: "Friends will match it to you",
  mostLikely: "Your vote is secret. Friends will guess who topped it",
  readRoom: "Friends will guess how the crew split",
};

export function PromptCard({ today }: { today: Today }) {
  const prompt = today.prompt;
  if (!prompt || today.group.phase !== "open") return null;
  const usedFor =
    today.group.week < 2 ? "Your answers build next week's friends games" : USED_FOR[prompt.feeds];
  return (
    <Card testID="prompt-card">
      <View style={styles.titleRow}>
        <Txt variant="overline" color={colors.muted} style={styles.grow}>
          {prompt.kind === "vote" ? "Today's vote" : prompt.kind === "either" ? "This or that" : "Today's question"}
        </Txt>
        <Pill label="+10 at the reveal" tone="soft" />
      </View>
      <Txt variant="title">{prompt.question}</Txt>
      {prompt.kind === "vote" ? (
        <VoteAnswer prompt={prompt} usedFor={usedFor} />
      ) : prompt.kind === "either" ? (
        <EitherAnswer prompt={prompt} usedFor={usedFor} />
      ) : (
        <TextAnswer prompt={prompt} usedFor={usedFor} />
      )}
    </Card>
  );
}

function useSave() {
  const token = useToken();
  const save = useMutation(api.prompts.answer);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(args: { promptId: Id<"prompts">; text?: string; choice?: number; voteFor?: Id<"members"> }) {
    if (!token || busy) return false;
    setBusy(true);
    setError(null);
    try {
      await save({ token, ...args });
      haptics.tap();
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { run, busy, error };
}

function Saved({ usedFor, onEdit }: { usedFor: string; onEdit?: () => void }) {
  return (
    <View style={styles.footer}>
      <Icon name="check" size={16} color={colors.good} />
      <Txt variant="caption" color={colors.muted} style={styles.grow}>
        Saved · {usedFor}
      </Txt>
      {onEdit ? <Button label="Edit" icon="edit" variant="ghost" size="sm" onPress={onEdit} /> : null}
    </View>
  );
}

function TextAnswer({ prompt, usedFor }: { prompt: Prompt; usedFor: string }) {
  const { run, busy, error } = useSave();
  const [draft, setDraft] = useState<string | null>(null); // null while not editing
  const editing = draft !== null || prompt.myAnswer === null;
  const value = draft ?? prompt.myAnswer ?? "";

  async function submit() {
    if (!value.trim()) return;
    if (await run({ promptId: prompt.promptId, text: value })) setDraft(null);
  }

  if (!editing) {
    return (
      <>
        <View style={styles.answer}>
          <Txt>“{prompt.myAnswer}”</Txt>
        </View>
        <Saved usedFor={usedFor} onEdit={() => setDraft(prompt.myAnswer ?? "")} />
      </>
    );
  }
  return (
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
      <Txt variant="caption" color={colors.muted} tabular>
        {value.length}/140 · {usedFor}
      </Txt>
      {error ? <Txt color={colors.bad}>{error}</Txt> : null}
      <Button label="Save answer" onPress={submit} loading={busy} disabled={!value.trim()} />
    </>
  );
}

function VoteAnswer({ prompt, usedFor }: { prompt: Prompt; usedFor: string }) {
  const { run, busy, error } = useSave();
  return (
    <>
      <View style={styles.voteGrid}>
        {prompt.voteOptions.map((m) => {
          const on = prompt.myVote === m.memberId;
          return (
            <Pressable
              key={m.memberId}
              testID="vote-option"
              accessibilityRole="button"
              accessibilityLabel={`Vote for ${m.name}`}
              accessibilityState={{ selected: on, disabled: busy }}
              disabled={busy}
              onPress={() => run({ promptId: prompt.promptId, voteFor: m.memberId })}
              style={({ pressed }) => [styles.voteChip, on && styles.chipOn, pressed && styles.pressed]}
            >
              <Avatar emoji={m.emoji} size={30} />
              <Txt variant="label" numberOfLines={1} style={styles.grow} color={colors.ink}>
                {m.name}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      {error ? <Txt color={colors.bad}>{error}</Txt> : null}
      {prompt.myVote ? (
        <Saved usedFor={usedFor} />
      ) : (
        <Txt variant="caption" color={colors.muted}>
          Tap a friend. Nobody sees who you voted for. {usedFor}.
        </Txt>
      )}
    </>
  );
}

function EitherAnswer({ prompt, usedFor }: { prompt: Prompt; usedFor: string }) {
  const { run, busy, error } = useSave();
  return (
    <>
      <View style={styles.eitherRow}>
        {prompt.options.map((label, i) => {
          const on = prompt.myChoice === i;
          return (
            <Pressable
              key={label}
              testID={`either-${i}`}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: busy }}
              disabled={busy}
              onPress={() => run({ promptId: prompt.promptId, choice: i })}
              style={({ pressed }) => [styles.eitherOption, on && styles.chipOn, pressed && styles.pressed]}
            >
              <Txt variant="heading" align="center" color={colors.ink}>
                {label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      {error ? <Txt color={colors.bad}>{error}</Txt> : null}
      {prompt.myChoice !== null ? (
        <Saved usedFor={usedFor} />
      ) : (
        <Txt variant="caption" color={colors.muted}>
          Pick a side. {usedFor}.
        </Txt>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", gap: space(2) },
  grow: { flex: 1 },
  footer: { flexDirection: "row", alignItems: "center", gap: space(2) },
  answer: { backgroundColor: colors.sunken, borderRadius: radius.field, padding: space(3) },
  voteGrid: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  voteChip: {
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space(2),
    padding: space(2),
    minHeight: 48,
    borderRadius: radius.tile,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  eitherRow: { flexDirection: "row", gap: space(2) },
  eitherOption: {
    flex: 1,
    minHeight: 60,
    alignItems: "center",
    justifyContent: "center",
    padding: space(3),
    borderRadius: radius.tile,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primarySoft, borderColor: colors.ink },
  pressed: { transform: [{ scale: 0.98 }] },
});
