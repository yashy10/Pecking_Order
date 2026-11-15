import * as Linking from "expo-linking";
import { Platform } from "react-native";

// Frozen in Phase 0. Owned by the lead.

/** The link a friend opens to join. The public web link once EXPO_PUBLIC_WEB_URL is set. */
export function joinUrl(code: string): string {
  const base = process.env.EXPO_PUBLIC_WEB_URL;
  if (base) return `${base.replace(/\/$/, "")}/join/${code}`;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/join/${code}`;
  }
  return Linking.createURL(`/join/${code}`);
}
