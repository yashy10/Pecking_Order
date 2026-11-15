import { useQuery } from "convex/react";
import { StyleSheet, View } from "react-native";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Card, Pill, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, space } from "@/theme";

// Owned by Track D. Phase 0: shows the inventory only.
// Track D: Ghost and Spy buttons with a confirm sheet and an active state (PLAN §8).

export function PowersTray({ groupId }: { groupId: Id<"groups"> }) {
  const token = useToken();
  const view = useQuery(api.rivals.view, token ? { token, groupId } : "skip");
  if (!view) return null;

  return (
    <Card>
      <Txt variant="caption" color={colors.muted}>
        POWERS
      </Txt>
      <View style={styles.row}>
        <Pill label={`👻 Ghost × ${view.me.ghost}${view.me.ghostActive ? " · on" : ""}`} />
        <Pill label={`🔭 Spy × ${view.me.spy}${view.me.spyActive ? " · on" : ""}`} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space(2), flexWrap: "wrap" },
});
