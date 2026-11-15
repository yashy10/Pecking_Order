import { useQuery } from "convex/react";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Share, StyleSheet, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button, Card, Loading, Screen, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, space } from "@/theme";
import { joinUrl } from "@/utils/links";

// Owned by Track A. QR code, the code in large type, copy and share.

export function Invite({ groupId }: { groupId: Id<"groups"> }) {
  const token = useToken();
  const today = useQuery(api.today.get, token ? { token, groupId } : "skip");
  const [copied, setCopied] = useState(false);

  if (!today) {
    return (
      <Screen back title="Invite friends">
        <Loading />
      </Screen>
    );
  }

  const url = joinUrl(today.group.inviteCode);

  async function copy() {
    await Clipboard.setStringAsync(url);
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
    <Screen back title="Invite friends">
      <Card style={styles.center}>
        <View style={styles.qr}>
          <QRCode value={url} size={220} color={colors.ink} backgroundColor={colors.surface} />
        </View>
        <Txt variant="display" style={styles.code}>
          {today.group.inviteCode}
        </Txt>
        <Txt variant="caption" color={colors.muted} align="center" selectable>
          {url}
        </Txt>
      </Card>
      <Button label={copied ? "Copied" : "Copy link"} onPress={copy} />
      <Button label="Share" variant="secondary" onPress={share} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  qr: { padding: space(3), backgroundColor: colors.surface },
  code: { letterSpacing: 6 },
});
