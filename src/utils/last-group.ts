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

// Home sends a returning player straight into their group once per launch. That must not
// happen when the launch already started inside a group (a deep link, a refresh): Back from
// there has to reach Home, not bounce into the group again.
let launchHandled = false;

export function launchWasHandled(): boolean {
  return launchHandled;
}

export function markLaunchHandled(): void {
  launchHandled = true;
}
