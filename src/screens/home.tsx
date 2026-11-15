import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { api } from "@convex/_generated/api";
import { ProfileForm } from "@/components/profile-form";
import { Avatar, Button, Card, Field, Loading, Pill, Screen, Txt } from "@/components/ui";
import { APP_NAME, ONE_LINER } from "@/constants";
import { useToken } from "@/hooks/use-identity";
import { colors, space } from "@/theme";
import { errorMessage } from "@/utils/errors";

// Owned by Track A.

export function Home() {
  const token = useToken();
  const me = useQuery(api.users.me, token ? { token } : "skip");
  const groups = useQuery(api.groups.mine, token ? { token } : "skip");
  const create = useMutation(api.groups.create);
  const [groupName, setGroupName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token || me === undefined) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }

  async function onCreate() {
    if (!token || !groupName.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { groupId } = await create({ token, name: groupName });
      setGroupName("");
      router.push(`/g/${groupId}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function onJoin() {
    const clean = code.trim().toUpperCase();
    if (clean) router.push(`/join/${clean}`);
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Txt variant="display">{APP_NAME}</Txt>
        <Txt color={colors.muted}>{ONE_LINER}</Txt>
      </View>

      {me === null ? (
        <ProfileForm cta="Let's go" />
      ) : (
        <>
          <View style={styles.meRow}>
            <Avatar emoji={me.emoji} hasPass={me.hasPass} />
            <Txt variant="title">Hi, {me.name}</Txt>
          </View>

          {groups && groups.length > 0 ? (
            <View style={styles.list}>
              {groups.map((g) => (
                <Pressable
                  key={g.groupId}
                  accessibilityRole="button"
                  onPress={() => router.push(`/g/${g.groupId}`)}
                >
                  <Card style={styles.groupCard}>
                    <Txt variant="title" style={styles.grow}>
                      {g.name}
                    </Txt>
                    <Pill label={g.dayLabel} />
                  </Card>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Card>
            <Txt variant="title">Start a group</Txt>
            <Field
              testID="group-name-field"
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Group name, like The Roost"
              maxLength={30}
              returnKeyType="go"
              onSubmitEditing={onCreate}
            />
            {error ? <Txt color={colors.bad}>{error}</Txt> : null}
            <Button
              testID="create-group"
              label="Create group"
              onPress={onCreate}
              loading={busy}
              disabled={!groupName.trim()}
            />
          </Card>

          <Card>
            <Txt variant="title">Join with a code</Txt>
            <Field
              value={code}
              onChangeText={setCode}
              placeholder="ABCDE"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              returnKeyType="go"
              onSubmitEditing={onJoin}
            />
            <Button label="Join" variant="secondary" onPress={onJoin} disabled={!code.trim()} />
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space(2), paddingTop: space(6) },
  meRow: { flexDirection: "row", alignItems: "center", gap: space(3) },
  list: { gap: space(3) },
  groupCard: { flexDirection: "row", alignItems: "center" },
  grow: { flex: 1 },
});
