import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo } from 'react';
import { View, StatusBar as RNStatusBar, Platform } from 'react-native';
import { WEB_APP_MAX_WIDTH } from '@/lib/screen';
import { StatusBar } from 'expo-status-bar';
import { CandidateProfileProvider } from '@/lib/candidateProfile';
import { VerificationProvider } from '@/lib/useVerification';
import { ApplicationProvider } from '@/lib/applicationStore';
import { SwipeStoreProvider } from '@/lib/swipeStore';
import { SubscriptionProvider } from '@/lib/subscriptionStore';
import { HiyameThemeProvider, useTheme } from '@/lib/theme';
import { ChatProvider } from '@/lib/chatStore';
import 'react-native-reanimated';

export { ErrorBoundary } from 'expo-router';

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
    <HiyameThemeProvider>
      <RootLayoutNav />
    </HiyameThemeProvider>
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
    <ApplicationProvider>
      <SubscriptionProvider>
        <SwipeStoreProvider>
          <ChatProvider>
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
                      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: T.bg } }}>
                        <Stack.Screen name="(auth)" />
                        <Stack.Screen name="(candidate)" />
                        <Stack.Screen name="(company)" />
                      </Stack>
                    </View>
                  </View>
                </ThemeProvider>
              </CandidateProfileProvider>
            </VerificationProvider>
          </ChatProvider>
        </SwipeStoreProvider>
      </SubscriptionProvider>
    </ApplicationProvider>
  );
}
