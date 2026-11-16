import { useQuery } from "convex/react";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Share, StyleSheet, View } from "react-native";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { GroupScreen } from "@/components/group-screen";
import { NotifyCard } from "@/components/notify-card";
import {
  Avatar,
  Button,
  Card,
  List,
  ListRow,
  Section,
  Txt,
} from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, space } from "@/theme";
import type { Today } from "@/utils/convex";
import * as haptics from "@/utils/haptics";
import { joinUrl } from "@/utils/links";

// Owned by the lead. The Friends tab: the group itself. Bring people in, see who's playing,
// and reach your profile and reminders. Kept to one screen: the week lives on the Sunday tab
// and the rules on the Today tab's three steps.

export function CrewTab({ groupId }: { groupId: Id<"groups"> }) {
  return (
    <GroupScreen groupId={groupId} place="crew">
      {(today) => <Crew groupId={groupId} today={today} />}
    </GroupScreen>
  );
}

function Crew({ groupId, today }: { groupId: Id<"groups">; today: Today }) {
  const { group } = today;
  // Anyone who has finished at least one of today's games.
  const playedToday = Math.max(0, ...today.games.map((g) => g.played.count));
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
      await Share.share({
        message: `Join ${group.name} on Pecking Order: ${url}`,
      });
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
          <Txt
            variant="display"
            style={styles.code}
            selectable
            testID="crew-code"
          >
            {group.inviteCode}
          </Txt>
          <Txt
            variant="caption"
            color={colors.muted}
            numberOfLines={1}
            selectable
          >
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
      </Section>

      <Section title={`${group.memberCount} playing`}>
        <Card>
          <View style={styles.flock}>
            {emojis.map((e, i) => (
              <View
                key={`${e}-${i}`}
                style={[styles.flockItem, i > 0 && styles.overlap]}
              >
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
          {group.phase === "open" && today.games.length > 0 ? (
            <Txt variant="caption" color={colors.muted}>
              {playedToday === 0
                ? "Nobody has played today yet."
                : `${playedToday} of ${group.memberCount} played today. Scores stay sealed until the reveal.`}
            </Txt>
          ) : null}
        </Card>
      </Section>

      {me ? (
        <List>
          <ListRow
            title={me.name}
            subtitle="Your profile"
            leading={<Avatar emoji={me.emoji} hasPass={me.hasPass} size={40} />}
            onPress={() => router.push("/profile")}
            testID="crew-profile"
          />
          <ListRow
            title="Group settings"
            subtitle="Rename it, a new invite code, leave or delete"
            leading={<Avatar emoji="⚙️" size={40} />}
            onPress={() => router.push(`/g/${groupId}/settings`)}
            testID="crew-settings"
          />
        </List>
      ) : null}
      <NotifyCard variant="settings" />
    </>
  );
}

const styles = StyleSheet.create({
  invite: { alignItems: "center", gap: space(1), paddingVertical: space(5) },
  code: { letterSpacing: 8, marginRight: -8 },
  actions: {
    flexDirection: "row",
    gap: space(2),
    alignSelf: "stretch",
    marginTop: space(3),
  },
  grow: { flex: 1 },
  flock: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  flockItem: { borderRadius: 22, borderWidth: 2, borderColor: colors.surface },
  overlap: { marginLeft: -10 },
  more: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sunken,
  },
});
