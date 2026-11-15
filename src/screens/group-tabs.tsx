import { useQuery } from "convex/react";
import { TabList, TabSlot, TabTrigger, Tabs } from "expo-router/ui";
import { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { TabButton } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, layout, space } from "@/theme";
import { rememberGroup } from "@/utils/last-group";

// Owned by the lead. The four tabs inside a group:
//   Today  — what to do now: play, answer the question, the latest news
//   Board  — where you stand: rivals and powers, and the finale on Sunday
//   Sunday — the countdown to the finale, when the full board drops
//   Crew   — the group itself: invite, who's in, the week, the rules
// Play and Invite sit above the tabs in the root stack, so a round is full-screen.

export function GroupTabs({ groupId }: { groupId: Id<"groups"> }) {
  const insets = useSafeAreaInsets();
  const token = useToken();
  const today = useQuery(api.today.get, token ? { token, groupId } : "skip");
  const member = Boolean(today);
  // Next launch opens straight into the group this device opened last (home.tsx).
  useEffect(() => {
    if (member) rememberGroup(groupId);
  }, [member, groupId]);

  const toPlay = !!today?.game && today.group.phase === "open" && today.myPlay.status !== "done";
  const finale = today?.group.phase === "finale";
  const base = `/g/${groupId}`;
  // On a wide window, keep the tabs inside the same 480-point column as the content.
  const { width } = useWindowDimensions();
  const inset = Math.max(0, (width - layout.maxWidth) / 2);

  return (
    <Tabs style={styles.root}>
      <TabSlot />
      {/* TabList must be a direct child of Tabs: that's how the router finds the triggers. */}
      <TabList asChild>
        <View
          style={StyleSheet.flatten([
            styles.bar,
            { paddingBottom: Math.max(insets.bottom, space(2)), paddingHorizontal: inset },
          ])}
        >
          <TabTrigger name="index" href={base} asChild>
            <TabButton icon="today" label="Today" place="today" dot={toPlay} testID="tab-today" />
          </TabTrigger>
          <TabTrigger name="board" href={`${base}/board`} asChild>
            <TabButton icon="board" label="Board" place="board" dot={finale} testID="tab-board" />
          </TabTrigger>
          <TabTrigger name="sunday" href={`${base}/sunday`} asChild>
            <TabButton icon="hourglass" label="Sunday" place="sunday" testID="tab-sunday" />
          </TabTrigger>
          <TabTrigger name="crew" href={`${base}/crew`} asChild>
            <TabButton icon="crew" label="Friends" place="crew" testID="tab-crew" />
          </TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  bar: {
    flexDirection: "row",
    minHeight: layout.tabBarHeight,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
