import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@convex/_generated/api";
import { ProfileForm } from "@/components/profile-form";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Field,
  List,
  ListRow,
  Pill,
  Screen,
  ScreenSkeleton,
  Section,
  Txt,
} from "@/components/ui";
import { APP_NAME, ONE_LINER } from "@/constants";
import { useToken } from "@/hooks/use-identity";
import { colors, radius, space } from "@/theme";
import { errorMessage } from "@/utils/errors";

// Owned by Track A. First run: who are you. After that: your groups, then start or join one.

export function Home() {
  const token = useToken();
  const me = useQuery(api.users.me, token ? { token } : "skip");
  const groups = useQuery(api.groups.mine, token ? { token } : "skip");
  const [editing, setEditing] = useState(false);

  if (!token || me === undefined) {
    return (
      <Screen>
        <ScreenSkeleton />
      </Screen>
    );
  }

  if (me === null) {
    return (
      <Screen>
        <View style={styles.hero}>
          <Text style={styles.mark} accessibilityElementsHidden importantForAccessibility="no">
            🐔
          </Text>
          <Txt variant="display">{APP_NAME}</Txt>
          <Txt color={colors.muted}>{ONE_LINER}</Txt>
        </View>
        <ProfileForm cta="Let's go" />
      </Screen>
    );
  }

  return (
    <Screen
      title={APP_NAME}
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit profile, ${me.name}`}
          testID="edit-profile"
          onPress={() => setEditing((e) => !e)}
          style={({ pressed }) => [styles.meButton, pressed && styles.pressed]}
        >
          <Avatar emoji={me.emoji} hasPass={me.hasPass} size={36} />
        </Pressable>
      }
    >
      {editing ? (
        <ProfileForm
          title="Edit profile"
          cta="Save"
          initialName={me.name}
          initialEmoji={me.emoji}
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      ) : null}

      {groups === undefined ? (
        <ScreenSkeleton />
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState
            emoji="🪺"
            title={`Hi ${me.name}, no groups yet`}
            body="Start one and send the link to your friends, or join with a code someone sent you."
          />
        </Card>
      ) : (
        <Section title="Your groups">
          <List testID="group-list">
            {groups.map((g) => (
              <ListRow
                key={g.groupId}
                title={g.name}
                subtitle={g.dayLabel}
                leading={<GroupMark name={g.name} />}
                trailing={
                  g.phase === "finale" ? (
                    <Pill label="Results are in" tone="soft" />
                  ) : g.phase === "revealed" ? (
                    <Pill label="Revealed" tone="neutral" />
                  ) : null
                }
                onPress={() => router.push(`/g/${g.groupId}`)}
              />
            ))}
          </List>
        </Section>
      )}

      <CreateGroup />
      <JoinWithCode />
    </Screen>
  );
}

function CreateGroup() {
  const token = useToken();
  const create = useMutation(api.groups.create);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate() {
    if (!token || !name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { groupId } = await create({ token, name });
      setName("");
      router.push(`/g/${groupId}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Start a group" footnote="You get an invite link and a QR code to share.">
      <Card>
        <Field
          testID="group-name-field"
          value={name}
          onChangeText={setName}
          placeholder="Group name, like The Roost"
          accessibilityLabel="Group name"
          maxLength={30}
          returnKeyType="go"
          onSubmitEditing={onCreate}
        />
        {error ? <Txt color={colors.bad}>{error}</Txt> : null}
        <Button
          testID="create-group"
          label="Create group"
          icon="plus"
          onPress={onCreate}
          loading={busy}
          disabled={!name.trim()}
        />
      </Card>
    </Section>
  );
}

function JoinWithCode() {
  const [code, setCode] = useState("");
  const clean = code.trim().toUpperCase();
  const onJoin = () => {
    if (clean) router.push(`/join/${clean}`);
  };
  return (
    <Section title="Join with a code">
      <Card style={styles.joinRow}>
        <View style={styles.grow}>
          <Field
            testID="join-code-field"
            value={code}
            onChangeText={setCode}
            placeholder="ABCDE"
            accessibilityLabel="Group code"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            returnKeyType="go"
            onSubmitEditing={onJoin}
            style={styles.codeInput}
          />
        </View>
        <Button label="Join" variant="tonal" onPress={onJoin} disabled={!clean} />
      </Card>
    </Section>
  );
}

/** The group's first letter on a warm tile. Groups have no picture of their own. */
function GroupMark({ name }: { name: string }) {
  return (
    <View style={styles.mark40}>
      <Txt variant="heading" color={colors.primary}>
        {name.trim().charAt(0).toUpperCase() || "?"}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space(2), paddingTop: space(10), paddingBottom: space(2) },
  mark: { fontSize: 48, marginBottom: space(1) },
  meButton: { borderRadius: radius.pill, padding: 4 },
  pressed: { opacity: 0.7 },
  mark40: {
    width: 40,
    height: 40,
    borderRadius: radius.field,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  joinRow: { flexDirection: "row", alignItems: "center", gap: space(2) },
  grow: { flex: 1 },
  codeInput: { letterSpacing: 4, fontWeight: "700" },
});
