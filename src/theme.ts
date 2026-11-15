import { StyleSheet } from "react-native";

// Owned by the lead. The "Playground" system, grown up: warm paper, near-black ink, and one
// accent colour per place in the app. It is meant to read like a well-made daily puzzle app:
// quiet type, flat surfaces, black pill buttons, and colour only where it means something
// (the hero card, the active tab, a small mark). Emoji are for player avatars only.
// It replaces the dark "tabletop" look. Token names are unchanged, so screens pick it up here.
//
// Contrast rule: accent fills always carry `ink`, never white. Coloured *text* on the page
// uses the `ink` shade of that colour. Every pairing clears WCAG AA (≥4.5:1).

export const colors = {
  bg: "#FAF8F3", // warm paper
  surface: "#FFFFFF", // a card on the page
  raised: "#EFECE4", // pressed rows, skeletons, quiet chips
  sunken: "#F3F1EA", // inputs, tracks, quoted answers
  ink: "#16161A", // all primary text, the main button, and text on every accent fill
  muted: "#62626B",
  placeholder: "#696972",
  onInk: "#FFFFFF", // text on an ink button
  primary: "#F5C043", // a warm highlight fill (your row, a badge)
  primaryInk: "#16161A", // text on any accent fill
  primarySoft: "#FCF0CF",
  primaryDeep: "#16161A", // emphasis text (kept for Phase 0 callers)
  accent: "#16161A", // quiet actions and emphasis text: just ink, set bolder
  accentSoft: "#EFECE4",
  good: "#0B7A54", // green text
  goodFill: "#3CCB8E",
  goodSoft: "#DFF3E9",
  bad: "#C2371F", // red text
  badFill: "#FF8A70",
  badSoft: "#FBE5DF",
  fog: "#E9E7EE", // hidden-information slots
  border: "#E4E0D6",
} as const;

/**
 * One accent per place. `fill` is the colour block (ink text on it), `soft` a page tint, and
 * `ink` the shade dark enough to use as text on the page or on `soft`.
 */
export const places = {
  home: { fill: "#FF7352", soft: "#FFE9E2", ink: "#B23A1C" },
  today: { fill: "#F5C043", soft: "#FCF0CF", ink: "#855600" },
  board: { fill: "#5B9DFF", soft: "#E1EDFF", ink: "#1B56B8" },
  sunday: { fill: "#A78BFA", soft: "#EDE7FE", ink: "#5B3CC4" },
  crew: { fill: "#3CCB8E", soft: "#DFF3E9", ink: "#0B7A54" },
  blur: { fill: "#FF9A3D", soft: "#FFEBD6", ink: "#964B00" },
  quote: { fill: "#F472B6", soft: "#FDE6F1", ink: "#AD2664" },
} as const;

export type Place = keyof typeof places;
export type PlaceColors = (typeof places)[Place];

/** Kept from the tabletop theme so older callers compile; these are now plain light layers. */
export const glass = {
  panel: "#FFFFFF",
  panelStrong: "#FFFFFF",
  edge: colors.border,
  brassEdge: colors.border,
  brassFill: "none",
  brassSolid: "none",
} as const;

/** 4-point spacing grid: space(4) === 16. */
export const space = (steps: number) => steps * 4;

export const radius = { card: 20, field: 14, pill: 999, tile: 16 } as const;

/** Surfaces are flat. `boxShadow` works on iOS, Android and web; `shadow*` props do not. */
export const elevation = {
  card: "0px 1px 2px rgba(22, 22, 26, 0.05)",
  raised: "0px 6px 20px -8px rgba(22, 22, 26, 0.18)",
  brass: "0px 1px 2px rgba(22, 22, 26, 0.05)",
} as const;

/**
 * Bundled in assets/fonts (OFL) and loaded in src/app/_layout.tsx. Each weight is its own
 * family: Android fakes bold if you combine a custom family with `fontWeight`.
 */
export const fonts = {
  display: "BricolageGrotesque-Bold",
  title: "BricolageGrotesque-SemiBold",
  body: "DMSans-Regular",
  bold: "DMSans-SemiBold",
  heavy: "DMSans-Bold",
  /** Old name for the small-label face. */
  mono: "DMSans-SemiBold",
} as const;

export const typography = StyleSheet.create({
  /** The one big moment per screen: the brand, a hero number, an answer. */
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: -0.6 },
  /** Screen titles and card headlines. */
  title: { fontFamily: fonts.title, fontSize: 22, lineHeight: 27, letterSpacing: -0.3 },
  /** Row titles, button labels. */
  heading: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
  /** Tabs, compact secondary text. */
  label: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 18 },
  /** Small section labels. Sentence case, as written. */
  overline: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
});

export type TypeVariant = keyof typeof typography;

export const layout = { maxWidth: 480, gutter: 20, tabBarHeight: 60 } as const;

export const motion = { press: 0.97, fast: 160, base: 240 } as const;
