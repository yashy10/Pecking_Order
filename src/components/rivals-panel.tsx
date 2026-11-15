import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { StyleSheet, View } from "react-native";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Avatar, Card, Pill, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, radius, space } from "@/theme";

// Owned by Track D. Phase 0: renders whatever rivals.view returns.
// Track D: animate rows on a reveal, fade a ghost out (PLAN §8).

type View_ = NonNullable<FunctionReturnType<typeof api.rivals.view>>;
type Slot = View_["above"][number];

export function RivalsPanel({ groupId }: { groupId: Id<"groups"> }) {
  const token = useToken();
  const view = useQuery(api.rivals.view, token ? { token, groupId } : "skip");
  if (!view) return null;

  return (
    <Card testID="rivals-panel">
      <Txt variant="caption" color={colors.muted}>
        YOUR NEIGHBOURHOOD
      </Txt>
      {[...view.above].reverse().map((slot, i) => (
        <SlotRow key={`above-${i}`} slot={slot} side="above" />
      ))}
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
      {view.below.map((slot, i) => (
        <SlotRow key={`below-${i}`} slot={slot} side="below" />
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
      <View style={styles.row}>
        <Avatar fog />
        <Txt color={colors.muted} style={styles.grow}>
          ???
        </Txt>
      </View>
    );
  }
  const gap = slot.gap === 0 ? "tied" : side === "above" ? `${slot.gap} ahead` : `${slot.gap} behind`;
  return (
    <View style={styles.row}>
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
