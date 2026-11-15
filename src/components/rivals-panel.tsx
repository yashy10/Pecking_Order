import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOutUp, LinearTransition } from "react-native-reanimated";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Avatar, Card, Icon, Pill, Skeleton, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, space } from "@/theme";

// Owned by Track D (done by the lead). Your neighbourhood: the rival above, you, the
// rival below. Rows are keyed by member, so when the query result changes (a reveal,
// a ghost) they slide to their new places, leavers fade out and arrivals fade in.
// Never a rank and never a count (PLAN §6.1): only names and gaps.

type RivalsView = NonNullable<FunctionReturnType<typeof api.rivals.view>>;
type Slot = RivalsView["above"][number];

const move = LinearTransition.springify().damping(18);

export function RivalsPanel({ groupId }: { groupId: Id<"groups"> }) {
  const token = useToken();
  const view = useQuery(api.rivals.view, token ? { token, groupId } : "skip");

  if (view === undefined) {
    return (
      <Card>
        <Skeleton height={44} />
        <Skeleton height={44} />
        <Skeleton height={44} />
      </Card>
    );
  }
  if (view === null) return null;

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

  const me = view.me;
  return (
    <Card flush testID="rivals-panel">
      {rows.map((row, i) => (
        <Animated.View
          key={row.key}
          layout={move}
          entering={FadeIn.duration(400)}
          exiting={FadeOutUp.duration(500)}
          style={i > 0 && styles.divider}
        >
          {row.slot === "me" ? (
            <View style={[styles.row, styles.me]} accessible accessibilityLabel={`You, ${me.weekPoints} points this week`}>
              <Avatar emoji={me.emoji} hasPass={me.hasPass} size={40} />
              <View style={styles.grow}>
                <Txt variant="heading">You</Txt>
                <Txt variant="caption" color={colors.muted}>
                  {me.lastDelta > 0 ? `+${me.lastDelta} at the last reveal` : "This week so far"}
                  {me.streak > 1 ? ` · 🔥 ${me.streak}-day streak` : ""}
                </Txt>
              </View>
              <View style={styles.figure}>
                <Txt variant="title" tabular>
                  {me.weekPoints}
                </Txt>
                <Txt variant="caption" color={colors.muted}>
                  points
                </Txt>
              </View>
            </View>
          ) : (
            <SlotRow slot={row.slot} side={row.side === "above" ? "above" : "below"} />
          )}
        </Animated.View>
      ))}
    </Card>
  );
}

function SlotRow({ slot, side }: { slot: Slot; side: "above" | "below" }) {
  if (slot.kind === "fog") {
    return (
      <View style={styles.row} testID="fog-row" accessible accessibilityLabel={`Hidden, ${side} you`}>
        <Avatar fog size={40} />
        <View style={styles.grow}>
          <Txt variant="heading" color={colors.muted}>
            ???
          </Txt>
          <Txt variant="caption" color={colors.muted}>
            Lost in the fog
          </Txt>
        </View>
        <Icon name={side === "above" ? "arrowUp" : "arrowDown"} size={18} color={colors.fog} />
      </View>
    );
  }
  const tied = slot.gap === 0;
  const word = tied ? "tied" : side === "above" ? "ahead" : "behind";
  return (
    <View
      style={styles.row}
      testID="rival-row"
      accessible
      accessibilityLabel={tied ? `${slot.name}, tied with you` : `${slot.name}, ${slot.gap} points ${word}`}
    >
      <Avatar emoji={slot.emoji} hasPass={slot.hasPass} size={40} />
      <View style={styles.grow}>
        <Txt variant="heading" numberOfLines={1}>
          {slot.name}
        </Txt>
        {slot.moved === "passedYou" ? (
          <Pill label="Passed you" tone="badSoft" />
        ) : slot.moved === "youPassed" ? (
          <Pill label="You passed them" tone="goodSoft" />
        ) : (
          <Txt variant="caption" color={colors.muted}>
            {side === "above" ? "Above you" : "Below you"}
          </Txt>
        )}
      </View>
      <View style={styles.figure}>
        {tied ? (
          <Txt variant="heading" color={colors.muted}>
            Tied
          </Txt>
        ) : (
          <>
            <Txt variant="heading" tabular color={side === "above" ? colors.ink : colors.muted}>
              {slot.gap}
            </Txt>
            <Txt variant="caption" color={colors.muted}>
              {word}
            </Txt>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    minHeight: 68,
  },
  me: { backgroundColor: colors.primarySoft },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  grow: { flex: 1, gap: 3, alignItems: "flex-start" },
  figure: { alignItems: "flex-end" },
});
