import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { Id } from "@convex/_generated/dataModel";
import { Banner } from "@/components/banner";
import { GroupScreen } from "@/components/group-screen";
import { PromptCard } from "@/components/prompt-card";
import { TodayCard } from "@/components/today-card";
import { Button, Card, Mark, Txt } from "@/components/ui";
import { colors } from "@/theme";

// Owned by the lead. The Today tab: what to do right now. News from the last reveal,
// today's games, and today's question (which feeds a later friends game).

export function TodayTab({ groupId }: { groupId: Id<"groups"> }) {
  return (
    <GroupScreen groupId={groupId} place="today">
      {(today) => (
        <>
          <Banner groupId={groupId} />
          {today.group.phase === "finale" ? (
            <Card tone="soft" testID="finale-teaser" style={styles.center}>
              <View style={styles.mark}>
                <Mark icon="crown" tone="plain" />
              </View>
              <Txt variant="title" align="center">
                The full board is out
              </Txt>
              <Txt color={colors.muted} align="center">
                Week {today.group.week} is over. See who won, and where you landed.
              </Txt>
              <Button label="See the board" onPress={() => router.navigate(`/g/${groupId}/board`)} />
            </Card>
          ) : (
            <>
              <TodayCard groupId={groupId} today={today} />
              <PromptCard today={today} />
            </>
          )}
        </>
      )}
    </GroupScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "stretch" },
  mark: { alignItems: "center" },
});
