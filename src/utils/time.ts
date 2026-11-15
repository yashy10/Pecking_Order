// Owned by the lead. Small, dependency-free time formatting in the device's own time
// zone. Hand-rolled rather than Intl, which older Android engines only partly support.

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "9 PM", or "9:30 PM" when the minutes aren't zero. */
export function clockTime(at: number): string {
  const d = new Date(at);
  const h = d.getHours();
  const m = d.getMinutes();
  const hour = h % 12 === 0 ? 12 : h % 12;
  const suffix = h < 12 ? "AM" : "PM";
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Calendar days from `now` to `at`, by the device's own dates: 0 today, 1 tomorrow. */
export function daysFromToday(at: number, now: number): number {
  const startOf = (t: number) => {
    const d = new Date(t);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  return Math.round((startOf(at) - startOf(now)) / 86_400_000);
}

/** "tonight", "tomorrow" or a weekday, for an evening moment such as the 9 PM reveal. */
export function eveningName(at: number, now: number): string {
  const days = daysFromToday(at, now);
  if (days <= 0) return "tonight";
  if (days === 1) return "tomorrow";
  return DAY_NAMES[new Date(at).getDay()];
}

export function weekdayName(at: number): string {
  return DAY_NAMES[new Date(at).getDay()];
}

export type Parts = { days: number; hours: number; minutes: number; seconds: number };

export function splitDuration(ms: number): Parts {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** "2d 4h", "5h 49m" or "12m": the two largest units. */
export function shortDuration(ms: number): string {
  const { days, hours, minutes } = splitDuration(ms);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}
