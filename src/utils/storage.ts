import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Frozen in Phase 0. Owned by the lead. SecureStore on phones, localStorage on the web.
// Every read and write is wrapped: private windows and cleared storage must not crash the app.

export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Storage blocked: the token lasts for this session only.
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Keychain unavailable: the token lasts for this session only.
  }
}
