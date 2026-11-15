import { useQuery } from "convex/react";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Banner } from "@/components/banner";
import { PowersTray } from "@/components/powers-tray";
import { PromptCard } from "@/components/prompt-card";
import { RivalsPanel } from "@/components/rivals-panel";
import { TodayCard } from "@/components/today-card";
import { Button, Card, Loading, Pill, Screen, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { Finale } from "@/screens/finale";
import { colors, space } from "@/theme";

// Owned by Track A. A fixed stack of slots (PLAN §6.5): each track fills its own
// component and never edits another's.

export function GroupHub({ groupId }: { groupId: Id<"groups"> }) {
  const token = useToken();
  const today = useQuery(api.today.get, token ? { token, groupId } : "skip");

  if (today === undefined) {
    return (
      <Screen back>
        <Loading />
      </Screen>
    );
  }

  if (today === null) {
    return (
      <Screen back title="Not in this group">
        <Card>
          <Txt>This device isn't in that group. Ask a friend for the invite link.</Txt>
        </Card>
        <Button label="Go home" onPress={() => router.replace("/")} />
      </Screen>
    );
  }

  const { group } = today;
  const wildcard = (today.game?.multiplier ?? 1) > 1;

  return (
    <Screen
      back
      title={group.name}
      right={
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.push(`/g/${groupId}/invite`)}
        >
          <Txt color={colors.primary} style={styles.link}>
            Invite
          </Txt>
        </Pressable>
      }
    >
      <View style={styles.meta}>
        <Pill label={group.dayLabel} tone={wildcard ? "primary" : "accent"} />
        <Txt variant="caption" color={colors.muted}>
          Week {group.week} · {group.memberCount} playing
        </Txt>
      </View>
      <Banner groupId={groupId} />
      {group.phase === "finale" ? (
        <Finale groupId={groupId} />
      ) : (
        <>
          <TodayCard groupId={groupId} today={today} />
          <RivalsPanel groupId={groupId} />
          <PowersTray groupId={groupId} />
          <PromptCard today={today} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { flexDirection: "row", alignItems: "center", gap: space(3) },
  link: { fontWeight: "800" },
});
