import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, elevation, radius, space } from "@/theme";
import { errorMessage } from "@/utils/errors";
import * as haptics from "@/utils/haptics";

// Owned by Track D. Ghost and Spy, with a confirm step and an active state.
// Powers are earned, never bought (PLAN §6.3).

type Power = "ghost" | "spy";

const INFO: Record<Power, { emoji: string; name: string; line: string; on: string; short: string }> = {
  ghost: {
    emoji: "👻",
    name: "Ghost",
    line: "Vanish from your rivals' boards until tomorrow.",
    on: "Hidden until tomorrow",
    short: "Vanish for a day",
  },
  spy: {
    emoji: "🔭",
    name: "Spy",
    line: "See two more places above you until tomorrow.",
    on: "Spying until tomorrow",
    short: "See 2 more above",
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
    <View testID="powers-tray" style={styles.tray}>
      <View style={styles.row}>
        {(["ghost", "spy"] as const).map((type) => {
          const info = INFO[type];
          const empty = !active[type] && count[type] < 1;
          const disabled = active[type] || empty;
          const picked = confirming === type;
          return (
            <Pressable
              key={type}
              testID={`power-${type}`}
              accessibilityRole="button"
              accessibilityLabel={`${info.name}, ${count[type]} left. ${active[type] ? info.on : info.line}`}
              accessibilityState={{ disabled, selected: picked }}
              disabled={disabled}
              onPress={() => {
                haptics.tap();
                setError(null);
                setConfirming(picked ? null : type);
              }}
              style={({ pressed }) => [
                styles.power,
                picked && styles.powerPicked,
                active[type] && styles.powerOn,
                empty && styles.powerEmpty,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.powerTop}>
                <Text style={styles.emoji}>{info.emoji}</Text>
                <View style={[styles.count, active[type] && styles.countOn]}>
                  <Txt variant="caption" tabular color={active[type] ? colors.primary : colors.ink}>
                    ×{count[type]}
                  </Txt>
                </View>
              </View>
              <Txt variant="heading" color={active[type] ? colors.primaryInk : colors.ink}>
                {info.name}
              </Txt>
              <Txt variant="caption" color={active[type] ? colors.primaryInk : colors.muted}>
                {active[type] ? info.on : empty ? "None left" : picked ? "Confirm below" : info.short}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      {confirming ? (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={styles.confirm}>
          <Txt>{INFO[confirming].line}</Txt>
          {error ? <Txt color={colors.bad}>{error}</Txt> : null}
          <View style={styles.row}>
            <View style={styles.grow}>
              <Button label="Not now" variant="secondary" size="sm" onPress={() => setConfirming(null)} />
            </View>
            <View style={styles.grow}>
              <Button
                testID="power-confirm"
                label={`Use ${INFO[confirming].name}`}
                size="sm"
                onPress={() => confirm(confirming)}
                loading={busy}
              />
            </View>
          </View>
        </Animated.View>
      ) : error ? (
        <Txt color={colors.bad}>{error}</Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tray: { gap: space(3) },
  row: { flexDirection: "row", gap: space(3) },
  grow: { flex: 1 },
  emoji: { fontSize: 28 },
  power: {
    flex: 1,
    gap: space(1),
    padding: space(3),
    borderRadius: radius.tile,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    boxShadow: elevation.card,
  },
  powerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space(1) },
  count: { backgroundColor: colors.sunken, borderRadius: radius.pill, paddingHorizontal: space(2), paddingVertical: 2 },
  countOn: { backgroundColor: colors.primaryInk },
  powerPicked: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  powerOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  powerEmpty: { opacity: 0.5 },
  pressed: { transform: [{ scale: 0.98 }] },
  confirm: {
    gap: space(3),
    padding: space(3),
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
