import { useEffect, useState } from "react";

/** The current time, re-read every `everyMs` while `active`. For countdowns. */
export function useNow(active = true, everyMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [active, everyMs]);
  return now;
}
