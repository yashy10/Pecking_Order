import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button, Card, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, radius, space } from "@/theme";
import { errorMessage } from "@/utils/errors";
import * as haptics from "@/utils/haptics";

// Owned by Track D. Ghost and Spy, with a confirm step and an active state.
// Powers are earned, never bought (PLAN §6.3).

type Power = "ghost" | "spy";

const INFO: Record<Power, { emoji: string; name: string; line: string; on: string }> = {
  ghost: {
    emoji: "👻",
    name: "Ghost",
    line: "Vanish from your rivals' boards until tomorrow.",
    on: "Invisible until tomorrow",
  },
  spy: {
    emoji: "🔭",
    name: "Spy",
    line: "See two more places above you until tomorrow.",
    on: "Spying until tomorrow",
  },
};

export function PowersTray({ groupId }: { groupId: Id<"groups"> }) {
  const token = useToken();
  const view = useQuery(api.rivals.view, token ? { token, groupId } : "skip");
  const activatePower = useMutation(api.powers.use);
  const [confirming, setConfirming] = useState<Power | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!view) return null;
  const me = view.me;
  const count: Record<Power, number> = { ghost: me.ghost, spy: me.spy };
  const active: Record<Power, boolean> = { ghost: me.ghostActive, spy: me.spyActive };

  async function confirm(type: Power) {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      await activatePower({ token, groupId, type });
      haptics.success();
      setConfirming(null);
    } catch (e) {
      setError(errorMessage(e));
      haptics.error();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card testID="powers-tray">
      <Txt variant="caption" color={colors.muted}>
        POWERS
      </Txt>
      <View style={styles.row}>
        {(["ghost", "spy"] as const).map((type) => {
          const info = INFO[type];
          const disabled = active[type] || count[type] < 1;
          return (
            <Pressable
              key={type}
              testID={`power-${type}`}
              accessibilityRole="button"
              accessibilityState={{ disabled, selected: confirming === type }}
              disabled={disabled}
              onPress={() => {
                haptics.tap();
                setError(null);
                setConfirming(confirming === type ? null : type);
              }}
              style={[
                styles.power,
                active[type] && styles.powerOn,
                confirming === type && styles.powerPicked,
                !active[type] && count[type] < 1 && styles.powerEmpty,
              ]}
            >
              <Text style={styles.emoji}>{info.emoji}</Text>
              <View style={styles.grow}>
                <Txt style={styles.bold}>
                  {info.name} × {count[type]}
                </Txt>
                <Txt variant="caption" color={active[type] ? colors.primaryInk : colors.muted}>
                  {active[type] ? info.on : count[type] < 1 ? "None left" : "Tap to use"}
                </Txt>
              </View>
            </Pressable>
          );
        })}
      </View>

      {confirming ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.confirm}>
          <Txt>{INFO[confirming].line}</Txt>
          {error ? <Txt color={colors.bad}>{error}</Txt> : null}
          <View style={styles.row}>
            <View style={styles.grow}>
              <Button
                testID="power-confirm"
                label={`Use ${INFO[confirming].name}`}
                onPress={() => confirm(confirming)}
                loading={busy}
              />
            </View>
            <View style={styles.grow}>
              <Button label="Not now" variant="ghost" onPress={() => setConfirming(null)} />
            </View>
          </View>
        </Animated.View>
      ) : error ? (
        <Txt color={colors.bad}>{error}</Txt>
      ) : (
        <Txt variant="caption" color={colors.muted}>
          Earned with streaks and the best score of the day. Never bought.
        </Txt>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space(3) },
  grow: { flex: 1 },
  bold: { fontWeight: "800" },
  emoji: { fontSize: 26 },
  power: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space(2),
    padding: space(3),
    borderRadius: radius.field,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  powerPicked: { borderColor: colors.primary },
  powerOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  powerEmpty: { opacity: 0.5 },
  confirm: {
    gap: space(3),
    padding: space(3),
    borderRadius: radius.field,
    backgroundColor: colors.bg,
  },
});
