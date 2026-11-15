import { router } from "expo-router";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, layout, space } from "@/theme";
import { IconButton } from "./icon-button";
import { Txt } from "./txt";

// Every screen is wrapped in Screen. It owns safe areas and the keyboard on
// iPhone, Android and the web (PLAN §6.9), so screens never hand-roll either.

type Props = {
  children: ReactNode;
  title?: string;
  /** A line under the title: where you are, what day it is. */
  subtitle?: string;
  back?: boolean;
  /** Where Back goes when there's no history (a deep link, a refresh). Defaults to home. */
  backTo?: string;
  right?: ReactNode;
  scroll?: boolean;
  wide?: boolean; // the demo panel on a projector; every player screen stays narrow
  /** Inside the group tabs: the tab bar below owns the bottom safe area. */
  tabbed?: boolean;
};

export function Screen({ children, title, subtitle, back, backTo = "/", right, scroll = true, wide, tabbed }: Props) {
  const insets = useSafeAreaInsets();
  const showHeader = Boolean(title || back || right);
  const width = wide ? styles.wide : null;
  const column = <View style={[styles.column, width]}>{children}</View>;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: tabbed ? 0 : insets.bottom }]}>
      {showHeader ? (
        <View style={[styles.header, width, back && styles.headerWithBack]}>
          {back ? (
            <IconButton
              icon="back"
              label="Back"
              onPress={() => (router.canGoBack() ? router.back() : router.replace(backTo))}
            />
          ) : null}
          <View style={styles.titles}>
            <Txt variant="title" numberOfLines={1} accessibilityRole="header">
              {title ?? ""}
            </Txt>
            {subtitle ? (
              <Txt variant="caption" color={colors.muted} numberOfLines={1}>
                {subtitle}
              </Txt>
            ) : null}
          </View>
          {right ? <View style={styles.right}>{right}</View> : null}
        </View>
      ) : null}
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.scroll, !showHeader && styles.scrollBare, tabbed && styles.scrollTabbed]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {column}
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.scroll, !showHeader && styles.scrollBare]}>{column}</View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(1),
    width: "100%",
    maxWidth: layout.maxWidth,
    alignSelf: "center",
    paddingHorizontal: layout.gutter,
    paddingTop: space(2),
    paddingBottom: space(3),
    minHeight: 60,
  },
  headerWithBack: { paddingLeft: layout.gutter - space(2.5) }, // optically align the chevron with the gutter
  titles: { flex: 1, gap: 1 },
  right: { flexDirection: "row", alignItems: "center", gap: space(1), marginRight: -space(2) },
  scroll: { flexGrow: 1, paddingHorizontal: layout.gutter, paddingTop: space(1), paddingBottom: space(8) },
  scrollBare: { paddingTop: space(5) }, // no header above: give the first block room to breathe
  scrollTabbed: { paddingBottom: space(6) },
  column: { width: "100%", maxWidth: layout.maxWidth, alignSelf: "center", gap: space(5) },
  wide: { maxWidth: 1040 },
});
