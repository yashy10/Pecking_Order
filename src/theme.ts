import { StyleSheet } from "react-native";

// Owned by the lead. The "tabletop" system: an obsidian table lit by brass, with
// terracotta and emerald as the two player colours, taken from the board-game backdrop
// (docs/design/board_game_mobile_backdrop.html). Dark by design; it replaces the Phase 0 cream look.
// Token names are unchanged from Phase 0, so every screen picks the new look up from here.
// Every text pairing below clears WCAG AA (≥4.5:1); most clear 7:1.

export const colors = {
  bg: "#08090C", // obsidian table
  surface: "#11151D", // a panel resting on the table
  raised: "#171C26", // a panel on a panel: selected rows, inputs in focus
  sunken: "#0B0E13", // recessed: inputs, tracks, empty tiles
  ink: "#ECEEF2",
  muted: "#98A1B0",
  primary: "#D4AF37", // brass
  primaryInk: "#17120A", // text on brass
  primarySoft: "#2A2414", // brass tint on the table
  primaryDeep: "#F3D878", // brass text on primarySoft (kept for Phase 0 callers)
  accent: "#F3D878", // brass light: highlights, the champion
  accentSoft: "#221D10",
  good: "#5CC497", // emerald, readable on the table
  goodSoft: "#12261F",
  bad: "#E58263", // terracotta, readable on the table
  badSoft: "#2A1711",
  fog: "#262C37",
  border: "#222834",
  // The table's own pigments, for decoration only (never text).
  terracotta: "#C85A32",
  emerald: "#1B5E48",
  brassDim: "#8C6D1F",
} as const;

/** Translucent layers used by glass panels over the backdrop. */
export const glass = {
  panel: "rgba(17, 21, 29, 0.86)",
  panelStrong: "rgba(17, 21, 29, 0.94)",
  edge: "rgba(255, 255, 255, 0.08)",
  brassEdge: "rgba(212, 175, 55, 0.45)",
  brassFill: "linear-gradient(135deg, rgba(212, 175, 55, 0.20) 0%, rgba(212, 175, 55, 0.06) 100%)",
  brassSolid: "linear-gradient(180deg, #E7C75A 0%, #C9A02E 100%)",
} as const;

/** 4-point spacing grid: space(4) === 16. */
export const space = (steps: number) => steps * 4;

export const radius = { card: 18, field: 12, pill: 999, tile: 14 } as const;

/** Elevation, cross-platform. `boxShadow` works on iOS, Android and web; `shadow*` props do not. */
export const elevation = {
  card: "0px 10px 30px -12px rgba(0, 0, 0, 0.85), inset 0px 1px 0px rgba(255, 255, 255, 0.05)",
  raised: "0px 16px 40px -12px rgba(0, 0, 0, 0.9), inset 0px 1px 0px rgba(255, 255, 255, 0.06)",
  brass: "0px 10px 28px -10px rgba(212, 175, 55, 0.45), inset 0px 1px 0px rgba(255, 245, 210, 0.45)",
} as const;

/** Bundled in assets/fonts and loaded in src/app/_layout.tsx. Body text stays on the system font. */
export const fonts = {
  display: "Cinzel-Bold",
  title: "Cinzel-SemiBold",
  mono: "JetBrainsMono-Medium",
} as const;

export const typography = StyleSheet.create({
  /** The one big moment per screen: the brand, a hero number, an answer. */
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 40, letterSpacing: 1.5 },
  /** Screen titles and card headlines. */
  title: { fontFamily: fonts.title, fontSize: 21, lineHeight: 28, letterSpacing: 0.6 },
  /** Row titles, section-level emphasis. */
  heading: { fontSize: 17, lineHeight: 22, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 23, fontWeight: "400" },
  /** Buttons, tabs, compact secondary text. */
  label: { fontSize: 15, lineHeight: 20, fontWeight: "600" },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "500" },
  /** Section headers and tags. Write sentence case; the style uppercases it. */
  overline: {
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});

export type TypeVariant = keyof typeof typography;

export const layout = { maxWidth: 480, gutter: 16, tabBarHeight: 58 } as const;

export const motion = { press: 0.97, fast: 160, base: 240 } as const;
