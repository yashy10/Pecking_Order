import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ConfirmCard, DangerButton } from "@/components/confirm-card";
import { Avatar, Button, Card, EmptyState, Field, List, ListRow, Screen, ScreenSkeleton, Section, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, space } from "@/theme";
import type { Today } from "@/utils/convex";
import { errorMessage } from "@/utils/errors";
import * as haptics from "@/utils/haptics";
import { skipLaunchJump } from "@/screens/home";

// A table's settings. Groups have no owner, so any member can rename the table or change
// its invite code. Leaving deletes your seat in this group: points, streak, powers.

const GROUP_NAME_MAX = 30;

export function GroupSettings({ groupId }: { groupId: Id<"groups"> }) {
  const token = useToken();
  const today = useQuery(api.today.get, token ? { token, groupId } : "skip");
  // While leaving, today.get turns null before the mutation returns; don't flash
  // "not in this group" on the way back to the home screen.
  const [left, setLeft] = useState(false);

  if (today === undefined || (left && today === null)) {
    return (
      <Screen back title="Table settings" backTo={`/g/${groupId}/crew`}>
        <ScreenSkeleton />
      </Screen>
    );
  }

  if (today === null) {
    return (
      <Screen back title="Table settings">
        <EmptyState emoji="🔐" title="You're not in this group" body="Join it with the invite code to change its settings.">
          <Button label="Go to my groups" onPress={() => router.replace("/")} />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen back title="Table settings" subtitle={today.group.name} backTo={`/g/${groupId}/crew`}>
      <Rename groupId={groupId} current={today.group.name} />
      <InviteCode groupId={groupId} code={today.group.inviteCode} />
      <YouHere />
      <Leave groupId={groupId} today={today} setLeft={setLeft} />
    </Screen>
  );
}

function Rename({ groupId, current }: { groupId: Id<"groups">; current: string }) {
  const token = useToken();
  const rename = useMutation(api.profile.renameGroup);
  const [name, setName] = useState(current);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clean = name.trim();
  const changed = clean.length > 0 && clean !== current;

  async function save() {
    if (!token || !changed || busy) return;
    setBusy(true);
    setError(null);
    try {
      await rename({ token, groupId, name: clean });
      haptics.success();
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Table name" footnote="Everyone in the group sees the new name.">
      <Card>
        <Field
          testID="rename-field"
          accessibilityLabel="Table name"
          value={name}
          onChangeText={(t) => {
            setName(t);
            setSaved(false);
          }}
          maxLength={GROUP_NAME_MAX}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={save}
        />
        {error ? <Txt color={colors.bad}>{error}</Txt> : null}
        <Button
          testID="rename-save"
          label={saved && !changed ? "Saved" : "Save name"}
          icon={saved && !changed ? "check" : undefined}
          size="sm"
          variant="tonal"
          onPress={save}
          loading={busy}
          disabled={!changed}
        />
      </Card>
    </Section>
  );
}

function InviteCode({ groupId, code }: { groupId: Id<"groups">; code: string }) {
  const token = useToken();
  const renew = useMutation(api.profile.newInviteCode);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      await renew({ token, groupId });
      haptics.success();
      setAsking(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Invite code" footnote="A new code is useful if an invite link went somewhere it shouldn't.">
      <Card style={styles.codeCard}>
        <Txt variant="display" style={styles.code} selectable testID="settings-code">
          {code}
        </Txt>
      </Card>
      {asking ? (
        <ConfirmCard
          title="Make a new invite code?"
          body="The old code, links and QR codes stop working. Everyone already in the group stays in."
          confirmLabel="New code"
          onConfirm={confirm}
          onCancel={() => setAsking(false)}
          busy={busy}
          error={error}
          testID="new-code"
        />
      ) : (
        <Button label="Make a new code" variant="secondary" size="sm" onPress={() => setAsking(true)} testID="new-code" />
      )}
    </Section>
  );
}

function YouHere() {
  const token = useToken();
  const me = useQuery(api.users.me, token ? { token } : "skip");
  if (!me) return null;
  return (
    <Section title="You">
      <List>
        <ListRow
          title={me.name}
          subtitle="Your profile, stats and sign out"
          leading={<Avatar emoji={me.emoji} hasPass={me.hasPass} size={40} />}
          onPress={() => router.push("/profile")}
          testID="settings-profile"
        />
      </List>
    </Section>
  );
}

function Leave({ groupId, today, setLeft }: { groupId: Id<"groups">; today: Today; setLeft: (left: boolean) => void }) {
  const token = useToken();
  const leave = useMutation(api.profile.leaveGroup);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { group } = today;
  const alone = group.memberCount <= 1;

  async function confirm() {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      setLeft(true);
      await leave({ token, groupId });
      haptics.warning();
      skipLaunchJump();
      router.replace("/");
    } catch (e) {
      setLeft(false);
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Section title="Leave">
      {asking ? (
        <ConfirmCard
          title={`Leave ${group.name}?`}
          body={
            alone
              ? "You're the only one here. The table closes when you leave."
              : "Your points, streak, powers and answers in this group are deleted. You can join again with the code, but you start from zero."
          }
          confirmLabel="Leave group"
          onConfirm={confirm}
          onCancel={() => setAsking(false)}
          busy={busy}
          error={error}
          destructive
          testID="leave-group"
        />
      ) : (
        <View>
          <DangerButton label="Leave group" onPress={() => setAsking(true)} testID="leave-group" />
        </View>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  codeCard: { alignItems: "center", paddingVertical: space(4) },
  code: { letterSpacing: 8, marginRight: -8 },
});
