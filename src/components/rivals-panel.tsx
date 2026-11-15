import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOutUp, LinearTransition } from "react-native-reanimated";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Avatar, Card, Pill, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, radius, space } from "@/theme";

// Owned by Track D. Your neighbourhood: the rival above, you, the rival below.
// Rows are keyed by member, so when the query result changes (a reveal, a
// ghost) they slide to their new places, leavers fade out and arrivals fade in.

type RivalsView = NonNullable<FunctionReturnType<typeof api.rivals.view>>;
type Slot = RivalsView["above"][number];

const move = LinearTransition.springify().damping(18);

export function RivalsPanel({ groupId }: { groupId: Id<"groups"> }) {
  const token = useToken();
  const view = useQuery(api.rivals.view, token ? { token, groupId } : "skip");
  if (!view) return null;

  const rows: { key: string; slot: Slot | "me"; side: "above" | "below" | "me" }[] = [
    ...[...view.above].reverse().map((slot, i) => ({
      key: slot.kind === "rival" ? slot.memberId : `fog-above-${view.above.length - 1 - i}`,
      slot,
      side: "above" as const,
    })),
    { key: "me", slot: "me" as const, side: "me" as const },
    ...view.below.map((slot, i) => ({
      key: slot.kind === "rival" ? slot.memberId : `fog-below-${i}`,
      slot,
      side: "below" as const,
    })),
  ];

  return (
    <Card testID="rivals-panel">
      <View style={styles.titleRow}>
        <Txt variant="caption" color={colors.muted}>
          YOUR NEIGHBOURHOOD
        </Txt>
        {view.me.spyActive ? <Pill label="🔭 Spy on" tone="primary" /> : null}
        {view.me.ghostActive ? <Pill label="👻 You're a ghost" tone="fog" /> : null}
      </View>
      {rows.map((row) => (
        <Animated.View key={row.key} layout={move} entering={FadeIn.duration(400)} exiting={FadeOutUp.duration(500)}>
          {row.slot === "me" ? (
            <View style={[styles.row, styles.me]}>
              <Avatar emoji={view.me.emoji} hasPass={view.me.hasPass} />
              <View style={styles.grow}>
                <Txt style={styles.bold}>You</Txt>
                <Txt variant="caption" color={colors.muted}>
                  {view.me.weekPoints} points this week
                  {view.me.lastDelta > 0 ? ` · +${view.me.lastDelta} at the last reveal` : ""}
                </Txt>
              </View>
            </View>
          ) : (
            <SlotRow slot={row.slot} side={row.side === "above" ? "above" : "below"} />
          )}
        </Animated.View>
      ))}
      <Txt variant="caption" color={colors.muted}>
        Nobody sees the full board until Sunday.
      </Txt>
    </Card>
  );
}

function SlotRow({ slot, side }: { slot: Slot; side: "above" | "below" }) {
  if (slot.kind === "fog") {
    return (
      <View style={styles.row} testID="fog-row">
        <Avatar fog />
        <Txt color={colors.muted} style={styles.grow}>
          ???
        </Txt>
      </View>
    );
  }
  const gap = slot.gap === 0 ? "tied" : side === "above" ? `${slot.gap} ahead` : `${slot.gap} behind`;
  return (
    <View style={styles.row} testID="rival-row">
      <Avatar emoji={slot.emoji} hasPass={slot.hasPass} />
      <View style={styles.grow}>
        <Txt style={styles.bold}>{slot.name}</Txt>
        <Txt variant="caption" color={colors.muted}>
          {gap}
        </Txt>
      </View>
      {slot.moved === "passedYou" ? <Pill label="passed you" tone="bad" /> : null}
      {slot.moved === "youPassed" ? <Pill label="you passed" tone="good" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", gap: space(2), flexWrap: "wrap" },
  row: { flexDirection: "row", alignItems: "center", gap: space(3) },
  me: {
    backgroundColor: colors.bg,
    borderRadius: radius.field,
    padding: space(2),
    marginHorizontal: -space(2),
  },
  grow: { flex: 1 },
  bold: { fontWeight: "800" },
});
