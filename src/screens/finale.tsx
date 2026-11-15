import { useQuery } from "convex/react";
import { StyleSheet, View } from "react-native";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Avatar, Card, Loading, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, radius, space } from "@/theme";

// Owned by Track D. Phase 0: a plain list. Track D: reveal from the bottom up,
// crown, emoji burst, no label on last place (PLAN §8).

export function Finale({ groupId }: { groupId: Id<"groups"> }) {
  const token = useToken();
  const data = useQuery(api.weeks.finale, token ? { token, groupId } : "skip");

  if (data === undefined) {
    return (
      <Card>
        <Loading />
      </Card>
    );
  }
  if (data === null) return null;

  const champion = data.standings[0];
  return (
    <Card testID="finale">
      <Txt variant="caption" color={colors.muted}>
        WEEK {data.week} · THE PECKING ORDER
      </Txt>
      {champion ? <Txt variant="title">👑 {champion.name} rules the roost</Txt> : null}
      {data.standings.map((s, i) => {
        const isMe = s.memberId === data.myMemberId;
        return (
          <View key={s.memberId} style={[styles.row, isMe && styles.me]}>
            <Txt style={styles.place}>{i + 1}</Txt>
            <Avatar emoji={s.emoji} hasPass={s.hasPass} size={36} />
            <Txt style={styles.grow}>
              {s.name}
              {isMe ? " (you)" : ""}
            </Txt>
            <Txt style={styles.bold}>{s.points}</Txt>
          </View>
        );
      })}
    </Card>
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
  place: { width: 24, fontWeight: "800", color: colors.muted },
  grow: { flex: 1 },
  bold: { fontWeight: "800" },
});
