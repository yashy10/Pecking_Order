import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { api } from "@convex/_generated/api";
import { ProfileForm } from "@/components/profile-form";
import { Button, Card, Loading, Screen, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, space } from "@/theme";
import { errorMessage } from "@/utils/errors";

// Owned by Track A. The page a judge lands on from the QR code.
// Track A: after joining, go straight to today's game when it is unplayed (PLAN §8).

export function Join({ code }: { code: string }) {
  const token = useToken();
  const me = useQuery(api.users.me, token ? { token } : "skip");
  const preview = useQuery(api.groups.preview, code ? { code } : "skip");
  const join = useMutation(api.groups.join);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token || me === undefined || preview === undefined) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }

  if (preview === null) {
    return (
      <Screen back title="Code not found">
        <Card>
          <Txt>No group has the code {code.toUpperCase()}. Check it with whoever sent it.</Txt>
        </Card>
        <Button label="Go home" onPress={() => router.replace("/")} />
      </Screen>
    );
  }

  async function onJoin() {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { groupId } = await join({ token, code });
      router.replace(`/g/${groupId}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Card tone="accent">
        <Txt variant="caption">YOU'RE INVITED TO</Txt>
        <Txt variant="display">{preview.name}</Txt>
        <View style={styles.emojis}>
          {preview.emojis.map((e, i) => (
            <Text key={`${e}-${i}`} style={styles.emoji}>
              {e}
            </Text>
          ))}
        </View>
        <Txt>{preview.memberCount} playing. Nobody knows who's winning until Sunday.</Txt>
      </Card>

      {me === null ? (
        <ProfileForm cta="Save and continue" />
      ) : (
        <>
          {error ? <Txt color={colors.bad}>{error}</Txt> : null}
          <Button testID="join-group" label={`Join ${preview.name}`} onPress={onJoin} loading={busy} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  emojis: { flexDirection: "row", flexWrap: "wrap", gap: space(1) },
  emoji: { fontSize: 28 },
});
