import { StyleSheet } from "react-native";

// Owned by the lead. See docs/PLAN.md §6.8. muted, good and bad were darkened slightly
// from the Phase 0 values so every text pairing meets WCAG AA. Tracks use these tokens and add no
// colours, fonts or UI libraries. Additions are back-compatible: nothing here is
// renamed or removed, so code written against the Phase 0 tokens keeps working.

export const colors = {
  bg: "#FFF8ED", // cream
  surface: "#FFFFFF",
  ink: "#1F1410",
  muted: "#6F5F54", // AA (≥4.5:1) on cream, white and every tint below
  primary: "#C2410C", // burnt orange
  primaryInk: "#FFFFFF",
  accent: "#F5B700", // yolk
  good: "#157A45", // AA as text on white and on goodSoft, and under white text
  bad: "#C01F35", // AA on cream and on badSoft
  fog: "#D9D2C7",
  border: "#EADFCF",
  // Tints of the colours above, for selected rows, soft buttons and highlights.
  primarySoft: "#FBE6DA",
  primaryDeep: "#A8380A", // primary for small text on primarySoft, where plain primary falls short of AA
  accentSoft: "#FFF0C7",
  goodSoft: "#DDF2E5",
  badSoft: "#FBE0E3",
  sunken: "#F6EEE1", // a recessed surface on cream: inputs, tracks, empty tiles
} as const;

/** 4-point spacing grid: space(4) === 16. */
export const space = (steps: number) => steps * 4;

export const radius = { card: 20, field: 14, pill: 999, tile: 16 } as const;

/** Elevation, cross-platform. `boxShadow` works on iOS, Android and web; `shadow*` props do not. */
export const elevation = {
  card: "0px 1px 2px rgba(31, 20, 16, 0.05)",
  raised: "0px 6px 20px rgba(31, 20, 16, 0.08)",
} as const;

export const typography = StyleSheet.create({
  /** The one big moment per screen: a hero number, an answer, a group name on an invite. */
  display: { fontSize: 36, lineHeight: 42, fontWeight: "800", letterSpacing: -0.6 },
  /** Screen titles and card headlines. */
  title: { fontSize: 22, lineHeight: 28, fontWeight: "800", letterSpacing: -0.3 },
  /** Row titles, section-level emphasis. */
  heading: { fontSize: 17, lineHeight: 22, fontWeight: "700" },
  body: { fontSize: 17, lineHeight: 24, fontWeight: "500" },
  /** Buttons, tabs, compact secondary text. */
  label: { fontSize: 15, lineHeight: 20, fontWeight: "600" },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
  /** Section headers. Write the text in sentence case; the style uppercases it. */
  overline: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
});

export type TypeVariant = keyof typeof typography;

export const layout = { maxWidth: 480, gutter: 16, tabBarHeight: 56 } as const;

export const motion = { press: 0.97, fast: 160, base: 240 } as const;
