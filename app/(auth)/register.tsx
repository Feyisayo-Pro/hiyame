import { useRef, useEffect, useMemo } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import AppIcon, { AppIconName } from '@/components/AppIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette, DISPLAY_FONT_FAMILY } from '@/lib/theme';
import ScreenFrame from '@/components/ScreenFrame';
import AnimatedPressable from '@/components/AnimatedPressable';

// A real "choose your account type" screen — previously this route just
// redirected straight to /(auth)/welcome, and the nav's generic "Sign up"
// pill guessed candidate every time (real feedback: "when I click signup,
// there should be candidate or company, not just guesswork"). Mirrors
// login.tsx's own persona-choice pattern exactly, so signing up and signing
// in feel like the same decision asked the same way.
interface SignUpOption {
  key: string;
  icon: AppIconName;
  title: string;
  subtitle: string;
  micro: string;
  route: string;
}

const OPTIONS: SignUpOption[] = [
  {
    key: 'candidate',
    icon: 'person-outline',
    title: 'Career Professional',
    subtitle: 'Create your talent profile',
    micro: 'Get verified once, then let companies come to you',
    route: '/(auth)/candidate-signup',
  },
  {
    key: 'company',
    icon: 'business-outline',
    title: 'Company Partner',
    subtitle: 'Create your hiring workspace',
    micro: 'Post a role and get a ranked shortlist',
    route: '/(auth)/company-signup',
  },
];

export default function RegisterScreen() {
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
      <ScreenFrame maxWidth={560}>
      <AnimatedPressable style={st.backButton} onPress={() => router.back()} scaleTo={0.9}>
        <AppIcon name="arrow-back" size={20} color={T.textPrimary} />
      </AnimatedPressable>

      <ScrollView
        contentContainerStyle={st.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View style={[st.headerWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={st.logoMark}>
            <AppIcon name="leaf" size={20} color={T.textOnAccent} />
          </View>
          <Text style={st.title}>Create your account</Text>
          <Text style={st.subtitle}>Choose which one you're creating</Text>
        </Animated.View>

        <Animated.View style={[st.cardsWrap, { opacity: cardFade, transform: [{ translateY: cardSlide }] }]}>
          {OPTIONS.map((opt) => (
            <AnimatedPressable
              key={opt.key}
              style={(state) => [st.optionCard, state.hovered && st.optionCardHover]}
              onPress={() => router.push(opt.route as any)}
              scaleTo={0.98}
            >
              <View style={st.optionTop}>
                <View style={st.optionIconWrap}>
                  <AppIcon name={opt.icon} size={26} color={T.accent} />
                </View>
                <AppIcon name="chevron-forward" size={20} color={T.textMuted} />
              </View>

              <Text style={st.optionTitle}>{opt.title}</Text>
              <Text style={st.optionSubtitle}>{opt.subtitle}</Text>

              <View style={st.microRow}>
                <AppIcon name="checkmark-circle-outline" size={12} color={T.accent} />
                <Text style={st.microText}>{opt.micro}</Text>
              </View>
            </AnimatedPressable>
          ))}
        </Animated.View>

        <View style={st.footer}>
          <View style={st.dividerRow}>
            <View style={st.dividerLine} />
            <Text style={st.dividerText}>Already have an account?</Text>
            <View style={st.dividerLine} />
          </View>
          <AnimatedPressable
            style={(state) => [st.registerButton, state.hovered && st.registerButtonHover]}
            onPress={() => router.push('/(auth)/login')}
            scaleTo={0.96}
          >
            <AppIcon name="log-in-outline" size={18} color={T.accent} />
            <Text style={st.registerText}>Log In</Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
      </ScreenFrame>
    </SafeAreaView>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg, paddingHorizontal: 20 },
  scrollContent: { flexGrow: 1, justifyContent: 'space-between' },

  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: T.card, borderWidth: 1, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 8, marginBottom: 24,
  },

  headerWrap: { marginBottom: 32 },
  logoMark: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: T.accent,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.5, marginBottom: 6, fontFamily: DISPLAY_FONT_FAMILY },
  subtitle: { fontSize: 15, color: T.textSecondary, fontWeight: '500' },

  cardsWrap: { marginBottom: 24 },
  optionCard: {
    backgroundColor: T.card, borderRadius: 18,
    padding: 22, marginBottom: 14,
    borderWidth: 1.5, borderColor: T.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 2,
  },
  optionCardHover: {
    borderColor: T.accent, backgroundColor: T.cardElevated,
    shadowOpacity: 0.32, shadowRadius: 18, transform: [{ translateY: -6 }],
  },

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
  registerButtonHover: { borderColor: T.accent, backgroundColor: T.accentBg },
  registerText: { fontSize: 15, fontWeight: '700', color: T.accent },
});
