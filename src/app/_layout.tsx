import { ConvexProvider } from "convex/react";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { IdentityProvider } from "@/hooks/use-identity";
import { colors } from "@/theme";
import { convex } from "@/utils/convex";

// Frozen in Phase 0. Owned by the lead.

export default function RootLayout() {
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
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.body}>{error.message}</Text>
      <Pressable accessibilityRole="button" onPress={retry} style={styles.button}>
        <Text style={styles.buttonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    backgroundColor: colors.bg,
  },
  title: { fontSize: 24, fontWeight: "800", color: colors.ink },
  body: { fontSize: 15, color: colors.muted, textAlign: "center" },
  button: { backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 24, paddingVertical: 14 },
  buttonText: { color: colors.primaryInk, fontWeight: "800", fontSize: 17 },
});
