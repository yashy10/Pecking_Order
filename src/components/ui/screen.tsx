import { router } from "expo-router";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, layout, space } from "@/theme";
import { Txt } from "./txt";

// Every screen is wrapped in Screen. It owns safe areas and the keyboard on
// iPhone, Android and the web (PLAN §6.9), so screens never hand-roll either.

type Props = {
  children: ReactNode;
  title?: string;
  back?: boolean;
  right?: ReactNode;
  scroll?: boolean;
  wide?: boolean; // the demo panel on a projector; every player screen stays narrow
};

export function Screen({ children, title, back, right, scroll = true, wide }: Props) {
  const insets = useSafeAreaInsets();
  const showHeader = Boolean(title || back || right);
  const width = wide ? styles.wide : null;
  const column = <View style={[styles.column, width]}>{children}</View>;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {showHeader ? (
        <View style={[styles.header, width]}>
          {back ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={12}
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
              style={styles.back}
            >
              <Txt variant="title" color={colors.primary}>
                ‹
              </Txt>
            </Pressable>
          ) : null}
          <Txt variant="title" numberOfLines={1} style={styles.title}>
            {title ?? ""}
          </Txt>
          {right}
        </View>
      ) : null}
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {column}
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.scroll]}>{column}</View>
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
    gap: space(2),
    width: "100%",
    maxWidth: layout.maxWidth,
    alignSelf: "center",
    paddingHorizontal: layout.gutter,
    paddingVertical: space(2),
    minHeight: 52,
  },
  back: { width: 32, alignItems: "flex-start" },
  title: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: layout.gutter, paddingBottom: space(8) },
  column: { width: "100%", maxWidth: layout.maxWidth, alignSelf: "center", gap: space(4) },
  wide: { maxWidth: 1040 },
});
