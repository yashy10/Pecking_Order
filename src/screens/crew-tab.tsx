import { useQuery } from "convex/react";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { GroupScreen } from "@/components/group-screen";
import { NotifyCard } from "@/components/notify-card";
import { Avatar, Button, Card, Icon, type IconName, List, ListRow, Section, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, fonts, radius, space } from "@/theme";
import type { Today } from "@/utils/convex";
import * as haptics from "@/utils/haptics";
import { joinUrl } from "@/utils/links";

// Owned by the lead. The Crew tab: the group itself. Bring people in, see who's
// playing, see where the week is, and the rules in one place.

export function CrewTab({ groupId }: { groupId: Id<"groups"> }) {
  return <GroupScreen groupId={groupId} place="crew">{(today) => <Crew groupId={groupId} today={today} />}</GroupScreen>;
}

function Crew({ groupId, today }: { groupId: Id<"groups">; today: Today }) {
  const { group, played } = today;
  const token = useToken();
  const me = useQuery(api.users.me, token ? { token } : "skip");
  const preview = useQuery(api.groups.preview, { code: group.inviteCode });
  const url = joinUrl(group.inviteCode);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    await Clipboard.setStringAsync(url);
    haptics.success();
    setCopied(true);
  }

  async function share() {
    try {
      await Share.share({ message: `Join ${group.name} on Pecking Order: ${url}` });
    } catch {
      await copy();
    }
  }

  const emojis = preview?.emojis ?? [];
  const extra = Math.max(0, group.memberCount - emojis.length);

  return (
    <>
      <Section title="Invite friends">
        <Card style={styles.invite}>
          <Txt variant="caption" color={colors.muted}>
            Group code
          </Txt>
          <Txt variant="display" style={styles.code} selectable testID="crew-code">
            {group.inviteCode}
          </Txt>
          <Txt variant="caption" color={colors.muted} numberOfLines={1} selectable>
            {url.replace(/^https?:\/\//, "")}
          </Txt>
          <View style={styles.actions}>
            <View style={styles.grow}>
              <Button label="Share" icon="share" size="sm" onPress={share} />
            </View>
            <View style={styles.grow}>
              <Button
                label={copied ? "Copied" : "Copy link"}
                icon={copied ? "check" : "copy"}
                size="sm"
                variant="tonal"
                onPress={copy}
              />
            </View>
          </View>
        </Card>
        <List>
          <ListRow
            title="Show QR code"
            subtitle="For friends in the same room"
            leading={<RowGlyph icon="qr" />}
            onPress={() => router.push(`/g/${groupId}/invite`)}
          />
        </List>
      </Section>

      <Section title="This week" footnote={weekLine(today)}>
        <WeekStrip day={group.day} phase={group.phase} />
      </Section>

      <Section title={`${group.memberCount} playing`}>
        <Card>
          <View style={styles.flock}>
            {emojis.map((e, i) => (
              <View key={`${e}-${i}`} style={[styles.flockItem, i > 0 && styles.overlap]}>
                <Avatar emoji={e} size={40} />
              </View>
            ))}
            {extra > 0 ? (
              <View style={[styles.flockItem, styles.overlap, styles.more]}>
                <Txt variant="caption" color={colors.muted} tabular>
                  +{extra}
                </Txt>
              </View>
            ) : null}
          </View>
          {group.phase === "open" && today.game ? (
            <Txt variant="caption" color={colors.muted}>
              {played.count === 0
                ? "Nobody has played today yet."
                : `${played.count} of ${group.memberCount} played today. Scores stay sealed until the reveal.`}
            </Txt>
          ) : null}
        </Card>
      </Section>

      <Section title="How it works">
        <List>
          {RULES.map((r) => (
            <ListRow key={r.title} title={r.title} subtitle={r.body} leading={<RowGlyph icon={r.icon} />} />
          ))}
        </List>
      </Section>

      <Section title="You">
        <List>
          {me ? (
            <ListRow
              title={me.name}
              subtitle={me.hasPass ? "Season Pass ring is on" : "Your name and bird in every group"}
              leading={<Avatar emoji={me.emoji} hasPass={me.hasPass} size={40} />}
            />
          ) : null}
          <ListRow
            title="Season Pass"
            subtitle={me?.hasPass ? "You have it" : "A ring on your avatar. Free, cosmetic only"}
            leading={<RowGlyph text="✨" />}
            onPress={() => router.push("/pass")}
            testID="crew-pass"
          />
        </List>
      </Section>
      <NotifyCard variant="settings" />
    </>
  );
}

const RULES = [
  { icon: "search", title: "One game a day", body: "Blur most days: guess the photo as it sharpens. Faster is more points." },
  { icon: "lock", title: "Scores are sealed", body: "Nobody sees today's points until the evening reveal." },
  { icon: "sparkle", title: "Wildcard Wednesday", body: "Double points. A good day to catch up." },
  { icon: "key", title: "Ghost and Spy", body: "Vanish from rivals' boards, or peek further up yours. Earned, never bought." },
  { icon: "crown", title: "Sunday finale", body: "The full board, revealed from the bottom up." },
] as const;

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function weekLine(today: Today): string {
  const { day, phase } = today.group;
  if (phase === "finale") return "The week is over. The full board is on the Board tab.";
  if (day === 6) return "No game today. The full board drops tonight.";
  if (phase === "revealed") return "Today's scores are in. The next game drops tomorrow.";
  return `${DAY_NAMES[day]}'s game is open until tonight's reveal.`;
}

function WeekStrip({ day, phase }: { day: number; phase: Today["group"]["phase"] }) {
  return (
    <Card style={styles.week} testID="week-strip">
      {DAYS.map((d, i) => {
        const done = i < day || (i === day && phase !== "open");
        const current = i === day;
        const special = i === 2 ? "×2" : i === 6 ? "👑" : null;
        return (
          <View
            key={i}
            style={styles.day}
            accessible
            accessibilityLabel={`${DAY_NAMES[i]}${current ? ", today" : ""}${done ? ", done" : ""}`}
          >
            <Txt variant="caption" color={current ? colors.ink : colors.muted}>
              {d}
            </Txt>
            <View style={[styles.dayDot, done && styles.dayDone, current && styles.dayCurrent]}>
              {done && !current ? (
                <Text style={styles.tick}>✓</Text>
              ) : special ? (
                <Txt variant="caption" color={current ? colors.primaryInk : colors.muted} style={styles.special}>
                  {special}
                </Txt>
              ) : null}
            </View>
          </View>
        );
      })}
    </Card>
  );
}

function RowGlyph({ text, icon }: { text?: string; icon?: IconName }) {
  return (
    <View style={styles.glyph}>
      {icon ? <Icon name={icon} size={20} /> : <Text style={styles.glyphText}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  invite: { alignItems: "center", gap: space(1), paddingVertical: space(5) },
  code: { letterSpacing: 8, marginRight: -8 },
  actions: { flexDirection: "row", gap: space(2), alignSelf: "stretch", marginTop: space(3) },
  grow: { flex: 1 },
  flock: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  flockItem: { borderRadius: 22, borderWidth: 2, borderColor: colors.surface },
  overlap: { marginLeft: -10 },
  more: { width: 44, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: colors.sunken },
  week: { flexDirection: "row", justifyContent: "space-between", paddingVertical: space(3) },
  day: { alignItems: "center", gap: space(1.5), flex: 1 },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sunken,
  },
  dayDone: { backgroundColor: colors.goodSoft },
  dayCurrent: { backgroundColor: colors.primary },
  tick: { color: colors.good, fontSize: 14, fontFamily: fonts.heavy },
  special: { fontFamily: fonts.heavy },
  glyph: {
    width: 40,
    height: 40,
    borderRadius: radius.field,
    backgroundColor: colors.sunken,
    alignItems: "center",
    justifyContent: "center",
  },
  glyphText: { fontSize: 20, color: colors.ink },
});
