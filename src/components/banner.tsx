import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Icon, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, elevation, glass, radius, space } from "@/theme";
import * as haptics from "@/utils/haptics";
import { getItem, setItem } from "@/utils/storage";

// Owned by the lead (PLAN §10, step 1). The lines written at each reveal, like
// "Priya just passed you". Relative only: never a rank. Shows what you haven't
// seen yet; tap to dismiss. Works the same on phones and the web.

type Event = FunctionReturnType<typeof api.events.mine>[number];

const ICON: Record<Event["kind"], string> = {
  passedYou: "😤",
  youPassed: "🚀",
  power: "✨",
  squawk: "🗯️",
  champion: "👑",
};

const MAX_SHOWN = 3;

export function Banner({ groupId }: { groupId: Id<"groups"> }) {
  const token = useToken();
  const events = useQuery(api.events.mine, token ? { token, groupId } : "skip");
  const storeKey = `po_seen_${groupId}`;
  const [seen, setSeen] = useState<string | null | undefined>(undefined); // undefined while loading

  useEffect(() => {
    let cancelled = false;
    getItem(storeKey).then((value) => {
      if (!cancelled) setSeen(value);
    });
    return () => {
      cancelled = true;
    };
  }, [storeKey]);

  const unseen = unseenEvents(events, seen);
  const newestId = unseen[0]?.eventId;
  const newestKind = unseen[0]?.kind;

  useEffect(() => {
    if (!newestId) return;
    if (newestKind === "passedYou") haptics.warning();
    else haptics.success();
  }, [newestId, newestKind]);

  if (unseen.length === 0 || !events) return null;

  function dismiss() {
    const latest = events?.[0]?.eventId;
    if (!latest) return;
    setSeen(latest);
    void setItem(storeKey, latest);
  }

  return (
    <Animated.View entering={FadeInDown.springify()} exiting={FadeOut} key={newestId}>
      <View style={styles.card} testID="banner" accessibilityLiveRegion="polite">
        <View style={styles.head}>
          <Txt variant="overline" color={colors.accent} style={styles.grow}>
            Since the last reveal
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            hitSlop={10}
            onPress={dismiss}
            style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
          >
            <Icon name="close" size={16} color={colors.ink} />
          </Pressable>
        </View>
        {unseen.map((e) => (
          <View key={e.eventId} style={styles.row}>
            <Text style={styles.icon}>{ICON[e.kind]}</Text>
            <Txt variant="heading" style={styles.text}>
              {e.text}
            </Txt>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

/** Newest first, up to the last one this device dismissed. */
function unseenEvents(events: Event[] | undefined, seen: string | null | undefined): Event[] {
  if (!events || seen === undefined) return [];
  const cut = seen ? events.findIndex((e) => e.eventId === seen) : -1;
  return (cut === -1 ? events : events.slice(0, cut)).slice(0, MAX_SHOWN);
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: glass.panelStrong,
    backgroundImage: glass.brassFill,
    borderWidth: 1,
    borderColor: glass.brassEdge,
    boxShadow: elevation.raised,
    borderRadius: radius.card,
    padding: space(4),
    paddingTop: space(3),
    gap: space(2.5),
  },
  head: { flexDirection: "row", alignItems: "center" },
  grow: { flex: 1 },
  close: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  closePressed: { backgroundColor: "rgba(255, 255, 255, 0.24)" },
  row: { flexDirection: "row", alignItems: "center", gap: space(3) },
  icon: { fontSize: 22 },
  text: { flex: 1, color: colors.ink },
});
