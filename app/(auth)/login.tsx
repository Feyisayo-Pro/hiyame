import { useRef, useEffect, useMemo} from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette } from '@/lib/theme';

interface SignInOption {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  micro: string;
  route: string;
}

const OPTIONS: SignInOption[] = [
  {
    key: 'candidate',
    icon: 'person-outline',
    title: 'Career Professional',
    subtitle: 'Sign in to your talent profile',
    micro: 'Find premium roles matched to your skills',
    route: '/(auth)/candidate-signin',
  },
  {
    key: 'company',
    icon: 'business-outline',
    title: 'Company Partner',
    subtitle: 'Sign in to your hiring workspace',
    micro: 'Post jobs & hire verified African talent',
    route: '/(auth)/company-signin',
  },
];

export default function LoginScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(cardSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right', 'bottom']}>
      {/* Back Button */}
      <Pressable style={st.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={T.textPrimary} />
      </Pressable>

      {/* Header */}
      <Animated.View style={[st.headerWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={st.logoMark}>
          <Ionicons name="leaf" size={20} color={T.textOnAccent} />
        </View>
        <Text style={st.title}>Welcome Back</Text>
        <Text style={st.subtitle}>Choose how you'd like to sign in</Text>
      </Animated.View>

      {/* Option Cards */}
      <Animated.View style={[st.cardsWrap, { opacity: cardFade, transform: [{ translateY: cardSlide }] }]}>
        {OPTIONS.map((opt, index) => (
          <Pressable
            key={opt.key}
            style={({ pressed }) => [st.optionCard, pressed && st.optionCardPressed]}
            onPress={() => router.push(opt.route as any)}
          >
            <View style={st.optionTop}>
              <View style={st.optionIconWrap}>
                <Ionicons name={opt.icon} size={26} color={T.accent} />
              </View>
              <Ionicons name="chevron-forward" size={20} color={T.textMuted} />
            </View>

            <Text style={st.optionTitle}>{opt.title}</Text>
            <Text style={st.optionSubtitle}>{opt.subtitle}</Text>

            <View style={st.microRow}>
              <Ionicons name="sparkles-outline" size={12} color={T.accent} />
              <Text style={st.microText}>{opt.micro}</Text>
            </View>
          </Pressable>
        ))}
      </Animated.View>

      {/* Footer */}
      <View style={st.footer}>
        <View style={st.dividerRow}>
          <View style={st.dividerLine} />
          <Text style={st.dividerText}>New to hiyame?</Text>
          <View style={st.dividerLine} />
        </View>
        <Pressable
          style={st.registerButton}
          onPress={() => router.push('/(auth)/register')}
        >
          <Ionicons name="add-circle-outline" size={18} color={T.accent} />
          <Text style={st.registerText}>Create an Account</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg, paddingHorizontal: 20 },

  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: T.card, borderWidth: 1, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 8, marginBottom: 24,
  },

  /* Header */
  headerWrap: { marginBottom: 32 },
  logoMark: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: T.accent,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 15, color: T.textSecondary, fontWeight: '500' },

  /* Cards */
  cardsWrap: { flex: 1 },
  optionCard: {
    backgroundColor: T.card, borderRadius: 18,
    padding: 22, marginBottom: 14,
    borderWidth: 1.5, borderColor: T.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 2,
  },
  optionCardPressed: { borderColor: T.accent, backgroundColor: T.cardElevated },

  optionTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  optionIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: T.accentBg, borderWidth: 1, borderColor: T.accentBg20,
    alignItems: 'center', justifyContent: 'center',
  },
  optionTitle: { fontSize: 19, fontWeight: '700', color: T.textPrimary, marginBottom: 4 },
  optionSubtitle: { fontSize: 14, color: T.textSecondary, marginBottom: 14 },

  microRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: T.accentBg, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: T.accentBg20,
  },
  microText: { fontSize: 12, fontWeight: '600', color: T.accent },

  /* Footer */
  footer: { paddingBottom: 16 },
  dividerRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: T.border },
  dividerText: { fontSize: 13, color: T.textMuted, fontWeight: '500' },
  registerButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 50,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border,
  },
  registerText: { fontSize: 15, fontWeight: '700', color: T.accent },
});
