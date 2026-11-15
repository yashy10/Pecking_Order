import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// Frozen in Phase 0. Owned by the lead. No-ops on the web.

const native = Platform.OS !== "web";

export function tap(): void {
  if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function success(): void {
  if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function warning(): void {
  if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

export function error(): void {
  if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
