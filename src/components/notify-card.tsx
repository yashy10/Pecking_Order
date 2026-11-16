import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { api } from "@convex/_generated/api";
import { Button, Card, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, space } from "@/theme";
import { errorMessage } from "@/utils/errors";
import * as haptics from "@/utils/haptics";
import { currentEndpoint, disablePush, enablePush, pushState, type PushState } from "@/utils/push";
import { addInstallTags } from "@/utils/pwa";

// Owned by the lead. Turning reminders (web push) on and off. Asked at the moment they're
// worth most, right after a round ("ask"), and kept in the Crew tab ("settings"). Native apps
// and browsers without web push see nothing; an iPhone in Safari is told how to install first.

type Props = { variant: "ask" | "settings" };

export function NotifyCard({ variant }: Props) {
  const token = useToken();
  const web = Platform.OS === "web";
  const config = useQuery(api.notifications.config, web ? {} : "skip");
  const subscribe = useMutation(api.notifications.subscribe);
  const unsubscribe = useMutation(api.notifications.unsubscribe);
  const sendTest = useMutation(api.notifications.sendTest);
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!web) return;
    addInstallTags();
    void pushState().then(setState);
  }, [web]);

  if (!web || !state || state === "unsupported" || !config?.publicKey) return null;
  // After a round, only ask; managing reminders lives in the Crew tab.
  if (variant === "ask" && state !== "off" && state !== "install") return null;

  async function turnOn() {
    if (!token || !config?.publicKey || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const sub = await enablePush(config.publicKey);
      if (!sub) {
        setState(await pushState());
        return;
      }
      await subscribe({ token, ...sub });
      setState("on");
      haptics.success();
      await sendTest({ token, endpoint: sub.endpoint });
      setNote("You're in. A test buzz is on its way.");
    } catch (e) {
      setNote(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    if (!token || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const endpoint = await disablePush();
      if (endpoint) await unsubscribe({ token, endpoint });
      setState("off");
    } catch (e) {
      setNote(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    if (!token || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const endpoint = await currentEndpoint();
      if (!endpoint) return setState("off");
      await sendTest({ token, endpoint });
      setNote("Sent. It should buzz in a few seconds.");
    } catch (e) {
      setNote(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card testID={`notify-${variant}`} style={styles.card}>
      <View style={styles.head}>
        <Txt style={styles.bell}>{state === "on" ? "🔔" : state === "blocked" ? "🔕" : "🔔"}</Txt>
        <View style={styles.grow}>
          <Txt variant="heading">{TITLE[state]}</Txt>
          <Txt variant="caption" color={colors.muted}>
            {BODY[state]}
          </Txt>
        </View>
      </View>
      {state === "off" ? (
        <Button testID="notify-on" label="Turn on reminders" onPress={turnOn} loading={busy} />
      ) : null}
      {state === "on" && variant === "settings" ? (
        <View style={styles.row}>
          <View style={styles.grow}>
            <Button testID="notify-test" variant="secondary" size="sm" label="Send a test" onPress={test} disabled={busy} />
          </View>
          <View style={styles.grow}>
            <Button testID="notify-off" variant="ghost" size="sm" label="Turn off" onPress={turnOff} disabled={busy} />
          </View>
        </View>
      ) : null}
      {note ? (
        <Txt variant="caption" color={colors.muted}>
          {note}
        </Txt>
      ) : null}
    </Card>
  );
}

const TITLE: Record<Exclude<PushState, "unsupported">, string> = {
  off: "Never miss a reveal",
  on: "Reminders are on",
  blocked: "Reminders are blocked",
  install: "Get reminders on iPhone",
};

const BODY: Record<Exclude<PushState, "unsupported">, string> = {
  off: "A nudge if you haven't played, and a buzz when scores drop. Three a day at most.",
  on: "Noon and 7:30 PM if you haven't played, plus every reveal and the Sunday finale.",
  blocked: "This browser blocked notifications. Allow them for this site in your browser settings, then come back.",
  install: "Tap Share, then Add to Home Screen. Open Pecking Order from there and turn reminders on.",
};

const styles = StyleSheet.create({
  card: { gap: space(3) },
  head: { flexDirection: "row", alignItems: "flex-start", gap: space(3) },
  bell: { fontSize: 26, lineHeight: 32 },
  grow: { flex: 1 },
  row: { flexDirection: "row", gap: space(2) },
});
