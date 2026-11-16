import { useConvex, useMutation, useQuery } from "convex/react";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { api } from "@convex/_generated/api";
import { Avatar, Button, Card, EmptyState, Screen, ScreenSkeleton, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, space } from "@/theme";
import { errorMessage } from "@/utils/errors";

// Track A (built by the lead). The page a judge lands on from the QR code:
// onboarding if needed, then straight into today's game. Already set up? One tap.

export function Join({ code }: { code: string }) {
  const token = useToken();
  const convex = useConvex();
  const me = useQuery(api.users.me, token ? { token } : "skip");
  const preview = useQuery(api.groups.preview, code ? { code } : "skip");
  const join = useMutation(api.groups.join);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token || me === undefined || preview === undefined) {
    return (
      <Screen>
        <ScreenSkeleton />
      </Screen>
    );
  }

  // Not signed in yet: onboarding first, then straight back to this invite.
  if (me === null || !me.signedIn || me.needsProfile) {
    return <Redirect href={`/welcome?next=${encodeURIComponent(`/join/${code}`)}`} />;
  }

  if (preview === null) {
    return (
      <Screen place="home" back>
        <EmptyState
          emoji="🧐"
          title="Code not found"
          body={`No group has the code ${code.toUpperCase()}. Check it with whoever sent it. Codes are five letters and numbers.`}
        >
          <Button label="Go home" onPress={() => router.replace("/")} />
        </EmptyState>
      </Screen>
    );
  }

  async function onJoin() {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { groupId } = await join({ token, code });
      const today = await convex.query(api.today.get, { token, groupId });
      const unplayed =
        today?.group.phase === "open" && today.games.some((g) => g.myPlay.status === "none");
      router.replace(unplayed ? `/g/${groupId}/play` : `/g/${groupId}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  const extra = Math.max(0, preview.memberCount - preview.emojis.length);
  return (
    <Screen place="home" backdrop="full">
      <Card tone="soft" style={styles.invite} testID="join-invite">
        <Txt variant="overline" color={colors.muted}>
          You're invited to
        </Txt>
        <Txt variant="display" align="center">
          {preview.name}
        </Txt>
        <View style={styles.flock}>
          {preview.emojis.map((e, i) => (
            <View key={`${e}-${i}`} style={[styles.flockItem, i > 0 && styles.overlap]}>
              <Avatar emoji={e} size={40} />
            </View>
          ))}
          {extra > 0 ? (
            <View style={[styles.flockItem, styles.overlap, styles.more]}>
              <Txt variant="caption" tabular>
                +{extra}
              </Txt>
            </View>
          ) : null}
        </View>
        <Txt color={colors.muted} align="center">
          {preview.memberCount} playing. Nobody knows who's winning until Sunday.
        </Txt>
      </Card>

      <View style={styles.meJoin}>
        <View style={styles.meRow}>
          <Avatar emoji={me.emoji} hasPass={me.hasPass} size={40} />
          <Txt variant="heading" style={styles.grow}>
            Joining as {me.name}
          </Txt>
        </View>
        {error ? <Txt color={colors.bad}>{error}</Txt> : null}
        <Button testID="join-group" label={`Join ${preview.name}`} onPress={onJoin} loading={busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  invite: { alignItems: "center", gap: space(3), paddingVertical: space(6) },
  flock: { flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap" },
  flockItem: { borderRadius: 22, borderWidth: 2, borderColor: colors.bg },
  overlap: { marginLeft: -10 },
  more: { width: 44, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: colors.raised },
  meJoin: { gap: space(3) },
  meRow: { flexDirection: "row", alignItems: "center", gap: space(3) },
  grow: { flex: 1 },
});
