import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, StatusBar as RNStatusBar, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppIcon from '@/components/AppIcon';
import { StatusBar } from 'expo-status-bar';
import { CandidateProfileProvider } from '@/lib/candidateProfile';
import { VerificationProvider } from '@/lib/useVerification';
import { SubscriptionProvider } from '@/lib/subscriptionStore';
import { HiyameThemeProvider, useTheme, ThemePalette, DISPLAY_FONT_FAMILY } from '@/lib/theme';
import { AuthProvider, useAuth } from '@/lib/useAuth';
import { useGlobalFocusRing } from '@/lib/focusRing';
import { initSentry, Sentry } from '@/lib/sentry';
import 'react-native-reanimated';

// Runs once at module load, before the app tree mounts — the earliest point
// crashes can be caught from.
initSentry();

// Redirects based on real auth state: signed out + outside (auth) -> welcome;
// signed in with a resolved persona + inside (auth) -> that persona's home.
// Renders nothing while the initial session/role check is in flight, same as
// the existing font-loading gate below.
function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading, role } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (session && role && inAuthGroup) {
      router.replace(role === 'candidate' ? '/(candidate)' : '/(company)');
    }
  }, [loading, session, role, segments, router]);

  if (loading) return null;
  return <>{children}</>;
}

// Expo Router renders this in place of the whole app when the root layout throws —
// it may mount outside HiyameThemeProvider, so useTheme() relies on its context
// default (LIGHT) rather than requiring a provider.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  const T = useTheme();
  const st = useMemo(() => makeErrorStyles(T), [T]);

  return (
    <View style={st.container}>
      <View style={st.iconWrap}>
        <AppIcon name="warning-outline" size={32} color={T.danger} />
      </View>
      <Text style={st.title}>Something went wrong</Text>
      <Text style={st.subtitle}>{error.message}</Text>
      <Pressable style={st.retryButton} onPress={retry}>
        <AppIcon name="refresh" size={18} color={T.textOnAccent} />
        <Text style={st.retryButtonText}>Try Again</Text>
      </Pressable>
    </View>
  );
}

const makeErrorStyles = (T: ThemePalette) => StyleSheet.create({
  container: {
    flex: 1, backgroundColor: T.bg,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: T.dangerBg, borderWidth: 1, borderColor: T.danger,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '800', color: T.textPrimary, marginBottom: 8, textAlign: 'center', fontFamily: DISPLAY_FONT_FAMILY },
  subtitle: { fontSize: 14, color: T.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  retryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 50,
    backgroundColor: T.accent,
  },
  retryButtonText: { fontSize: 15, fontWeight: '700', color: T.textOnAccent },
});

export const unstable_settings = {
  initialRouteName: '(auth)',
};

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [loaded, error] = useFonts({
    // Body face — matches every weight lib/theme.ts's fontFamilyForWeight()
    // maps to, so every screen's existing `fontWeight` styling resolves to
    // one of these instead of silently falling through to the system font.
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    // Display face — only used explicitly (TYPE.display/title, and the
    // public pages' big headlines), never picked automatically by weight.
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });

  useGlobalFocusRing();

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HiyameThemeProvider>
        <RootLayoutNav />
      </HiyameThemeProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const T = useTheme();

  const navTheme = useMemo(() => ({
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: T.bg,
      card: T.card,
      text: T.textPrimary,
      border: T.border,
      primary: T.accent,
    },
  }), [T]);

  const statusStyle = T.mode === 'dark' ? 'light' : 'dark';
  const barStyle = T.mode === 'dark' ? 'light-content' : 'dark-content';

  return (
    <AuthProvider>
        <SubscriptionProvider>
            <VerificationProvider>
              <CandidateProfileProvider>
                  <ThemeProvider value={navTheme}>
                    {/* Full-viewport on web: the (candidate)/(company) tab layouts
                        render a persistent left sidebar (components/TopNav) + content
                        that fills the rest. Auth screens constrain their own content
                        width. */}
                    <View style={{ flex: 1, backgroundColor: T.bg, overflow: 'hidden' }}>
                      <View style={{ flex: 1, backgroundColor: T.bg, overflow: 'hidden' }}>
                        <StatusBar style={statusStyle} />
                        {Platform.OS === 'android' && (
                          <RNStatusBar translucent backgroundColor="transparent" barStyle={barStyle} />
                        )}
                        <AuthGate>
                          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: T.bg } }}>
                            <Stack.Screen name="(auth)" />
                            <Stack.Screen name="(candidate)" />
                            <Stack.Screen name="(company)" />
                          </Stack>
                        </AuthGate>
                      </View>
                    </View>
                  </ThemeProvider>
                </CandidateProfileProvider>
              </VerificationProvider>
        </SubscriptionProvider>
    </AuthProvider>
  );
}

export default Sentry.wrap(RootLayout);
