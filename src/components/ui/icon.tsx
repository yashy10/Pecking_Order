import { View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors } from "@/theme";

// Owned by the lead. A small set of line icons for navigation and actions, drawn on
// a 24-point grid with a 2-point rounded stroke. Emoji stay for people, powers and
// celebrations; these are for chrome. react-native-svg works in Expo Go and on web.

export type IconName =
  | "back"
  | "chevron"
  | "close"
  | "today"
  | "board"
  | "crew"
  | "qr"
  | "share"
  | "copy"
  | "check"
  | "lock"
  | "arrowUp"
  | "arrowDown"
  | "plus"
  | "edit"
  | "info"
  | "sparkle"
  | "hourglass";

type Props = { name: IconName; size?: number; color?: string; strokeWidth?: number };

export function Icon({ name, size = 24, color = colors.ink, strokeWidth = 2 }: Props) {
  const stroke = {
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };
  return (
    // Decorative: the control around the icon carries the label. The wrapper hides the
    // drawing from screen readers (react-native-svg would leak these props to the DOM on web).
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {draw(name, stroke, color)}
      </Svg>
    </View>
  );
}

type Stroke = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: "round";
  strokeLinejoin: "round";
  fill: string;
};

function draw(name: IconName, s: Stroke, color: string) {
  switch (name) {
    case "back":
      return <Path d="M15 5l-7 7 7 7" {...s} />;
    case "chevron":
      return <Path d="M9 5l7 7-7 7" {...s} />;
    case "close":
      return <Path d="M6 6l12 12M18 6L6 18" {...s} />;
    case "today":
      // A day on the calendar.
      return (
        <>
          <Rect x={3.5} y={5} width={17} height={15.5} rx={3.5} {...s} />
          <Path d="M3.5 10h17M8 3v4M16 3v4" {...s} />
          <Circle cx={12} cy={15.2} r={1.6} fill={color} />
        </>
      );
    case "board":
      // A podium: the pecking order.
      return <Path d="M3.5 20.5v-6h5.5v6M9 20.5v-11h6v11M15 20.5v-8h5.5v8M2.5 20.5h19" {...s} />;
    case "crew":
      return (
        <>
          <Circle cx={9} cy={8.5} r={3.5} {...s} />
          <Path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5" {...s} />
          <Path d="M15.5 5.3a3.3 3.3 0 010 6.4M18 14.8c1.9.7 3.1 2.5 3.5 5.2" {...s} />
        </>
      );
    case "qr":
      return (
        <>
          <Rect x={3.5} y={3.5} width={6.5} height={6.5} rx={1.5} {...s} />
          <Rect x={14} y={3.5} width={6.5} height={6.5} rx={1.5} {...s} />
          <Rect x={3.5} y={14} width={6.5} height={6.5} rx={1.5} {...s} />
          <Path d="M14 14h2.5v2.5M20.5 14v.01M14 20.5h.01M17.5 20.5h3v-3" {...s} />
        </>
      );
    case "share":
      return <Path d="M12 3.5v11M7.5 8L12 3.5 16.5 8M5 12.5V19a1.5 1.5 0 001.5 1.5h11A1.5 1.5 0 0019 19v-6.5" {...s} />;
    case "copy":
      return (
        <>
          <Rect x={8.5} y={8.5} width={12} height={12} rx={2.5} {...s} />
          <Path d="M15.5 8.5V6A2.5 2.5 0 0013 3.5H6A2.5 2.5 0 003.5 6v7A2.5 2.5 0 006 15.5h2.5" {...s} />
        </>
      );
    case "check":
      return <Path d="M5 12.5l4.5 4.5L19 7.5" {...s} />;
    case "lock":
      return (
        <>
          <Rect x={4.5} y={10.5} width={15} height={10} rx={2.5} {...s} />
          <Path d="M8 10.5V7.5a4 4 0 018 0v3" {...s} />
        </>
      );
    case "arrowUp":
      return <Path d="M12 19V5M6 11l6-6 6 6" {...s} />;
    case "arrowDown":
      return <Path d="M12 5v14M6 13l6 6 6-6" {...s} />;
    case "plus":
      return <Path d="M12 5v14M5 12h14" {...s} />;
    case "edit":
      return <Path d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16v4zM13.5 6.5l4 4" {...s} />;
    case "info":
      return (
        <>
          <Circle cx={12} cy={12} r={8.5} {...s} />
          <Path d="M12 11v5.5" {...s} />
          <Circle cx={12} cy={7.8} r={1.1} fill={color} />
        </>
      );
    case "sparkle":
      return <Path d="M12 3.5l1.9 5.3 5.6 1.7-5.6 1.8L12 17.5l-1.9-5.2-5.6-1.8 5.6-1.7L12 3.5zM18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" {...s} />;
    case "hourglass":
      return (
        <>
          <Path d="M6.5 3.5h11M6.5 20.5h11" {...s} />
          <Path d="M8 3.5c0 4.2 4 5.6 4 8.5s-4 4.3-4 8.5M16 3.5c0 4.2-4 5.6-4 8.5s4 4.3 4 8.5" {...s} />
          <Path d="M9.6 18.6h4.8L12 16.4z" fill={color} stroke="none" />
        </>
      );
  }
}
