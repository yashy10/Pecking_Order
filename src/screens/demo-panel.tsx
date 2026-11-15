import { useConvex, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Avatar, Button, Card, EmptyState, Field, Icon, Loading, Pill, Screen, Section, Txt } from "@/components/ui";
import { colors, radius, space } from "@/theme";
import { errorMessage } from "@/utils/errors";
import { joinUrl } from "@/utils/links";
import { getItem, setItem } from "@/utils/storage";

// Owned by the lead. The presenter's controls (PLAN §9), at /demo and linked from
// nowhere. Built for a laptop on a projector: it never shows anyone's points.

const KEY_STORE = "po_demo_key";
const GROUP_STORE = "po_demo_group";

export function DemoPanel() {
  const convex = useConvex();
  const [loaded, setLoaded] = useState(false);
  const [demoKey, setDemoKey] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<Id<"groups"> | null>(null);
  const [keyDraft, setKeyDraft] = useState("");
  const [codeDraft, setCodeDraft] = useState("");
  const [nameDraft, setNameDraft] = useState("The Roost");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const state = useQuery(api.demo.state, demoKey && groupId ? { demoKey, groupId } : "skip");
  const seed = useMutation(api.demo.seed);
  const botsPlay = useMutation(api.demo.botsPlay);
  const advance = useMutation(api.demo.advance);
  const makeItWednesday = useMutation(api.demo.makeItWednesday);
  const ghostAbove = useMutation(api.demo.ghostAbove);
  const grantPower = useMutation(api.demo.grantPower);
  const jumpToSunday = useMutation(api.demo.jumpToSunday);
  const resetWeek = useMutation(api.demo.resetWeek);

  useEffect(() => {
    (async () => {
      const [k, g] = await Promise.all([getItem(KEY_STORE), getItem(GROUP_STORE)]);
      setDemoKey(k);
      setGroupId(g as Id<"groups"> | null);
      setLoaded(true);
    })();
  }, []);

  function chooseGroup(id: Id<"groups">) {
    setGroupId(id);
    void setItem(GROUP_STORE, id);
  }

  async function run(label: string, action: () => Promise<string | null | void>) {
    setBusy(label);
    setError(null);
    setNote(null);
    try {
      const result = await action();
      setNote(result || `${label}: done`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  if (!loaded) {
    return (
      <Screen wide title="Demo panel">
        <Loading />
      </Screen>
    );
  }

  if (!demoKey) {
    return (
      <Screen title="Demo panel" subtitle="Presenter controls">
        <Card>
          <Txt variant="title">Unlock the controls</Txt>
          <Txt color={colors.muted}>Enter the words set with `npx convex env set DEMO_KEY`. They stay on this device.</Txt>
          <Field
            testID="demo-key-field"
            value={keyDraft}
            onChangeText={setKeyDraft}
            placeholder="Demo key"
            accessibilityLabel="Demo key"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            onSubmitEditing={() => keyDraft.trim() && setDemoKey(keyDraft.trim())}
          />
          <Button
            testID="demo-key-save"
            label="Unlock"
            disabled={!keyDraft.trim()}
            onPress={() => {
              const k = keyDraft.trim();
              setDemoKey(k);
              void setItem(KEY_STORE, k);
            }}
          />
        </Card>
      </Screen>
    );
  }

  const key = demoKey;
  const id = groupId;
  const url = state ? joinUrl(state.inviteCode) : null;

  return (
    <Screen
      wide
      title="Demo panel"
      subtitle={state ? `${state.name} · Week ${state.week}` : "Presenter controls"}
    >
      <View style={styles.columns}>
        <View style={styles.col}>
          {state && url ? (
            <Card style={styles.center} testID="demo-qr">
              <Txt variant="overline" color={colors.muted}>
                Scan to join
              </Txt>
              <Txt variant="display" align="center">
                {state.name}
              </Txt>
              <View style={styles.qr}>
                <QRCode value={url} size={340} color={colors.ink} backgroundColor={colors.surface} />
              </View>
              <Txt variant="display" style={styles.code}>
                {state.inviteCode}
              </Txt>
              <Txt variant="heading" color={colors.muted} selectable>
                {url.replace(/^https?:\/\//, "")}
              </Txt>
            </Card>
          ) : (
            <Card>
              <EmptyState
                emoji="🐣"
                title="No group yet"
                body="Create a demo group on the right, or take over an existing one by its code."
              />
            </Card>
          )}
        </View>

        <View style={styles.col}>
          {state ? (
            <Card testID="demo-status">
              <View style={styles.row}>
                <Pill label={state.dayLabel} tone={state.multiplier > 1 ? "primary" : "soft"} />
                <Pill label={PHASE[state.phase]} tone="neutral" />
              </View>
              <View style={styles.stats}>
                <Stat value={state.humans.length} label={state.humans.length === 1 ? "person" : "people"} />
                <Stat value={state.botCount} label={state.botCount === 1 ? "bot" : "bots"} />
                <Stat
                  value={state.gameType ? state.playedCount : "—"}
                  label={state.gameType ? `played ${state.gameType === "blur" ? "Blur" : "Who Said It"}` : "no game today"}
                />
              </View>
            </Card>
          ) : id && state === undefined ? (
            <Loading />
          ) : null}

          {note ? (
            <View style={[styles.toast, styles.toastGood]} accessibilityLiveRegion="polite">
              <Icon name="check" size={18} color={colors.good} />
              <Txt variant="label" style={styles.grow}>
                {note}
              </Txt>
            </View>
          ) : null}
          {error ? (
            <View style={[styles.toast, styles.toastBad]} accessibilityLiveRegion="assertive">
              <Icon name="info" size={18} color={colors.bad} />
              <Txt variant="label" color={colors.bad} style={styles.grow}>
                {error}
              </Txt>
            </View>
          ) : null}

          {state && id ? (
            <>
              <Section title="The week">
                <Card>
                  <Button
                    testID="demo-next"
                    label={`${nextStep(state)}  ▶`}
                    loading={busy === "Next"}
                    disabled={busy !== null}
                    onPress={() =>
                      run("Next", async () => {
                        await advance({ demoKey: key, groupId: id });
                        return `Done: ${nextStep(state).toLowerCase()}.`;
                      })
                    }
                  />
                  <View style={styles.grid}>
                    <Control label="Bots play today" busy={busy} onPress={() =>
                      run("Bots play today", async () => {
                        const r = await botsPlay({ demoKey: key, groupId: id });
                        return `Bots played ${r.played} and answered ${r.answered}.`;
                      })} />
                    <Control label="Make it Wednesday" busy={busy} onPress={() =>
                      run("Make it Wednesday", async () => {
                        await makeItWednesday({ demoKey: key, groupId: id });
                        return "Wildcard Wednesday is open, ×2.";
                      })} />
                    <Control testID="demo-sunday" label="Jump to Sunday" busy={busy} onPress={() =>
                      run("Jump to Sunday", async () => {
                        await jumpToSunday({ demoKey: key, groupId: id });
                        return "The finale is live on every phone.";
                      })} />
                    <Control label="Reset week" busy={busy} onPress={() =>
                      run("Reset week", async () => {
                        await resetWeek({ demoKey: key, groupId: id });
                        return "Fresh Monday.";
                      })} />
                  </View>
                </Card>
              </Section>

              <Section title="Powers" footnote="Tap a player: the rival just above them vanishes from their board.">
                <Card>
                  <View style={styles.row}>
                    {state.humans.length === 0 ? (
                      <Txt color={colors.muted}>Nobody has joined yet. Players appear here as they scan in.</Txt>
                    ) : (
                      state.humans.map((h) => (
                        <Pressable
                          key={h.memberId}
                          accessibilityRole="button"
                          accessibilityLabel={`Ghost the rival above ${h.name}`}
                          disabled={busy !== null}
                          onPress={() =>
                            run("Ghost", async () => {
                              const r = await ghostAbove({ demoKey: key, groupId: id, memberId: h.memberId });
                              return r.ghosted ? `${r.ghosted} vanished from ${h.name}'s board.` : `Nobody is above ${h.name}.`;
                            })
                          }
                          style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                        >
                          <Avatar emoji={h.emoji} size={28} />
                          <Txt variant="label">{h.name}</Txt>
                        </Pressable>
                      ))
                    )}
                  </View>
                  <View style={styles.grid}>
                    <Control label="Everyone +1 Ghost" busy={busy} onPress={() =>
                      run("Grant Ghost", async () => {
                        const r = await grantPower({ demoKey: key, groupId: id, type: "ghost" });
                        return `Gave ${r.granted} players a Ghost.`;
                      })} />
                    <Control label="Everyone +1 Spy" busy={busy} onPress={() =>
                      run("Grant Spy", async () => {
                        const r = await grantPower({ demoKey: key, groupId: id, type: "spy" });
                        return `Gave ${r.granted} players a Spy.`;
                      })} />
                  </View>
                </Card>
              </Section>
            </>
          ) : null}

          <Section title="Group">
            <Card>
              <Field
                value={nameDraft}
                onChangeText={setNameDraft}
                placeholder="Group name"
                accessibilityLabel="Demo group name"
                maxLength={30}
              />
              <Button
                testID="demo-seed"
                label="New demo group"
                icon="plus"
                variant={state ? "secondary" : "primary"}
                loading={busy === "Seed"}
                disabled={busy !== null}
                onPress={() =>
                  run("Seed", async () => {
                    const r = await seed({ demoKey: key, name: nameDraft });
                    chooseGroup(r.groupId);
                    return `Seeded ${nameDraft || "The Roost"}: Wildcard Wednesday, 12 bots. Code ${r.inviteCode}.`;
                  })
                }
              />
              <View style={styles.row}>
                <View style={styles.grow}>
                  <Field
                    value={codeDraft}
                    onChangeText={setCodeDraft}
                    placeholder="Take over by code"
                    accessibilityLabel="Group code to take over"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={8}
                  />
                </View>
                <Button
                  label="Use"
                  variant="tonal"
                  disabled={!codeDraft.trim() || busy !== null}
                  onPress={() =>
                    run("Use code", async () => {
                      const found = await convex.query(api.demo.groupByCode, { demoKey: key, code: codeDraft });
                      if (!found) throw new ConvexError("No group has that code, or the demo key is wrong.");
                      chooseGroup(found);
                      return "Switched group.";
                    })
                  }
                />
              </View>
              <Button
                label="Forget demo key"
                variant="ghost"
                size="sm"
                onPress={() => {
                  setDemoKey(null);
                  void setItem(KEY_STORE, "");
                }}
              />
            </Card>
          </Section>
        </View>
      </View>
    </Screen>
  );
}

const PHASE = { open: "Game open", revealed: "Scores revealed", finale: "Finale" } as const;
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** What Next ▶ will do from here (PLAN §6.2), so the presenter never guesses. */
function nextStep(s: { day: number; phase: keyof typeof PHASE; week: number }): string {
  if (s.phase === "finale") return `Start week ${s.week + 1}`;
  if (s.phase === "revealed") return `Start ${DAY_NAMES[s.day + 1] ?? "next day"}`;
  if (s.day === 6) return "Run the finale";
  return "Reveal today's scores";
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={styles.stat}>
      <Txt variant="title" tabular>
        {value}
      </Txt>
      <Txt variant="caption" color={colors.muted}>
        {label}
      </Txt>
    </View>
  );
}

function Control({
  label,
  onPress,
  busy,
  primary,
  testID,
}: {
  label: string;
  onPress: () => void;
  busy: string | null;
  primary?: boolean;
  testID?: string;
}) {
  return (
    <View style={styles.cell}>
      <Button
        testID={testID}
        label={label}
        variant={primary ? "primary" : "secondary"}
        disabled={busy !== null}
        onPress={onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: "row", flexWrap: "wrap", gap: space(5) },
  col: { flexGrow: 1, flexBasis: 360, gap: space(4) },
  center: { alignItems: "center", gap: space(2), paddingVertical: space(6) },
  qr: { padding: space(3), backgroundColor: colors.surface, marginVertical: space(2) },
  code: { letterSpacing: 10, marginRight: -10 },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space(2) },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  cell: { flexGrow: 1, flexBasis: 180 },
  grow: { flex: 1 },
  stats: { flexDirection: "row", gap: space(4) },
  stat: { flex: 1 },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(2),
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    borderRadius: radius.field,
  },
  toastGood: { backgroundColor: colors.goodSoft },
  toastBad: { backgroundColor: colors.badSoft },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(2),
    paddingVertical: space(1),
    paddingLeft: space(1),
    paddingRight: space(3),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipPressed: { backgroundColor: colors.sunken },
});
