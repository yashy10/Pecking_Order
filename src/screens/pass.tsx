import { useAction, useQuery } from "convex/react";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { api } from "@convex/_generated/api";
import { Avatar, Button, Card, Screen, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, space } from "@/theme";
import { errorMessage } from "@/utils/errors";
import * as haptics from "@/utils/haptics";

// Owned by the lead. The Whop Season Pass (PLAN §10, step 4). Free and cosmetic only:
// it never sells powers, points or spins. Checkout happens on Whop; the ring turns on
// by itself when Whop's webhook lands, because users.me is a live query.

const PERKS = [
  "A ring on your avatar on every rival's board",
  "The same ring on the Sunday reveal, for the whole group to see",
  "Free during launch. Changes nothing about the scores",
];

export function Pass() {
  const token = useToken();
  const me = useQuery(api.users.me, token ? { token } : "skip");
  const createCheckout = useAction(api.whop.createCheckout);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { url } = await createCheckout({ token });
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      setError(errorMessage(e));
      haptics.error();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen back title="Season Pass">
      <Card tone="accent" style={styles.hero}>
        <Avatar emoji={me?.emoji ?? "🐔"} size={72} hasPass />
        <Txt variant="title" align="center">
          ✨ Season Pass
        </Txt>
        <Txt align="center">Look the part while you climb the pecking order.</Txt>
      </Card>

      <Card>
        {PERKS.map((perk) => (
          <View key={perk} style={styles.perk}>
            <Txt>✨</Txt>
            <Txt style={styles.grow}>{perk}</Txt>
          </View>
        ))}
        <Txt variant="caption" color={colors.muted}>
          Cosmetic only. Powers are earned, never bought.
        </Txt>
      </Card>

      {me?.hasPass ? (
        <Card testID="pass-owned">
          <Txt variant="title">✨ You have the Season Pass</Txt>
          <Txt color={colors.muted}>Your ring is showing on every board.</Txt>
        </Card>
      ) : (
        <>
          {error ? <Txt color={colors.bad}>{error}</Txt> : null}
          <Button
            testID="pass-checkout"
            label="Get it free on Whop"
            loading={busy}
            disabled={!me}
            onPress={open}
          />
          <Txt variant="caption" color={colors.muted} align="center">
            Checkout opens on Whop. Your ring appears here as soon as it's done.
          </Txt>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center" },
  perk: { flexDirection: "row", gap: space(2), alignItems: "flex-start" },
  grow: { flex: 1 },
});
