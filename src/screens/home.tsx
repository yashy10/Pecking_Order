import { useMutation, useQuery } from "convex/react";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@convex/_generated/api";
import { ProfileForm } from "@/components/profile-form";
import { Avatar, Button, Card, Field, GameButton, Icon, Mascot, Screen, Skeleton, Txt } from "@/components/ui";
import { ONE_LINER } from "@/constants";
import { useToken } from "@/hooks/use-identity";
import { colors, fonts, radius, space } from "@/theme";
import { errorMessage } from "@/utils/errors";
import { lastGroup } from "@/utils/last-group";

// Owned by Track A. Home: Pip the chick and the name at the top, and everything you can do in
// the lower half, where a thumb reaches. One thing at a time: tapping "New group" or "Join"
// swaps the lower half for that one step.
// First run goes to /welcome (onboarding). After that: your groups, then start or join one.

type Panel = "create" | "join" | "profile" | null;

// Once per launch, a returning player skips this list: straight into the group this
// device opened last, or their only group. Coming back here later doesn't bounce them.
let launchChecked = false;

export function Home() {
  const token = useToken();
  const me = useQuery(api.users.me, token ? { token } : "skip");
  const groups = useQuery(api.groups.mine, token ? { token } : "skip");
  const [chosen, setPanel] = useState<Panel | undefined>(undefined);
  const [opening, setOpening] = useState(!launchChecked);

  useEffect(() => {
    if (launchChecked || !token || me === undefined || (me && groups === undefined)) return;
    let cancelled = false;
    void (async () => {
      const ready = me !== null && me.signedIn && !me.needsProfile && groups !== undefined && groups.length > 0;
      const last = ready ? await lastGroup() : null;
      if (cancelled || launchChecked) return;
      launchChecked = true;
      const pick = ready
        ? (groups.find((g) => g.groupId === last) ?? (groups.length === 1 ? groups[0] : undefined))
        : undefined;
      if (pick) router.replace(`/g/${pick.groupId}`);
      else setOpening(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, me, groups]);

  const loading = !token || me === undefined || opening;
  const hasGroups = (groups?.length ?? 0) > 0;
  // One thing at a time: starting or joining a group takes over the lower half of the screen.
  const panel = chosen ?? null;

  return (
    <Screen backdrop="full" place="home" fill>
      <View style={styles.brand}>
        <Mascot mood={panel ? "thinking" : "hello"} size={panel ? 88 : 132} />
        <Text style={styles.wordmark} accessibilityRole="header">
          Pecking Order
        </Text>
        {panel ? null : (
          <Txt color={colors.muted} align="center" style={styles.lede}>
            {ONE_LINER}
          </Txt>
        )}
      </View>

      <View style={styles.zone}>
        {loading ? (
          <View style={styles.stack}>
            <Skeleton height={72} />
            <Skeleton height={72} />
          </View>
        ) : me === null || !me.signedIn || me.needsProfile ? (
          <Redirect href="/welcome" />
        ) : panel === "profile" ? (
          <ProfileForm
            title="Change your look"
            cta="Save"
            initialName={me.name}
            initialEmoji={me.emoji}
            onSaved={() => setPanel(null)}
            onCancel={() => setPanel(null)}
          />
        ) : panel === "create" ? (
          <CreateGroup onCancel={() => setPanel(null)} />
        ) : panel === "join" ? (
          <JoinWithCode onCancel={() => setPanel(null)} />
        ) : (
          <>
            {groups === undefined ? (
              <Skeleton height={72} />
            ) : hasGroups ? (
              <View style={styles.stack} testID="group-list">
                <Txt variant="overline" style={styles.zoneLabel}>
                  Your groups
                </Txt>
                {groups.map((g, i) => (
                  <GameButton
                    key={g.groupId}
                    tone={i === 0 ? "brass" : "glass"}
                    overline={
                      g.phase === "finale"
                        ? "The winner is out!"
                        : g.phase === "revealed"
                          ? `${g.dayLabel} · scores are out`
                          : g.dayLabel
                    }
                    title={g.name}
                    leading={<GroupMark name={g.name} />}
                    onPress={() => router.push(`/g/${g.groupId}`)}
                  />
                ))}
              </View>
            ) : (
              <Txt variant="heading" align="center" style={styles.empty}>
                Start a group for your friends, or join theirs.
              </Txt>
            )}

            <View style={styles.grid}>
              <View style={styles.cell}>
                <GameButton
                  compact
                  tone={hasGroups ? "glass" : "brass"}
                  overline="Start"
                  title="New group"
                  leading={<Text style={styles.tileEmoji}>✨</Text>}
                  testID="open-create"
                  onPress={() => setPanel("create")}
                />
              </View>
              <View style={styles.cell}>
                <GameButton
                  compact
                  overline="Got a code?"
                  title="Join"
                  leading={<Text style={styles.tileEmoji}>🔑</Text>}
                  testID="open-join"
                  onPress={() => setPanel("join")}
                />
              </View>
            </View>

            <View style={styles.footer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Playing as ${me.name}. Change your look`}
                testID="edit-profile"
                onPress={() => setPanel("profile")}
                style={({ pressed }) => [styles.me, pressed && styles.pressed]}
              >
                <Avatar emoji={me.emoji} hasPass={me.hasPass} size={36} />
                <Txt variant="label" numberOfLines={1} style={styles.meName}>
                  {me.name}
                </Txt>
                <Icon name="edit" size={16} color={colors.muted} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Season Pass"
                onPress={() => router.push("/pass")}
                style={({ pressed }) => [styles.passChip, pressed && styles.pressed]}
              >
                <Icon name="sparkle" size={16} color={colors.ink} />
                <Txt variant="label">Season Pass</Txt>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

function CreateGroup({ onCancel }: { onCancel: () => void }) {
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
      // The device's UTC offset puts the group on the real calendar in the host's time zone:
      // games open at midnight, scores are revealed at 9 PM, the finale is Sunday at 9 PM.
      const utcOffsetMinutes = -new Date().getTimezoneOffset();
      const { groupId } = await create({ token, name, utcOffsetMinutes });
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
      <Txt variant="title">Name your group</Txt>
      <Field
        testID="group-name-field"
        value={name}
        onChangeText={setName}
        placeholder="Like The Roost"
        accessibilityLabel="Group name"
        autoFocus
        maxLength={30}
        returnKeyType="go"
        onSubmitEditing={onCreate}
      />
      {error ? <Txt color={colors.bad}>{error}</Txt> : null}
      <Button
        testID="create-group"
        label="Make my group"
        icon="plus"
        onPress={onCreate}
        loading={busy}
        disabled={!name.trim()}
      />
      <Txt variant="caption" color={colors.muted} align="center">
        Next you get a link and a code to send to your friends.
      </Txt>
      <Button label="Back" variant="ghost" size="sm" onPress={onCancel} />
    </Card>
  );
}

function JoinWithCode({ onCancel }: { onCancel: () => void }) {
  const [code, setCode] = useState("");
  const clean = code.trim().toUpperCase();
  const onJoin = () => {
    if (clean) router.push(`/join/${clean}`);
  };
  return (
    <Card>
      <Txt variant="title">Type your code</Txt>
      <Txt color={colors.muted}>Your friend has it on their invite screen.</Txt>
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
      <Button label="Join" onPress={onJoin} disabled={!clean} />
      <Button label="Back" variant="ghost" size="sm" onPress={onCancel} />
    </Card>
  );
}

/** The group's first letter on a small white tile. Groups have no picture of their own. */
function GroupMark({ name }: { name: string }) {
  return (
    <View style={styles.mark}>
      <Text style={styles.markText}>{name.trim().charAt(0).toUpperCase() || "?"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: "center", gap: space(2), paddingTop: space(6) },
  wordmark: { fontFamily: fonts.display, fontSize: 40, lineHeight: 46, textAlign: "center", color: colors.ink },
  lede: { maxWidth: 300 },
  zone: { flexGrow: 1, justifyContent: "flex-end", gap: space(4), paddingTop: space(8) },
  zoneLabel: { paddingHorizontal: space(1) },
  stack: { gap: space(2.5) },
  empty: { paddingHorizontal: space(4) },
  grid: { flexDirection: "row", gap: space(3) },
  cell: { flex: 1 },
  tileEmoji: { fontSize: 26 },
  codeInput: { fontFamily: fonts.display, fontSize: 26, letterSpacing: 6, textAlign: "center" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space(3) },
  me: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(2),
    minHeight: 48,
    paddingRight: space(3),
    flexShrink: 1,
  },
  meName: { flexShrink: 1 },
  passChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(1.5),
    paddingHorizontal: space(4),
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  pressed: { opacity: 0.7 },
  mark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  markText: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
});
