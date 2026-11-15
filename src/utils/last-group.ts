import { getItem, setItem } from "./storage";

// Owned by the lead. The group this device opened last, so a returning player can skip
// the group list and land straight in it (src/screens/home.tsx).

const KEY = "po_last_group";

export function rememberGroup(groupId: string): void {
  void setItem(KEY, groupId);
}

export async function lastGroup(): Promise<string | null> {
  return await getItem(KEY);
}
