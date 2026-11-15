import { Text, type TextProps } from "react-native";
import { colors, typography, type TypeVariant } from "@/theme";

type Props = TextProps & {
  variant?: TypeVariant;
  color?: string;
  align?: "left" | "center" | "right";
};

export function Txt({ variant = "body", color = colors.ink, align, style, ...rest }: Props) {
  return <Text {...rest} style={[typography[variant], { color, textAlign: align }, style]} />;
}
