import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { api } from "@convex/_generated/api";
import { ConfirmCard, DangerButton } from "@/components/confirm-card";
import { ProfileForm } from "@/components/profile-form";
import { Avatar, Button, Card, EmptyState, Icon, List, ListRow, Screen, ScreenSkeleton, Section, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, fonts, radius, space } from "@/theme";
import { errorMessage } from "@/utils/errors";
import * as haptics from "@/utils/haptics";

// The player's own page: name and bird, their numbers across every table, the Season Pass,
// and signing out. Only the player's own points and streaks, never a rank (PLAN §6.1).

export function Profile() {
  const token = useToken();
  const me = useQuery(api.users.me, token ? { token } : "skip");
  const overview = useQuery(api.profile.overview, token ? { token } : "skip");
  const [editing, setEditing] = useState(false);

  if (!token || me === undefined || overview === undefined) {
    return (
      <Screen back title="Profile">
        <ScreenSkeleton />
      </Screen>
    );
  }

  if (me === null || !me.signedIn) {
    return (
      <Screen back title="Profile">
        <EmptyState emoji="🪶" title="You're signed out" body="Continue with Google to get your seat back.">
          <Button label="Sign in" onPress={() => router.replace("/welcome")} />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen back title="Profile">
      {editing ? (
        <ProfileForm
          title="Edit profile"
          cta="Save"
          initialName={me.name}
          initialEmoji={me.emoji}
          onSaved={() => {
            haptics.success();
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <Card tone="soft" style={styles.hero} testID="profile-card">
          <Avatar emoji={me.emoji} hasPass={me.hasPass} size={84} />
          <Text style={styles.name} accessibilityRole="header" numberOfLines={1}>
            {me.name}
          </Text>
          <Txt variant="caption" color={colors.muted}>
            {me.hasPass ? "Season Pass · signed in with Google" : "Signed in with Google"}
          </Txt>
          <View style={styles.editRow}>
            <Button label="Edit name and bird" icon="edit" size="sm" variant="tonal" onPress={() => setEditing(true)} testID="profile-edit" />
          </View>
        </Card>
      )}

      <View style={styles.stats}>
        <Stat value={overview.groups.length} label={overview.groups.length === 1 ? "Table" : "Tables"} />
        <Stat value={overview.bestStreak} label="Best streak" />
        <Stat value={overview.crowns} label={overview.crowns === 1 ? "Crown" : "Crowns"} />
      </View>

      <Section title="Your tables" footnote="Only your own numbers. Nobody's rank shows until Sunday.">
        {overview.groups.length === 0 ? (
          <Card>
            <Txt color={colors.muted}>No tables yet. Host one from the home screen, or join with a code.</Txt>
          </Card>
        ) : (
          <List testID="profile-groups">
            {overview.groups.map((g) => (
              <ListRow
                key={g.groupId}
                title={g.name}
                subtitle={groupLine(g)}
                leading={<GroupMark name={g.name} />}
                onPress={() => router.push(`/g/${g.groupId}/settings`)}
                accessibilityLabel={`${g.name}. ${groupLine(g)}. Open table settings`}
              />
            ))}
          </List>
        )}
      </Section>

      <Section title="Season Pass">
        <List>
          <ListRow
            title={me.hasPass ? "You have the Season Pass" : "Season Pass"}
            subtitle={me.hasPass ? "The brass ring is on your avatar in every group" : "A ring on your avatar. Free, cosmetic only"}
            leading={<RowGlyph />}
            onPress={() => router.push("/pass")}
          />
        </List>
      </Section>

      <Section title="Account">
        {me.guest ? (
          <Txt variant="caption" color={colors.muted}>
            You're playing as a guest. Your seat lives on this device only, so there's no signing out.
          </Txt>
        ) : (
          <SignOut />
        )}
      </Section>
    </Screen>
  );
}

type GroupStats = {
  dayLabel: string;
  week: number;
  phase: "open" | "revealed" | "finale";
  weekPoints: number;
  streak: number;
  ghost: number;
  spy: number;
  crowns: number;
};

function groupLine(g: GroupStats): string {
  const parts = [g.phase === "finale" ? `Week ${g.week} · results are in` : `Week ${g.week} · ${g.dayLabel}`];
  parts.push(`${g.weekPoints} pts banked`);
  if (g.streak > 0) parts.push(`${g.streak}-day streak`);
  const powers = [g.ghost > 0 ? `${g.ghost} Ghost` : null, g.spy > 0 ? `${g.spy} Spy` : null].filter(Boolean);
  if (powers.length) parts.push(powers.join(", "));
  if (g.crowns > 0) parts.push(`👑 ${g.crowns}`);
  return parts.join(" · ");
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <Card style={styles.stat}>
      <Txt variant="title" tabular align="center">
        {value}
      </Txt>
      <Txt variant="overline" color={colors.muted} align="center">
        {label}
      </Txt>
    </Card>
  );
}

function SignOut() {
  const token = useToken();
  const signOut = useMutation(api.users.signOut);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      await signOut({ token });
      router.replace("/welcome");
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  if (asking) {
    return (
      <ConfirmCard
        title="Sign out of this device?"
        body="Your name, bird, groups and points stay with your Google account. Continue with Google to come back, here or on any device."
        confirmLabel="Sign out"
        onConfirm={confirm}
        onCancel={() => setAsking(false)}
        busy={busy}
        error={error}
        destructive
        testID="sign-out"
      />
    );
  }
  return <DangerButton label="Sign out" onPress={() => setAsking(true)} testID="sign-out" />;
}

function GroupMark({ name }: { name: string }) {
  return (
    <View style={styles.mark}>
      <Text style={styles.markText}>{name.trim().charAt(0).toUpperCase() || "?"}</Text>
    </View>
  );
}

function RowGlyph() {
  return (
    <View style={styles.mark}>
      <Icon name="sparkle" size={18} color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: space(2), paddingVertical: space(6) },
  name: { fontFamily: fonts.display, fontSize: 28, lineHeight: 36, letterSpacing: 1.5, color: colors.ink, marginTop: space(2) },
  editRow: { marginTop: space(2) },
  stats: { flexDirection: "row", gap: space(2.5) },
  stat: { flex: 1, alignItems: "center", gap: space(1), paddingVertical: space(4) },
  mark: {
    width: 40,
    height: 40,
    borderRadius: radius.field,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(212, 175, 55, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.30)",
  },
  markText: { fontFamily: fonts.display, fontSize: 18, color: colors.accent },
});
