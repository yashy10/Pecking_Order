import { useEffect, useId } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Mask,
  Path,
  Pattern,
  Polygon,
  Polyline,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { colors } from "@/theme";

// Owned by the lead. The tabletop the whole app sits on, ported from
// docs/design/board_game_mobile_backdrop.html: a lit obsidian table, a faint goban dot grid, and
// pieces from five board games resting on the edges (chess, Go, hex tiles, backgammon,
// a die). The centre is always left clear for content.
//
//   "full"   — home and the join page: every piece on the table
//   "subtle" — every other screen: light, grid and corner marks only, so text reads first
//
// Decorative only: hidden from screen readers, never takes a touch.

const W = 390;
const H = 844;

type Props = { variant?: "full" | "subtle" };

// SVG ids are global to the page on the web, and a stack keeps earlier screens mounted but
// hidden. A shared id like "dots" would resolve to the first, hidden screen's pattern and
// draw nothing, so every backdrop suffixes its own. (iOS and Android scope ids per Svg.)
function useSvgIds() {
  const suffix = useId().replace(/[^A-Za-z0-9_-]/g, "");
  return {
    id: (name: string) => `${name}-${suffix}`,
    url: (name: string) => `url(#${name}-${suffix})`,
  };
}
type SvgIds = ReturnType<typeof useSvgIds>;

export function Backdrop({ variant = "subtle" }: Props) {
  const { width } = useWindowDimensions();
  const ids = useSvgIds();
  const full = variant === "full";
  // On a wide window the pieces stay around the phone-width column instead of
  // stretching across a monitor.
  const column = Math.min(width, 560);

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[StyleSheet.absoluteFill, styles.base]} />
      <Glows strong={full} />
      <View style={[styles.column, { width: column }]}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
          <Defs>
            <LinearGradient id={ids.id("brass")} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#F3D878" stopOpacity={0.65} />
              <Stop offset="0.5" stopColor="#D4AF37" stopOpacity={0.25} />
              <Stop offset="1" stopColor="#8C6D1F" stopOpacity={0.05} />
            </LinearGradient>
            <LinearGradient id={ids.id("terracotta")} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#C85A32" stopOpacity={0.28} />
              <Stop offset="1" stopColor="#C85A32" stopOpacity={0.02} />
            </LinearGradient>
            <LinearGradient id={ids.id("emerald")} x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor="#1B5E48" stopOpacity={0.32} />
              <Stop offset="1" stopColor="#1B5E48" stopOpacity={0.02} />
            </LinearGradient>
            <Pattern id={ids.id("dots")} x="0" y="0" width="36" height="36" patternUnits="userSpaceOnUse">
              <Rect x="17.4" y="17.4" width="1.2" height="1.2" fill="#D4AF37" fillOpacity={0.5} />
            </Pattern>
            <RadialGradient id={ids.id("clear")} cx="50%" cy="56%" rx="50%" ry="42%">
              <Stop offset="0" stopColor="#000" stopOpacity={1} />
              <Stop offset="0.6" stopColor="#000" stopOpacity={1} />
              <Stop offset="1" stopColor="#fff" stopOpacity={1} />
            </RadialGradient>
            <Mask id={ids.id("edges")} x="0" y="0" width={W} height={H} maskUnits="userSpaceOnUse">
              <Rect x="0" y="0" width={W} height={H} fill={ids.url("clear")} />
            </Mask>
          </Defs>

          {/* The goban dot grid, faded out of the centre. */}
          <Rect x="0" y="0" width={W} height={H} fill={ids.url("dots")} mask={ids.url("edges")} opacity={full ? 0.32 : 0.22} />

          {full ? <Pieces ids={ids} /> : <SubtlePieces ids={ids} />}

          {/* Corner hairlines: the table's frame. */}
          <G opacity={0.55}>
            <Path d="M 24 44 L 24 24 L 44 24" fill="none" stroke="#D4AF37" strokeWidth={0.9} strokeOpacity={0.45} />
            <Path d="M 366 44 L 366 24 L 346 24" fill="none" stroke="#D4AF37" strokeWidth={0.9} strokeOpacity={0.45} />
            <Path d="M 24 800 L 24 820 L 44 820" fill="none" stroke="#D4AF37" strokeWidth={0.9} strokeOpacity={0.45} />
            <Path d="M 366 800 L 366 820 L 346 820" fill="none" stroke="#D4AF37" strokeWidth={0.9} strokeOpacity={0.45} />
          </G>
        </Svg>
        {full ? (
          <>
            <Floating amplitude={-7} duration={3500} style={styles.layer}>
              <GoStones />
            </Floating>
            <Floating amplitude={6} duration={4250} style={styles.layer}>
              <Die />
            </Floating>
          </>
        ) : null}
      </View>
    </View>
  );
}

