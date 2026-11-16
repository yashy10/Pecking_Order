import { router } from "expo-router";
import { StyleSheet, Text } from "react-native";
import type { Id } from "@convex/_generated/dataModel";
import { Banner } from "@/components/banner";
import { GroupScreen } from "@/components/group-screen";
import { PromptCard } from "@/components/prompt-card";
import { TodayCard } from "@/components/today-card";
import { Button, Card, Txt } from "@/components/ui";
import { colors } from "@/theme";

// Owned by the lead. The Today tab: what to do right now. News from the last reveal,
// today's games, and today's question (which feeds a later friends game).

export function TodayTab({ groupId }: { groupId: Id<"groups"> }) {
  return (
    <GroupScreen groupId={groupId}>
      {(today) => (
        <>
          <Banner groupId={groupId} />
          {today.group.phase === "finale" ? (
            <Card tone="soft" testID="finale-teaser">
              <Text style={styles.crown}>👑</Text>
              <Txt variant="title">The full board is out</Txt>
              <Txt color={colors.muted}>Week {today.group.week} is over. See who rules the roost, and where you landed.</Txt>
              <Button label="See the pecking order" onPress={() => router.navigate(`/g/${groupId}/board`)} />
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
  crown: { fontSize: 36 },
});
