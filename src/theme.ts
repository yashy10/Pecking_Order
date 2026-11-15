import { StyleSheet } from "react-native";

// Frozen in Phase 0. Owned by the lead. See docs/PLAN.md §6.8.
// Tracks use these tokens and add no colours, fonts or UI libraries.

export const colors = {
  bg: "#FFF8ED", // cream
  surface: "#FFFFFF",
  ink: "#1F1410",
  muted: "#7A6A5E",
  primary: "#C2410C", // burnt orange
  primaryInk: "#FFFFFF",
  accent: "#F5B700", // yolk
  good: "#1E9E5A",
  bad: "#D7263D",
  fog: "#D9D2C7",
  border: "#EADFCF",
} as const;

/** 4-point spacing grid: space(4) === 16. */
export const space = (steps: number) => steps * 4;

export const radius = { card: 20, field: 14, pill: 999 } as const;

export const typography = StyleSheet.create({
  display: { fontSize: 40, lineHeight: 46, fontWeight: "800" },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "800" },
  body: { fontSize: 17, lineHeight: 24, fontWeight: "500" },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
});

export type TypeVariant = keyof typeof typography;

export const layout = { maxWidth: 480, gutter: 16 } as const;
