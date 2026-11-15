import { useMutation, useQuery } from "convex/react";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@convex/_generated/api";
import { ProfileForm } from "@/components/profile-form";
import { Avatar, Button, Card, Field, GameButton, Icon, Ornament, Screen, Skeleton, Txt } from "@/components/ui";
import { ONE_LINER } from "@/constants";
import { useToken } from "@/hooks/use-identity";
import { colors, fonts, radius, space } from "@/theme";
import { errorMessage } from "@/utils/errors";

// Owned by Track A. The table: the brand at the top, an empty centre, and everything you
// can do in the lower third, where a thumb reaches (from docs/design/board_game_mobile_backdrop.html).
// First run goes to /welcome (onboarding). After that: your groups ("tables"), then host or join one.

type Panel = "create" | "join" | "profile" | null;

export function Home() {
  const token = useToken();
  const me = useQuery(api.users.me, token ? { token } : "skip");
  const groups = useQuery(api.groups.mine, token ? { token } : "skip");
  const [chosen, setPanel] = useState<Panel | undefined>(undefined);

  const loading = !token || me === undefined;
  const hasGroups = (groups?.length ?? 0) > 0;
  // With no groups yet, hosting is the obvious next step, so it starts open.
  const panel = chosen === undefined ? (groups !== undefined && !hasGroups ? "create" : null) : chosen;
  const toggle = (p: Exclude<Panel, null>) => setPanel(panel === p ? null : p);

  return (
    <Screen backdrop="full" fill>
      <View style={styles.brand}>
        <View style={styles.chip}>
          <View style={styles.chipDot} />
          <Txt variant="overline" color={colors.accent}>
            A weekly game · Season I
          </Txt>
        </View>
        <Text style={styles.wordmark} accessibilityRole="header">
          PECKING{"\n"}ORDER
        </Text>
        <Ornament />
        <Txt color={colors.muted} align="center" style={styles.lede}>
          {ONE_LINER}
        </Txt>
      </View>

      <View style={styles.zone}>
        {loading ? (
          <View style={styles.stack}>
            <Skeleton height={64} />
            <Skeleton height={64} />
          </View>
        ) : me === null || !me.signedIn || me.needsProfile ? (
          <Redirect href="/welcome" />
        ) : panel === "profile" ? (
          <ProfileForm
            title="Edit profile"
            cta="Save"
            initialName={me.name}
            initialEmoji={me.emoji}
            onSaved={() => setPanel(null)}
            onCancel={() => setPanel(null)}
          />
        ) : (
          <>
            {groups === undefined ? (
              <Skeleton height={64} />
            ) : hasGroups ? (
              <View style={styles.stack} testID="group-list">
                <Txt variant="overline" color={colors.muted} style={styles.zoneLabel}>
                  Your tables
                </Txt>
                {groups.map((g, i) => (
                  <GameButton
                    key={g.groupId}
                    tone={i === 0 ? "brass" : "glass"}
                    overline={g.phase === "finale" ? "Results are in" : g.phase === "revealed" ? `${g.dayLabel} · revealed` : g.dayLabel}
                    title={g.name}
                    leading={<GroupMark name={g.name} brass={i === 0} />}
                    onPress={() => router.push(`/g/${g.groupId}`)}
                  />
                ))}
              </View>
            ) : (
              <Txt color={colors.muted} align="center" style={styles.empty}>
                No tables yet. Host one for your friends, or join with their code.
              </Txt>
            )}

            <View style={styles.grid}>
              <View style={styles.cell}>
                <GameButton
                  compact
                  overline="Host"
                  title="New group"
                  selected={panel === "create"}
                  testID="open-create"
                  onPress={() => toggle("create")}
                />
              </View>
              <View style={styles.cell}>
                <GameButton
                  compact
                  overline="Have a code"
                  title="Join group"
                  selected={panel === "join"}
                  testID="open-join"
                  onPress={() => toggle("join")}
                />
              </View>
            </View>

            {panel === "create" ? <CreateGroup /> : null}
            {panel === "join" ? <JoinWithCode /> : null}

            <View style={styles.footer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Playing as ${me.name}. Edit profile`}
                testID="edit-profile"
                onPress={() => setPanel("profile")}
                style={({ pressed }) => [styles.me, pressed && styles.pressed]}
              >
                <Avatar emoji={me.emoji} hasPass={me.hasPass} size={30} />
                <View>
                  <Txt variant="overline" color={colors.muted}>
                    Playing as
                  </Txt>
                  <Txt variant="label">{me.name}</Txt>
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Season Pass"
                onPress={() => router.push("/pass")}
                style={({ pressed }) => [styles.passChip, pressed && styles.pressed]}
              >
                <Icon name="sparkle" size={14} color={colors.accent} />
                <Txt variant="overline" color={colors.accent}>
                  Season Pass
                </Txt>
              </Pressable>
            </View>
          </>
        )}
      </View>
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
    <Card>
      <Field
        testID="group-name-field"
        value={name}
        onChangeText={setName}
        placeholder="Name your table, like The Roost"
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
      <Txt variant="caption" color={colors.muted} align="center">
        You get an invite link and a QR code to share.
      </Txt>
    </Card>
  );
}

function JoinWithCode() {
  const [code, setCode] = useState("");
  const clean = code.trim().toUpperCase();
  const onJoin = () => {
    if (clean) router.push(`/join/${clean}`);
  };
  return (
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
          autoFocus
          maxLength={8}
          returnKeyType="go"
          onSubmitEditing={onJoin}
          style={styles.codeInput}
        />
      </View>
      <Button label="Join" onPress={onJoin} disabled={!clean} />
    </Card>
  );
}

/** The group's initial, engraved on a small tile. Groups have no picture of their own. */
function GroupMark({ name, brass }: { name: string; brass?: boolean }) {
  return (
    <View style={[styles.mark, brass && styles.markBrass]}>
      <Text style={[styles.markText, { color: brass ? colors.accent : colors.ink }]}>
        {name.trim().charAt(0).toUpperCase() || "?"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: "center", gap: space(3), paddingTop: space(8) },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(2),
    paddingHorizontal: space(3),
    paddingVertical: space(1),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.22)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  chipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 38,
    lineHeight: 46,
    letterSpacing: 7,
    textAlign: "center",
    color: colors.ink,
    marginRight: -7, // letterSpacing trails the last letter; pull it back to true centre
    textShadowColor: "rgba(0, 0, 0, 0.85)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 24,
  },
  lede: { maxWidth: 300 },
  zone: { flexGrow: 1, justifyContent: "flex-end", gap: space(3), paddingTop: space(10) },
  zoneLabel: { paddingHorizontal: space(1) },
  stack: { gap: space(2.5) },
  empty: { paddingHorizontal: space(4), paddingBottom: space(1) },
  grid: { flexDirection: "row", gap: space(2.5) },
  cell: { flex: 1 },
  joinRow: { flexDirection: "row", alignItems: "center", gap: space(2) },
  grow: { flex: 1 },
  codeInput: { letterSpacing: 4, fontWeight: "700" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space(2),
    paddingTop: space(3),
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  me: { flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(1), paddingRight: space(2) },
  passChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(1.5),
    paddingHorizontal: space(3),
    paddingVertical: space(2),
    minHeight: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
    backgroundColor: "rgba(212, 175, 55, 0.06)",
  },
  pressed: { opacity: 0.7 },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)",
  },
  markBrass: { backgroundColor: "rgba(212, 175, 55, 0.12)", borderColor: "rgba(212, 175, 55, 0.35)" },
  markText: { fontFamily: fonts.display, fontSize: 18 },
});
