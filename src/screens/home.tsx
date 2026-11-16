import { useMutation, useQuery } from "convex/react";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "@convex/_generated/api";
import {
  Avatar,
  Button,
  Card,
  Field,
  GameButton,
  Icon,
  Logo,
  Screen,
  Skeleton,
  Txt,
} from "@/components/ui";
import { ONE_LINER } from "@/constants";
import { useToken } from "@/hooks/use-identity";
import { colors, fonts, radius, space } from "@/theme";
import { errorMessage } from "@/utils/errors";
import {
  lastGroup,
  launchWasHandled,
  markLaunchHandled,
} from "@/utils/last-group";

// Owned by Track A. Home: the mark and the name at the top, and everything you can do in
// the lower half, where a thumb reaches. One thing at a time: tapping "New group" or "Join"
// swaps the lower half for that one step.
// First run goes to /welcome (onboarding). After that: your groups, then start or join one.

type Panel = "create" | "join" | null;

// Once per launch, a returning player skips this list: straight into the group this
// device opened last, or their only group. Coming back here later doesn't bounce them.

/** Show the list on the next visit instead of jumping into a group (after leaving one). */
export function skipLaunchJump(): void {
  markLaunchHandled();
}

export function Home() {
  const token = useToken();
  const me = useQuery(api.users.me, token ? { token } : "skip");
  const groups = useQuery(api.groups.mine, token ? { token } : "skip");
  const [chosen, setPanel] = useState<Panel | undefined>(undefined);
  const [opening, setOpening] = useState(!launchWasHandled());

  useEffect(() => {
    if (
      launchWasHandled() ||
      !token ||
      me === undefined ||
      (me && groups === undefined)
    )
      return;
    let cancelled = false;
    void (async () => {
      const ready =
        me !== null &&
        me.signedIn &&
        !me.needsProfile &&
        groups !== undefined &&
        groups.length > 0;
      const last = ready ? await lastGroup() : null;
      if (cancelled || launchWasHandled()) return;
      markLaunchHandled();
      const pick = ready
        ? (groups.find((g) => g.groupId === last) ??
          (groups.length === 1 ? groups[0] : undefined))
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
    <Screen backdrop="full" place="home" scroll={false} fill>
      <View style={styles.brand}>
        <Logo size={panel ? 30 : 40} />
        <Text style={styles.wordmark} accessibilityRole="header">
          Pecking{"\n"}Order
        </Text>
        {panel || hasGroups ? null : (
          <Txt color={colors.muted} style={styles.lede}>
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
        ) : panel === "create" ? (
          <CreateGroup onCancel={() => setPanel(null)} />
        ) : panel === "join" ? (
          <JoinWithCode onCancel={() => setPanel(null)} />
        ) : (
          <>
            {groups === undefined ? (
              <Skeleton height={72} />
            ) : hasGroups ? (
              <View style={styles.groups} testID="group-list">
                <Txt variant="overline" style={styles.zoneLabel}>
                  Your groups
                </Txt>
                {/* The one part of Home that can scroll: the page itself always fits the screen. */}
                <ScrollView
                  style={styles.list}
                  contentContainerStyle={styles.stack}
                  showsVerticalScrollIndicator={false}
                >
                  {groups.map((g, i) => (
                    <GameButton
                      dense
                      key={g.groupId}
                      tone={i === 0 ? "brass" : "glass"}
                      overline={
                        g.phase === "finale"
                          ? "Results are in"
                          : g.phase === "revealed"
                            ? `${g.dayLabel} · scores are out`
                            : g.dayLabel
                      }
                      title={g.name}
                      leading={<GroupMark name={g.name} onFill={i === 0} />}
                      onPress={() => router.push(`/g/${g.groupId}`)}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : (
              <Txt color={colors.muted} align="center" style={styles.empty}>
                Start a group for your friends, or join theirs with a code.
              </Txt>
            )}

            <AdminGames />

            <View style={styles.grid}>
              <View style={styles.cell}>
                <GameButton
                  dense
                  compact
                  tone={hasGroups ? "glass" : "brass"}
                  overline="Start one"
                  title="New group"
                  leading={<Icon name="plus" size={20} />}
                  testID="open-create"
                  onPress={() => setPanel("create")}
                />
              </View>
              <View style={styles.cell}>
                <GameButton
                  dense
                  compact
                  overline="Have a code?"
                  title="Join"
                  leading={<Icon name="key" size={20} />}
                  testID="open-join"
                  onPress={() => setPanel("join")}
                />
              </View>
            </View>

            <View style={styles.footer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Playing as ${me.name}. Open profile`}
                testID="edit-profile"
                onPress={() => router.push("/profile")}
                style={({ pressed }) => [styles.me, pressed && styles.pressed]}
              >
                <Avatar emoji={me.emoji} hasPass={me.hasPass} size={28} />
                <Txt variant="label" numberOfLines={1} style={styles.meName}>
                  {me.name}
                </Txt>
                <Icon name="chevron" size={16} color={colors.muted} />
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

/** Admin Games: every game open, for every account. Joins you on the first tap. */
function AdminGames() {
  const token = useToken();
  const enter = useMutation(api.showcase.enter);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function open() {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { groupId } = await enter({ token });
      router.push(`/g/${groupId}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View>
      <GameButton
        dense
        testID="admin-games"
        overline={busy ? "Opening…" : "All 11 games · play any time"}
        title="Admin Games"
        leading={<Text style={styles.adminGlyph}>🎮</Text>}
        onPress={open}
      />
      {error ? <Txt variant="caption" color={colors.bad}>{error}</Txt> : null}
    </View>
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
        label="Create group"
        icon="plus"
        onPress={onCreate}
        loading={busy}
        disabled={!name.trim()}
      />
      <Txt variant="caption" color={colors.muted} align="center">
        You get a link and a code to share next.
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
      <Txt variant="title">Enter your code</Txt>
      <Txt color={colors.muted}>It is on your friend's invite screen.</Txt>
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
function GroupMark({ name, onFill }: { name: string; onFill?: boolean }) {
  return (
    <View style={[styles.mark, onFill && styles.markOnFill]}>
      <Text style={styles.markText}>
        {name.trim().charAt(0).toUpperCase() || "?"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  adminGlyph: { fontSize: 20 },
  brand: { alignItems: "flex-start", gap: space(3), paddingTop: space(2) },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -0.9,
    color: colors.ink,
  },
  lede: { maxWidth: 300 },
  zone: { flex: 1, minHeight: 0, justifyContent: "flex-end", gap: space(3) },
  zoneLabel: { paddingHorizontal: space(1) },
  stack: { gap: space(2) },
  groups: { flexShrink: 1, minHeight: 0, gap: space(2) },
  list: { flexGrow: 0 },
  empty: { paddingHorizontal: space(4) },
  grid: { flexDirection: "row", gap: space(2) },
  cell: { flex: 1 },
  codeInput: {
    fontFamily: fonts.display,
    fontSize: 24,
    letterSpacing: 6,
    textAlign: "center",
  },
  footer: { flexDirection: "row", alignItems: "center" },
  me: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(2),
    minHeight: 40,
    paddingLeft: space(1),
    paddingRight: space(3),
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    flexShrink: 1,
  },
  meName: { flexShrink: 1 },
  pressed: { opacity: 0.7 },
  mark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sunken,
  },
  markOnFill: { backgroundColor: colors.surface },
  markText: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
});
