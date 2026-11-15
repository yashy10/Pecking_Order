import { Platform } from "react-native";

// Owned by the lead. Web push in the browser: permission, the service worker (public/sw.js)
// and this browser's subscription. Native apps get "unsupported" and show nothing; they keep
// the in-app banner until native push lands (it needs Firebase and a new build).

/**
 * unsupported  no web push here (a native app, or an old browser)
 * install      an iPhone in Safari: web push works once it's on the Home Screen
 * blocked      the player said no; only browser settings can undo it
 * off / on     whether this browser is subscribed
 */
export type PushState = "unsupported" | "install" | "blocked" | "off" | "on";

const SW_URL = "/sw.js";

function isWeb(): boolean {
  return Platform.OS === "web" && typeof window !== "undefined" && typeof navigator !== "undefined";
}

function canPush(): boolean {
  return isWeb() && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function isIphone(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  const legacy = (navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia?.("(display-mode: standalone)").matches === true || legacy === true;
}

async function subscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export async function pushState(): Promise<PushState> {
  if (!isWeb()) return "unsupported";
  if (!canPush()) return isIphone() && !isStandalone() ? "install" : "unsupported";
  if (Notification.permission === "denied") return "blocked";
  try {
    return (await subscription()) ? "on" : "off";
  } catch {
    return "off";
  }
}

export type BrowserSubscription = { endpoint: string; p256dh: string; auth: string };

/** Asks for permission (call from a tap) and subscribes this browser. Null if refused. */
export async function enablePush(publicKey: string): Promise<BrowserSubscription | null> {
  if (!canPush()) return null;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  const registration = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const sub =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(publicKey),
    }));
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
  return { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth };
}

/** This browser's push endpoint, if it's subscribed. */
export async function currentEndpoint(): Promise<string | null> {
  if (!canPush()) return null;
  try {
    return (await subscription())?.endpoint ?? null;
  } catch {
    return null;
  }
}

/** Unsubscribes this browser. Returns the endpoint it had, so the server can forget it. */
export async function disablePush(): Promise<string | null> {
  if (!canPush()) return null;
  const sub = await subscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
