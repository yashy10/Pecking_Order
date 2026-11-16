import { useAction, useQuery } from "convex/react";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { api } from "@convex/_generated/api";
import { Avatar, Button, Card, Icon, Pill, Screen, Section, Txt } from "@/components/ui";
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
  "Changes nothing about the scores",
];

export function Pass() {
  const token = useToken();
  const me = useQuery(api.users.me, token ? { token } : "skip");
  const whop = useQuery(api.whop.status, {});
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
    <Screen place="today" back title="Season Pass">
      <Card tone="soft" style={styles.hero}>
        <Avatar emoji={me?.emoji ?? "🙂"} size={80} hasPass />
        <Txt variant="title" align="center">
          Look the part
        </Txt>
        <Txt color={colors.muted} align="center">
          A ring on your avatar while you climb the pecking order.
        </Txt>
        <View style={styles.center}>
          <Pill label="Free during launch" tone="primary" />
        </View>
      </Card>

      <Section title="What you get" footnote="Cosmetic only. Powers are earned, never bought.">
        <Card>
          {PERKS.map((perk) => (
            <View key={perk} style={styles.perk}>
              <View style={styles.check}>
                <Icon name="check" size={14} color={colors.ink} strokeWidth={2.4} />
              </View>
              <Txt style={styles.grow}>{perk}</Txt>
            </View>
          ))}
        </Card>
      </Section>

      {me?.hasPass ? (
        <Card testID="pass-owned" style={styles.owned}>
          <Icon name="sparkle" size={22} color={colors.good} />
          <View style={styles.grow}>
            <Txt variant="heading">You have the Season Pass</Txt>
            <Txt variant="caption" color={colors.muted}>
              Your ring is showing on every board.
            </Txt>
          </View>
        </Card>
      ) : whop && !whop.connected ? (
        <>
          <Button testID="pass-checkout" label="Coming soon on Whop" disabled onPress={() => {}} />
          <Txt variant="caption" color={colors.muted} align="center">
            Free during launch. Checkout opens here as soon as it goes live.
          </Txt>
        </>
      ) : (
        <>
          {error ? <Txt color={colors.bad}>{error}</Txt> : null}
          <Button
            testID="pass-checkout"
            label="Get it free on Whop"
            loading={busy}
            disabled={!me || !whop}
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
  hero: { alignItems: "center", gap: space(2), paddingVertical: space(6) },
  perk: { flexDirection: "row", gap: space(3), alignItems: "flex-start" },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginTop: 1,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  owned: { flexDirection: "row", alignItems: "center", gap: space(3), backgroundColor: colors.goodSoft, borderColor: colors.goodSoft },
  grow: { flex: 1 },
  center: { alignSelf: "center" },
});
