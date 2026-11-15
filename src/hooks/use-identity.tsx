import * as Crypto from "expo-crypto";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getItem, setItem } from "@/utils/storage";

// Frozen in Phase 0. Owned by the lead. See docs/PLAN.md §6.4.
// A random device token, created on first launch, sent with every Convex call.

const TOKEN_KEY = "po_token";
const IdentityContext = createContext<string | null>(null);

function newToken(): string {
  return (Crypto.randomUUID() + Crypto.randomUUID()).replace(/-/g, "");
}

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let stored = await getItem(TOKEN_KEY);
      if (!stored || stored.length < 32) {
        stored = newToken();
        await setItem(TOKEN_KEY, stored);
      }
      if (!cancelled) setToken(stored);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <IdentityContext.Provider value={token}>{children}</IdentityContext.Provider>;
}

/** The device token, or null for the first few milliseconds while it loads. */
export function useToken(): string | null {
  return useContext(IdentityContext);
}
