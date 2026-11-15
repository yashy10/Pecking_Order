import { ConvexProvider } from "convex/react";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { Button, EmptyState } from "@/components/ui";
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
      <EmptyState emoji="🪶" title="Something went wrong" body={error.message}>
        <Button label="Try again" onPress={retry} />
      </EmptyState>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.bg },
});
