import { Children, Fragment, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, space } from "@/theme";
import { tap } from "@/utils/haptics";
import { Card } from "./card";
import { Icon } from "./icon";
import { Txt } from "./txt";

/** A card of rows separated by hairlines. */
export function List({ children, testID }: { children: ReactNode; testID?: string }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <Card flush testID={testID}>
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 ? <View style={styles.divider} /> : null}
          {row}
        </Fragment>
      ))}
    </Card>
  );
}

type RowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Tappable rows get a chevron and a pressed state. */
  onPress?: () => void;
  tone?: "default" | "highlight";
  testID?: string;
  accessibilityLabel?: string;
};

export function ListRow({ title, subtitle, leading, trailing, onPress, tone = "default", testID, accessibilityLabel }: RowProps) {
  const body = (
    <>
      {leading}
      <View style={styles.text}>
        <Txt variant="heading" numberOfLines={1}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="caption" color={colors.muted} numberOfLines={2}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {trailing}
      {onPress ? <Icon name="chevron" size={18} color={colors.muted} /> : null}
    </>
  );
  const rowStyle = [styles.row, tone === "highlight" && styles.highlight];
  if (!onPress) {
    return (
      <View testID={testID} style={rowStyle} accessible accessibilityLabel={accessibilityLabel}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [...rowStyle, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    minHeight: 60,
    backgroundColor: colors.surface,
  },
  highlight: { backgroundColor: colors.primarySoft },
  pressed: { backgroundColor: colors.sunken },
  text: { flex: 1, gap: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: space(4) },
});