/** Three pools of light at the corners, away from the content. */
function Glows({ strong }: { strong: boolean }) {
  const ids = useSvgIds();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(strong ? 0.75 : 0.55);
  useEffect(() => {
    if (reduced) return;
    pulse.value = withRepeat(withTiming(1, { duration: 4500, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [pulse, reduced]);
  const breathe = useAnimatedStyle(() => ({ opacity: pulse.value * (strong ? 1 : 0.7) }));

  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, breathe]}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id={ids.id("gBrass")} cx="88%" cy="4%" rx="62%" ry="32%">
              <Stop offset="0" stopColor="#D4AF37" stopOpacity={0.2} />
              <Stop offset="1" stopColor="#D4AF37" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={ids.url("gBrass")} />
        </Svg>
      </Animated.View>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={ids.id("gEmerald")} cx="6%" cy="98%" rx="62%" ry="30%">
            <Stop offset="0" stopColor="#1B5E48" stopOpacity={strong ? 0.38 : 0.26} />
            <Stop offset="1" stopColor="#1B5E48" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={ids.id("gTerracotta")} cx="100%" cy="86%" rx="48%" ry="24%">
            <Stop offset="0" stopColor="#C85A32" stopOpacity={strong ? 0.22 : 0.14} />
            <Stop offset="1" stopColor="#C85A32" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={ids.url("gEmerald")} />
        <Rect x="0" y="0" width="100%" height="100%" fill={ids.url("gTerracotta")} />
      </Svg>
    </>
  );
}

/** Every piece on the table, for home and join. */
function Pieces({ ids }: { ids: SvgIds }) {
  return (
    <>
      {/* Top left: a corner of a chessboard with a rook's crown. */}
      <G opacity={0.7} transform="translate(-34, -18) rotate(-12)">
        <Rect x="0" y="0" width="36" height="36" fill="none" stroke={ids.url("brass")} strokeWidth={0.75} />
        <Rect x="36" y="0" width="36" height="36" fill="rgba(212,175,55,0.06)" stroke={ids.url("brass")} strokeWidth={0.75} />
        <Rect x="72" y="0" width="36" height="36" fill="none" stroke={ids.url("brass")} strokeWidth={0.75} />
        <Rect x="0" y="36" width="36" height="36" fill="rgba(212,175,55,0.05)" stroke={ids.url("brass")} strokeWidth={0.75} />
        <Rect x="36" y="36" width="36" height="36" fill="none" stroke={ids.url("brass")} strokeWidth={0.75} />
        <Rect x="72" y="36" width="36" height="36" fill="rgba(212,175,55,0.08)" stroke={ids.url("brass")} strokeWidth={0.75} />
        <Rect x="36" y="72" width="36" height="36" fill="rgba(212,175,55,0.04)" stroke={ids.url("brass")} strokeWidth={0.75} />
        <Path d="M47 48 L54 43 L61 48 L59 58 L49 58 Z" fill="none" stroke="#F3D878" strokeWidth={1} strokeOpacity={0.55} />
      </G>

      {/* Top right: the goban the stones rest on. */}
      <G transform="translate(262, -34)">
        {[24, 60, 96].map((y) => (
          <Line key={`h${y}`} x1="0" y1={y} x2="140" y2={y} stroke="rgba(255,255,255,0.09)" strokeWidth={0.8} />
        ))}
        <Line x1="0" y1="132" x2="140" y2="132" stroke="rgba(255,255,255,0.06)" strokeWidth={0.8} />
        {[28, 64, 100].map((x) => (
          <Line key={`v${x}`} x1={x} y1="0" x2={x} y2="155" stroke="rgba(255,255,255,0.09)" strokeWidth={0.8} />
        ))}
        <Circle cx="64" cy="60" r="2.2" fill="#D4AF37" fillOpacity={0.65} />
        <Circle cx="64" cy="24" r="11.5" fill="none" stroke="#D4AF37" strokeWidth={0.9} strokeDasharray="2.5 2.5" strokeOpacity={0.55} />
      </G>

      {/* Upper middle: hex tiles with a road and a settlement. */}
      <G opacity={0.75} transform="translate(-26, 430)">
        <Polygon points="32,0 60,16 60,48 32,64 4,48 4,16" fill="rgba(27,94,72,0.10)" stroke={ids.url("brass")} strokeWidth={0.85} />
        <Polygon points="88,0 116,16 116,48 88,64 60,48 60,16" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={0.75} />
        <Polygon points="60,48 88,64 88,96 60,112 32,96 32,64" fill="rgba(212,175,55,0.04)" stroke={ids.url("brass")} strokeWidth={0.85} />
        <Line x1="60" y1="16" x2="60" y2="48" stroke="#D4AF37" strokeWidth={1.8} strokeOpacity={0.55} strokeLinecap="round" />
        <Circle cx="60" cy="48" r="3.5" fill={colors.bg} stroke="#F3D878" strokeWidth={1.3} />
      </G>

      {/* Bottom left: backgammon points rising from the edge, a checker at the tip. */}
      <G opacity={0.85} transform="translate(-30, 712)">
        <Polygon points="0,170 18,45 36,170" fill={ids.url("terracotta")} stroke="rgba(200,90,50,0.28)" strokeWidth={0.7} />
        <Polygon points="36,170 54,65 72,170" fill={ids.url("emerald")} stroke="rgba(27,94,72,0.3)" strokeWidth={0.7} />
        <Polygon points="72,170 90,52 108,170" fill={ids.url("terracotta")} stroke="rgba(200,90,50,0.22)" strokeWidth={0.7} />
        <Circle cx="18" cy="34" r="7.5" fill="#12151E" stroke="#C85A32" strokeWidth={1} strokeOpacity={0.65} />
        <Circle cx="18" cy="34" r="3.5" fill="none" stroke="#C85A32" strokeWidth={0.6} strokeOpacity={0.45} />
      </G>

      {/* Behind the title: an astrolabe, the turn-order ring. */}
      <G opacity={0.55}>
        <Circle cx="195" cy="200" r="118" fill="none" stroke="rgba(212,175,55,0.10)" strokeWidth={0.75} strokeDasharray="3 6" />
        <Circle cx="195" cy="200" r="142" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={0.6} />
      </G>

      {/* A few loose markers on the edges. */}
      <G stroke="#D4AF37" fill="none" strokeWidth={0.85}>
        <Path d="M 22 330 l 5 -5 l 5 5 l -5 5 z" strokeOpacity={0.3} />
        <Circle cx="372" cy="330" r="4" strokeOpacity={0.22} />
        <Path d="M 362 620 l 6 0 l 3 5 l -3 5 l -6 0 l -3 -5 z" strokeOpacity={0.25} />
        <Path d="M 16 380 l 4 -4 l 4 4 l -4 4 z" strokeOpacity={0.2} />
        <Circle cx="30" cy="600" r="3" strokeOpacity={0.18} />
      </G>
    </>
  );
}

/** For working screens: a quieter table, with the frame and one board corner. */
function SubtlePieces({ ids }: { ids: SvgIds }) {
  return (
    <G opacity={0.55}>
      <G transform="translate(268, 40)">
        {[20, 52, 84].map((y) => (
          <Line key={`h${y}`} x1="0" y1={y} x2="130" y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={0.8} />
        ))}
        {[24, 56, 88].map((x) => (
          <Line key={`v${x}`} x1={x} y1="0" x2={x} y2="110" stroke="rgba(255,255,255,0.06)" strokeWidth={0.8} />
        ))}
        <Circle cx="56" cy="52" r="2" fill="#D4AF37" fillOpacity={0.5} />
      </G>
      <G transform="translate(0, 760)">
        <Polygon points="0,90 14,10 28,90" fill={ids.url("terracotta")} />
        <Polygon points="28,90 42,24 56,90" fill={ids.url("emerald")} />
      </G>
    </G>
  );
}

function GoStones() {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
      <G transform="translate(262, -34)">
        <Ellipse cx="28" cy="67" rx="12" ry="5" fill="#000" fillOpacity={0.5} />
        <Circle cx="28" cy="60" r="12.5" fill="#11141C" stroke="rgba(255,255,255,0.18)" strokeWidth={0.8} />
        <Path d="M21 54 A 9 9 0 0 1 33 52" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={1.2} strokeLinecap="round" />
        <Ellipse cx="100" cy="103" rx="12" ry="5" fill="#000" fillOpacity={0.5} />
        <Circle cx="100" cy="96" r="12.5" fill="#E6DFD3" stroke="#D4AF37" strokeWidth={0.9} strokeOpacity={0.6} />
        <Circle cx="96" cy="92" r="4" fill="#FFFFFF" fillOpacity={0.55} />
      </G>
    </Svg>
  );
}

