import { useEffect, useState } from "react";
import { ConvexProvider } from "convex/react";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { Platform, StyleSheet, View } from "react-native";
import { Backdrop, Button, EmptyState } from "@/components/ui";
import { IdentityProvider } from "@/hooks/use-identity";
import { colors } from "@/theme";
import { convex } from "@/utils/convex";

// Frozen in Phase 0. Owned by the lead.

// Bundled OFL fonts (assets/fonts). Until they load, render the empty page rather than
// flashing system-font headings; on a slow web connection give up after 2.5 s and fall back.
const FONTS = {
  "BricolageGrotesque-SemiBold": require("../../assets/fonts/BricolageGrotesque-SemiBold.ttf"),
  "BricolageGrotesque-Bold": require("../../assets/fonts/BricolageGrotesque-Bold.ttf"),
  "DMSans-Regular": require("../../assets/fonts/DMSans-Regular.ttf"),
  "DMSans-SemiBold": require("../../assets/fonts/DMSans-SemiBold.ttf"),
  "DMSans-Bold": require("../../assets/fonts/DMSans-Bold.ttf"),
};

// On the web, paint the page itself: otherwise Safari's overscroll bounce and anything past
// the app's root show the browser's white.
if (Platform.OS === "web" && typeof document !== "undefined") {
  document.documentElement.style.backgroundColor = colors.bg;
  document.body.style.backgroundColor = colors.bg;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", colors.bg);
}

export default function RootLayout() {
  const [loaded, fontError] = useFonts(FONTS);
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 2500);
    return () => clearTimeout(t);
  }, []);

  if (!loaded && !fontError && !waited) {
    return (
      <View style={styles.boot}>
        <StatusBar style="dark" />
        <Backdrop variant="full" />
      </View>
    );
  }

  return (
    <ConvexProvider client={convex}>
      <IdentityProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="g/[groupId]/invite" options={{ presentation: "modal" }} />
        </Stack>
      </IdentityProvider>
    </ConvexProvider>
  );
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.wrap}>
      <Backdrop />
      <EmptyState emoji="🪶" title="Something went wrong" body={error.message}>
        <Button label="Try again" onPress={retry} />
      </EmptyState>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.bg },
  boot: { flex: 1, backgroundColor: colors.bg },
});
