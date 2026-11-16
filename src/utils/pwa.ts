import { Platform } from "react-native";

// Owned by the lead. Makes the website installable, which iPhones need before they allow
// web push: a manifest and the Home Screen tags. Added at runtime because the web build is
// a single generated index.html. Safari reads them when "Add to Home Screen" is tapped.

let added = false;

export function addInstallTags(): void {
  if (added || Platform.OS !== "web" || typeof document === "undefined") return;
  added = true;
  const head = document.head;
  const tag = (name: string, attrs: Record<string, string>) => {
    const el = document.createElement(name);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    head.appendChild(el);
  };
  if (!head.querySelector('link[rel="manifest"]')) tag("link", { rel: "manifest", href: "/manifest.json" });
  if (!head.querySelector('link[rel="apple-touch-icon"]')) tag("link", { rel: "apple-touch-icon", href: "/icon-192.png" });
  if (!head.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
    tag("meta", { name: "apple-mobile-web-app-capable", content: "yes" });
    tag("meta", { name: "apple-mobile-web-app-title", content: "Pecking Order" });
  }
}