function Die() {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
      <G transform="translate(306, 470)">
        <Polygon points="42,6 76,26 76,66 42,86 8,66 8,26" fill="rgba(14,17,23,0.85)" stroke="#D4AF37" strokeOpacity={0.5} strokeWidth={1} />
        <Polyline points="8,26 42,46 76,26" fill="none" stroke="rgba(212,175,55,0.4)" strokeWidth={0.85} />
        <Line x1="42" y1="46" x2="42" y2="86" stroke="rgba(212,175,55,0.4)" strokeWidth={0.85} />
        <Circle cx="42" cy="25" r="2.2" fill="#F3D878" fillOpacity={0.75} />
        <Circle cx="24" cy="48" r="1.8" fill="#D4AF37" fillOpacity={0.55} />
        <Circle cx="24" cy="61" r="1.8" fill="#D4AF37" fillOpacity={0.55} />
        <Circle cx="59" cy="54" r="2" fill="#C85A32" fillOpacity={0.8} />
      </G>
    </Svg>
  );
}

/** Lifts a layer up and down by a few points, forever, unless the player asked for less motion. */
function Floating({
  children,
  amplitude,
  duration,
  style,
}: {
  children: React.ReactNode;
  amplitude: number;
  duration: number;
  style: object;
}) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t, reduced, duration]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: t.value * amplitude }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  base: { backgroundImage: "linear-gradient(180deg, #0C0F15 0%, #08090C 55%, #06070A 100%)" },
  column: { position: "absolute", top: 0, bottom: 0, alignSelf: "center" },
  layer: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
});
