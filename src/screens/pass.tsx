import { useQuery } from "convex/react";
import * as WebBrowser from "expo-web-browser";
import { StyleSheet, View } from "react-native";
import { api } from "@convex/_generated/api";
import { Avatar, Button, Card, Screen, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, space } from "@/theme";

// Owned by the lead. Whop Season Pass (PLAN §10, step 4). Cosmetic only: it
// never sells powers, points or spins. Set EXPO_PUBLIC_WHOP_CHECKOUT_URL to the
// Whop checkout link; the webhook that turns the ring on comes next.

const CHECKOUT_URL = process.env.EXPO_PUBLIC_WHOP_CHECKOUT_URL;

const PERKS = [
  "A ring on your avatar on every rival's board",
  "The same ring on the Sunday reveal, for the whole group to see",
  "Supports the game. Changes nothing about the scores",
];

export function Pass() {
  const token = useToken();
  const me = useQuery(api.users.me, token ? { token } : "skip");

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
        <Card>
          <Txt variant="title">You have the Season Pass</Txt>
          <Txt color={colors.muted}>Your ring is showing on every board.</Txt>
        </Card>
      ) : (
        <>
          <Button
            testID="pass-checkout"
            label="Get it on Whop"
            disabled={!CHECKOUT_URL}
            onPress={() => {
              if (CHECKOUT_URL) void WebBrowser.openBrowserAsync(CHECKOUT_URL);
            }}
          />
          {!CHECKOUT_URL ? (
            <Txt variant="caption" color={colors.muted} align="center">
              Checkout opens once the Whop link is added.
            </Txt>
          ) : null}
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
