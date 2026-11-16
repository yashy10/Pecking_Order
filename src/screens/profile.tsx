import { useMutation, useQuery } from "convex/react";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@convex/_generated/api";
import {
  Avatar,
  Button,
  Field,
  Icon,
  Screen,
  ScreenSkeleton,
  Txt,
} from "@/components/ui";
import { EMOJIS } from "@/constants";
import { useToken } from "@/hooks/use-identity";
import { colors, places, radius, space } from "@/theme";
import { errorMessage } from "@/utils/errors";
import * as haptics from "@/utils/haptics";

// Owned by the lead. Your profile: the name and emoji your friends see in every group, and
// the Season Pass. The whole page fits one screen and never scrolls: the emoji grid takes
// whatever height is left and its cells shrink to fit, and Save stays pinned at the bottom.

const COLUMNS = 6;
const ROWS = Math.ceil(EMOJIS.length / COLUMNS);

export function Profile() {
  const token = useToken();
  const me = useQuery(api.users.me, token ? { token } : "skip");
  const groups = useQuery(api.groups.mine, token ? { token } : "skip");
  const save = useMutation(api.users.saveProfile);
  const [name, setName] = useState<string | null>(null); // null until edited
  const [emoji, setEmoji] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  if (!token || me === undefined) {
    return (
      <Screen place="home" back title="Profile">
        <ScreenSkeleton />
      </Screen>
    );
  }
  if (me === null || !me.signedIn || me.needsProfile)
    return <Redirect href="/welcome" />;

  const shownName = name ?? me.name;
  const shownEmoji = emoji ?? me.emoji;
  const changed = shownName.trim() !== me.name || shownEmoji !== me.emoji;
  const groupCount = groups?.length ?? 0;

  async function submit() {
    if (!token || !shownName.trim() || busy || !changed) return;
    setBusy(true);
    setError(null);
    try {
      await save({ token, name: shownName, emoji: shownEmoji });
      setName(null);
      setEmoji(null);
      setSaved(true);
      haptics.success();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen place="home" back title="Profile" scroll={false} fill>
      <View style={styles.who}>
        <Avatar emoji={shownEmoji} hasPass={me.hasPass} size={64} />
        <View style={styles.grow}>
          <Field
            testID="name-field"
            label="Name"
            value={shownName}
            onChangeText={setName}
            placeholder="First name or nickname"
            maxLength={20}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={submit}
          />
        </View>
      </View>

      <View style={styles.picker}>
        <Txt variant="label">Emoji</Txt>
        <View style={styles.grid} accessibilityRole="radiogroup">
          {Array.from({ length: ROWS }, (_, r) => (
            <View key={r} style={styles.row}>
              {EMOJIS.slice(r * COLUMNS, (r + 1) * COLUMNS).map((e) => {
                const on = e === shownEmoji;
                return (
                  <Pressable
                    key={e}
                    accessibilityRole="radio"
                    accessibilityLabel={e}
                    accessibilityState={{ selected: on, checked: on }}
                    onPress={() => {
                      haptics.tap();
                      setEmoji(e);
                    }}
                    style={({ pressed }) => [
                      styles.cell,
                      on && styles.cellOn,
                      pressed && styles.cellPressed,
                    ]}
                  >
                    <Text style={styles.emoji}>{e}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <Pressable
        testID="profile-pass"
        accessibilityRole="button"
        accessibilityLabel={
          me.hasPass
            ? "Season Pass. You have it"
            : "Season Pass. A ring on your avatar"
        }
        onPress={() => router.push("/pass")}
        style={({ pressed }) => [styles.pass, pressed && styles.cellPressed]}
      >
        <Icon name="sparkle" size={20} />
        <View style={styles.grow}>
          <Txt variant="label">Season Pass</Txt>
          <Txt variant="caption" color={colors.muted} numberOfLines={1}>
            {me.hasPass
              ? "Your ring is on"
              : "A ring on your avatar. Free, cosmetic only"}
          </Txt>
        </View>
        <Icon name="chevron" size={18} color={colors.muted} />
      </Pressable>

      <View style={styles.grow} />

      <View style={styles.foot}>
        {error ? (
          <Txt variant="caption" color={colors.bad} align="center">
            {error}
          </Txt>
        ) : (
          <Txt variant="caption" color={colors.muted} align="center">
            {groupCount === 0
              ? "Your friends see this name and emoji."
              : `Shown in ${groupCount === 1 ? "your group" : `all ${groupCount} of your groups`}.`}
          </Txt>
        )}
        <Button
          testID="save-profile"
          label={saved ? "Saved" : "Save"}
          icon={saved ? "check" : undefined}
          onPress={submit}
          loading={busy}
          disabled={!changed || !shownName.trim()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  who: { flexDirection: "row", alignItems: "flex-end", gap: space(4) },
  grow: { flex: 1 },
  // As tall as it likes on a big phone, and it gives up height first on a small one.
  picker: {
    flexShrink: 1,
    flexBasis: ROWS * 62 + 28,
    gap: space(2),
    minHeight: 0,
  },
  grid: { flex: 1, gap: space(2), minHeight: 0 },
  row: { flex: 1, flexDirection: "row", gap: space(2), minHeight: 0 },
  cell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.field,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cellOn: { borderColor: colors.ink, backgroundColor: places.home.soft },
  cellPressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  emoji: { fontSize: 24, lineHeight: 30 },
  pass: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    minHeight: 60,
    paddingHorizontal: space(4),
    borderRadius: radius.tile,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  foot: { gap: space(2) },
});
