import { StyleSheet } from "react-native";

// Owned by the lead. The "Playground" system: a warm cream page, deep navy ink, and one
// bright colour per place in the app, so a kid can tell where they are by colour alone.
// Three styles, one job each: a sparse Swiss layout (one idea, one big button per screen),
// chunky "toy" controls with a solid bottom edge, and flat colour-blocking per place.
// It replaces the dark "tabletop" look. Token names are unchanged, so screens pick it up here.
//
// Contrast rule: bright fills always carry navy `ink`, never white. Coloured *text* on the
// page uses the `ink` shade of that colour. Every pairing clears WCAG AA (≥4.5:1).

export const colors = {
  bg: "#FFF8EC", // the cream page
  surface: "#FFFFFF", // a card on the page
  raised: "#F3ECDC", // pressed rows, skeletons, quiet chips
  sunken: "#F8F1E1", // inputs, tracks, quoted answers
  ink: "#1E2245", // navy: all primary text, and text on every bright fill
  muted: "#5A5F7D",
  placeholder: "#666B88",
  primary: "#FFC93C", // sunny yellow fill: the default main action
  primaryInk: "#1E2245", // text on any bright fill
  primaryEdge: "#E0A100", // the solid bottom edge of a primary button
  primarySoft: "#FFF1C7", // yellow tint: your own row, highlights
  primaryDeep: "#4338CA", // highlight text on the page or on primarySoft
  accent: "#4338CA", // indigo: links, quiet actions, emphasis text
  accentSoft: "#E8E6FF",
  good: "#0B7A54", // green text
  goodFill: "#6FDDB0",
  goodSoft: "#DDF6EA",
  bad: "#C2371F", // red text
  badFill: "#FF9B85",
  badSoft: "#FFE4DC",
  fog: "#E7E3F1", // hidden-information slots
  border: "#EADFC8",
  edge: "#D9CCB0", // the solid bottom edge of a white card or button
} as const;

/**
 * One colour world per place. `fill` is the bright block (navy text on it), `edge` its solid
 * bottom edge, `soft` a page tint, and `ink` the shade dark enough to use as text on the page.
 */
export const places = {
  home: { fill: "#FF8F70", edge: "#DB5F3F", soft: "#FFE6DD", ink: "#B23A1C" },
  today: { fill: "#FFC93C", edge: "#E0A100", soft: "#FFF1C7", ink: "#8A5A00" },
  board: { fill: "#6CC4FF", edge: "#2F97DE", soft: "#DDF1FF", ink: "#0F5E9C" },
  sunday: { fill: "#B9A2FF", edge: "#8E70EA", soft: "#ECE5FF", ink: "#5B3CC4" },
  crew: { fill: "#6FDDB0", edge: "#36B584", soft: "#DDF6EA", ink: "#0B7A54" },
  blur: { fill: "#FFAA54", edge: "#E17F1C", soft: "#FFE9D0", ink: "#9A4F00" },
  quote: { fill: "#FF9EC4", edge: "#E66A9C", soft: "#FFE3EE", ink: "#B02A63" },
} as const;

/** The mascot's own pigments, for drawing only (never text). */
export const chick = {
  body: "#FFD75E",
  shade: "#F5B93A",
  beak: "#FF8F3F",
  cheek: "#FFA7A0",
  eye: "#1E2245",
  white: "#FFFFFF",
} as const;

export type Place = keyof typeof places;
export type PlaceColors = (typeof places)[Place];

/** Kept from the tabletop theme so older callers compile; these are now plain light layers. */
export const glass = {
  panel: "#FFFFFF",
  panelStrong: "#FFFFFF",
  edge: colors.border,
  brassEdge: colors.primaryEdge,
  brassFill: "none",
  brassSolid: "none",
} as const;

/** 4-point spacing grid: space(4) === 16. */
export const space = (steps: number) => steps * 4;

export const radius = { card: 24, field: 16, pill: 999, tile: 20 } as const;

/**
 * "Toy" depth: a solid bottom edge, not a blurry shadow. `boxShadow` works on iOS, Android and
 * web; `shadow*` props do not.
 */
export const edgeShadow = (color: string, depth = 4) => `0px ${depth}px 0px ${color}`;

export const elevation = {
  card: edgeShadow(colors.edge, 4),
  raised: edgeShadow(colors.edge, 5),
  brass: edgeShadow(colors.primaryEdge, 4),
} as const;

/**
 * Bundled in assets/fonts (OFL) and loaded in src/app/_layout.tsx. Each weight is its own
 * family: Android fakes bold if you combine a custom family with `fontWeight`.
 */
export const fonts = {
  display: "Fredoka-Bold",
  title: "Fredoka-SemiBold",
  body: "Nunito-SemiBold",
  bold: "Nunito-Bold",
  heavy: "Nunito-ExtraBold",
  /** Old name for the small-label face. */
  mono: "Nunito-ExtraBold",
} as const;

export const typography = StyleSheet.create({
  /** The one big moment per screen: the brand, a hero number, an answer. */
  display: { fontFamily: fonts.display, fontSize: 36, lineHeight: 42 },
  /** Screen titles and card headlines. */
  title: { fontFamily: fonts.title, fontSize: 24, lineHeight: 30 },
  /** Row titles, button labels. */
  heading: { fontFamily: fonts.heavy, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 17, lineHeight: 25 },
  /** Tabs, compact secondary text. */
  label: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19 },
  /** Small section labels. Sentence case, as written. */
  overline: { fontFamily: fonts.heavy, fontSize: 14, lineHeight: 18, letterSpacing: 0.2 },
});

export type TypeVariant = keyof typeof typography;

export const layout = { maxWidth: 480, gutter: 20, tabBarHeight: 64 } as const;

export const motion = { press: 0.97, fast: 160, base: 240 } as const;
