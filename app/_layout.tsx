import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo } from 'react';
import { View, StatusBar as RNStatusBar, Platform } from 'react-native';
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

  return (
    <ApplicationProvider>
      <SubscriptionProvider>
        <SwipeStoreProvider>
          <ChatProvider>
            <VerificationProvider>
              <CandidateProfileProvider>
                <ThemeProvider value={navTheme}>
                  <View style={{ flex: 1, backgroundColor: T.bg }}>
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
                </ThemeProvider>
              </CandidateProfileProvider>
            </VerificationProvider>
          </ChatProvider>
        </SwipeStoreProvider>
      </SubscriptionProvider>
    </ApplicationProvider>
  );
}
