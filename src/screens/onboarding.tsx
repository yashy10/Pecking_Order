import { useMutation, useQuery } from "convex/react";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from "react-native";
import { api } from "@convex/_generated/api";
import { GoogleButton } from "@/components/google-button";
import { ProfileForm } from "@/components/profile-form";
import { Button, Ornament, Screen, Skeleton, Txt } from "@/components/ui";
import { useToken } from "@/hooks/use-identity";
import { colors, fonts, glass, radius, space } from "@/theme";
import { errorMessage } from "@/utils/errors";
import { getItem, setItem } from "@/utils/storage";

// Owned by Track A. First run: three intro cards, Continue with Google, then name and bird.
// Home and the join link send anyone who isn't signed in here, with `next` to come back to.
// Google returns here as /welcome?claim=… (see convex/users.ts for the whole handshake).

const VERIFIER_KEY = "po_google_verifier";

const SLIDES = [
  {
    emoji: "🎲",
    title: "One game a day",
    body: "A quick game drops every day for your friend group. Play it whenever you like.",
  },
  {
    emoji: "🔒",
    title: "Scores stay sealed",
    body: "Points are hidden all week. Nobody knows who's winning until the Sunday reveal.",
  },
  {
    emoji: "🐔",
    title: "Take your seat",
    body: "Host a table for your friends or join theirs with a code. Your seat follows your Google account to any device.",
  },
] as const;

const AUTH_ERRORS: Record<string, string> = {
  setup: "Google sign-in isn't set up on this server yet.",
  google: "Google didn't let that sign-in through. Try again.",
};

