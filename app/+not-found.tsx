import { Link, Stack } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette } from '@/lib/theme';
import { useMemo } from 'react';

export default function NotFoundScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);

  return (
    <>
      <Stack.Screen options={{ title: 'Not Found', headerShown: false }} />
      <SafeAreaView style={st.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={st.iconWrap}>
          <Ionicons name="compass-outline" size={32} color={T.accent} />
        </View>
        <Text style={st.title}>Page not found</Text>
        <Text style={st.subtitle}>The screen you're looking for doesn't exist or may have moved.</Text>
        <Link href="/" asChild>
          <Pressable style={st.homeButton}>
            <Ionicons name="home-outline" size={18} color={T.textOnAccent} />
            <Text style={st.homeButtonText}>Go to Home</Text>
          </Pressable>
        </Link>
      </SafeAreaView>
    </>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: {
    flex: 1, backgroundColor: T.bg,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: T.accentBg, borderWidth: 1, borderColor: T.accentBg20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '800', color: T.textPrimary, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: T.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  homeButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 50,
    backgroundColor: T.accent,
  },
  homeButtonText: { fontSize: 15, fontWeight: '700', color: T.textOnAccent },
});
