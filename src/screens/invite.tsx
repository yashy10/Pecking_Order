import { useQuery } from "convex/react";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { Share, StyleSheet, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button, Card, Screen, ScreenSkeleton, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, space } from "@/theme";
import * as haptics from "@/utils/haptics";
import { joinUrl } from "@/utils/links";

// Owned by Track A. QR code, the code in large type, copy and share. Built to be held
// up to a friend's camera, so the QR gets the space.

export function Invite({ groupId }: { groupId: Id<"groups"> }) {
  const token = useToken();
  const today = useQuery(api.today.get, token ? { token, groupId } : "skip");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  if (!today) {
    return (
      <Screen back title="Invite friends" backTo={`/g/${groupId}`}>
        <ScreenSkeleton />
      </Screen>
    );
  }

  const url = joinUrl(today.group.inviteCode);

  async function copy() {
    await Clipboard.setStringAsync(url);
    haptics.success();
    setCopied(true);
  }

  async function share() {
    try {
      await Share.share({ message: `Join ${today?.group.name} on Pecking Order: ${url}` });
    } catch {
      await copy();
    }
  }

  return (
    <Screen back title="Invite friends" subtitle={today.group.name} backTo={`/g/${groupId}`}>
      <Card style={styles.center}>
        <Txt color={colors.muted} align="center">
          Point a phone camera here to join
        </Txt>
        <View style={styles.qr} accessible accessibilityLabel={`QR code for ${url}`}>
          <QRCode value={url} size={232} color={colors.ink} backgroundColor={colors.surface} />
        </View>
        <Txt variant="caption" color={colors.muted}>
          Or enter the code
        </Txt>
        <Txt variant="display" style={styles.code} selectable>
          {today.group.inviteCode}
        </Txt>
      </Card>
      <View style={styles.actions}>
        <View style={styles.grow}>
          <Button label="Share" icon="share" onPress={share} />
        </View>
        <View style={styles.grow}>
          <Button
            label={copied ? "Copied" : "Copy link"}
            icon={copied ? "check" : "copy"}
            variant="tonal"
            onPress={copy}
          />
        </View>
      </View>
      <Txt variant="caption" color={colors.muted} align="center" selectable>
        {url}
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", gap: space(2), paddingVertical: space(6) },
  qr: { padding: space(3), backgroundColor: colors.surface, marginVertical: space(2) },
  code: { letterSpacing: 8, marginRight: -8 },
  actions: { flexDirection: "row", gap: space(2) },
  grow: { flex: 1 },
});