/** Only paths inside the app; never another site. */
function safeNext(next: string | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

// A claim can arrive twice on Android (the auth session's result and Expo Router's deep link).
const handledClaims = new Set<string>();

export function Onboarding() {
  const token = useToken();
  const params = useLocalSearchParams<{ claim?: string; auth_error?: string; next?: string }>();
  const next = safeNext(params.next);
  const me = useQuery(api.users.me, token ? { token } : "skip");
  const start = useMutation(api.users.startGoogleSignIn);
  const finish = useMutation(api.users.finishGoogleSignIn);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete(claim: string) {
    if (!token || handledClaims.has(claim)) return;
    handledClaims.add(claim);
    const verifier = await getItem(VERIFIER_KEY);
    // No verifier: this device didn't start a sign-in (a reload, or a link from someone else).
    if (!verifier) return;
    setBusy(true);
    setError(null);
    try {
      await finish({ token, claim, verifier });
      await setItem(VERIFIER_KEY, "");
      // users.me updates by itself; the render below moves on to the profile or `next`.
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  // Back from Google on the web (a full-page redirect), or via a deep link on a phone.
  const claimParam = typeof params.claim === "string" ? params.claim : undefined;
  const authError = typeof params.auth_error === "string" ? params.auth_error : undefined;
  useEffect(() => {
    if (claimParam && token) void complete(claimParam);
  }, [claimParam, token]);
  useEffect(() => {
    if (authError && AUTH_ERRORS[authError]) setError(AUTH_ERRORS[authError]);
  }, [authError]);

  async function onGoogle() {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const verifier = (Crypto.randomUUID() + Crypto.randomUUID()).replace(/-/g, "");
      await setItem(VERIFIER_KEY, verifier);
      const query = next === "/" ? "" : `?next=${encodeURIComponent(next)}`;

      if (Platform.OS === "web") {
        // A full-page redirect: popups get blocked on phones, and this page picks the claim
        // back up from the URL when Google sends the browser home.
        const returnTo = `${window.location.origin}/welcome${query}`;
        const { url } = await start({ token, verifier, returnTo });
        window.location.assign(url);
        return; // the page is leaving; stay busy
      }

      const returnTo = Linking.createURL("welcome", next === "/" ? undefined : { queryParams: { next } });
      const { url } = await start({ token, verifier, returnTo });
      const result = await WebBrowser.openAuthSessionAsync(url, returnTo);
      if (result.type === "success") {
        const back = Linking.parse(result.url).queryParams ?? {};
        const claim = typeof back.claim === "string" ? back.claim : undefined;
        const reason = typeof back.auth_error === "string" ? back.auth_error : undefined;
        if (claim) {
          setBusy(false);
          await complete(claim);
          return;
        }
        if (reason && AUTH_ERRORS[reason]) setError(AUTH_ERRORS[reason]);
      }
      setBusy(false);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  if (me?.signedIn && !me.needsProfile) return <Redirect href={next} />;

  if (me?.signedIn && me.needsProfile) {
    return (
      <Screen backdrop="full" fill>
        <View style={styles.welcome}>
          <Txt variant="overline" color={colors.accent} align="center">
            You're in
          </Txt>
          <Txt variant="display" align="center">
            Welcome, {me.name}
          </Txt>
          <Ornament />
        </View>
        <View style={styles.zone}>
          <ProfileForm
            title="Pick your bird"
            cta="Take a seat"
            initialName={me.name}
            onSaved={() => router.replace(next)}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen backdrop="full" fill>
      <View style={styles.brand}>
        <Text style={styles.wordmark} accessibilityRole="header">
          PECKING ORDER
        </Text>
        <Ornament />
      </View>
      {!token || me === undefined ? (
        <View style={styles.zone}>
          <Skeleton height={220} />
          <Skeleton height={52} />
        </View>
      ) : (
        <Intro busy={busy} error={error} onGoogle={onGoogle} />
      )}
    </Screen>
  );
}

function Intro({ busy, error, onGoogle }: { busy: boolean; error: string | null; onGoogle: () => void }) {
  const scroller = useRef<ScrollViewInstance>(null);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const last = SLIDES.length - 1;

  function goTo(i: number) {
    setPage(i);
    scroller.current?.scrollTo({ x: i * width, animated: true });
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!width) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== page && i >= 0 && i <= last) setPage(i);
  }

  return (
    <View style={styles.zone}>
      <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={32}
          testID="intro-pager"
        >
          {SLIDES.map((s) => (
            <View key={s.title} style={[styles.slideWrap, { width: width || 1 }]}>
              <View style={styles.slide}>
                <Text style={styles.slideEmoji} accessibilityElementsHidden importantForAccessibility="no">
                  {s.emoji}
                </Text>
                <Txt variant="title" align="center">
                  {s.title}
                </Txt>
                <Txt color={colors.muted} align="center">
                  {s.body}
                </Txt>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.dots} accessibilityLabel={`Card ${page + 1} of ${SLIDES.length}`}>
        {SLIDES.map((s, i) => (
          <View key={s.title} style={[styles.dot, i === page && styles.dotOn]} />
        ))}
      </View>

      {error ? (
        <Txt color={colors.bad} align="center">
          {error}
        </Txt>
      ) : null}

      {page < last ? (
        <View style={styles.actions}>
          <Button testID="intro-next" label="Next" onPress={() => goTo(page + 1)} />
          <Button testID="intro-skip" label="Skip" variant="ghost" size="sm" onPress={() => goTo(last)} />
        </View>
      ) : (
        <View style={styles.actions}>
          <GoogleButton onPress={onGoogle} loading={busy} />
          <Txt variant="caption" color={colors.muted} align="center">
            We use your Google first name and account ID, nothing else. Your friends only see the name and bird you pick.
          </Txt>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { flex: 1, alignItems: "center", justifyContent: "center", gap: space(3), paddingTop: space(6) },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: 4,
    color: colors.accent,
    textAlign: "center",
  },
  welcome: { flex: 1, alignItems: "center", justifyContent: "center", gap: space(3), paddingTop: space(6) },
  zone: { gap: space(4), paddingBottom: space(4) },
  slideWrap: { paddingHorizontal: space(1) },
  slide: {
    alignItems: "center",
    gap: space(3),
    paddingVertical: space(8),
    paddingHorizontal: space(5),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: glass.panel,
  },
  slideEmoji: { fontSize: 48, lineHeight: 60 },
  dots: { flexDirection: "row", justifyContent: "center", gap: space(2) },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.fog },
  dotOn: { width: 22, backgroundColor: colors.primary },
  actions: { gap: space(2) },
});
