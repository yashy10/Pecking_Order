import { Text, type TextProps } from "react-native";
import { colors, typography, type TypeVariant } from "@/theme";

type Props = TextProps & {
  variant?: TypeVariant;
  color?: string;
  align?: "left" | "center" | "right";
  /** Fixed-width digits, so scores and counters don't jiggle as they change. */
  tabular?: boolean;
};

export function Txt({ variant = "body", color = colors.ink, align, tabular, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[
        typography[variant],
        { color, textAlign: align },
        tabular && { fontVariant: ["tabular-nums"] },
        style,
      ]}
    />
  );
}
