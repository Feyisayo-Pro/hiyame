import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, StatusBar as RNStatusBar, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { WEB_APP_MAX_WIDTH } from '@/lib/screen';
import { StatusBar } from 'expo-status-bar';
import { CandidateProfileProvider } from '@/lib/candidateProfile';
import { VerificationProvider } from '@/lib/useVerification';
import { SubscriptionProvider } from '@/lib/subscriptionStore';
import { HiyameThemeProvider, useTheme, ThemePalette } from '@/lib/theme';
import { AuthProvider, useAuth } from '@/lib/useAuth';
import 'react-native-reanimated';

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
        <Ionicons name="warning-outline" size={32} color={T.danger} />
      </View>
      <Text style={st.title}>Something went wrong</Text>
      <Text style={st.subtitle}>{error.message}</Text>
      <Pressable style={st.retryButton} onPress={retry}>
        <Ionicons name="refresh" size={18} color={T.textOnAccent} />
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
  title: { fontSize: 22, fontWeight: '800', color: T.textPrimary, marginBottom: 8, textAlign: 'center' },
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

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

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
  const isWeb = Platform.OS === 'web';

  return (
    <AuthProvider>
        <SubscriptionProvider>
            <VerificationProvider>
              <CandidateProfileProvider>
                  <ThemeProvider value={navTheme}>
                    {/* On web there's no phone frame to cap the width, so a desktop browser
                        stretches every screen full-monitor-wide. This centers the app in the
                        same column width lib/screen.ts clamps layout math to — same background
                        as the content itself (no shadow/card treatment), so it reads as a
                        website's content column, not a phone mockup floating in a box. */}
                    <View style={isWeb ? { flex: 1, backgroundColor: T.bg, alignItems: 'center' } : { flex: 1 }}>
                      <View
                        style={
                          isWeb
                            ? { flex: 1, width: '100%', maxWidth: WEB_APP_MAX_WIDTH, backgroundColor: T.bg }
                            : { flex: 1, backgroundColor: T.bg }
                        }
                      >
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
