import { useEffect, useRef, useMemo} from 'react';
import { Animated, Pressable, StyleSheet, View, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ThemePalette } from '@/lib/theme';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);

  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const ctaSlide = useRef(new Animated.Value(60)).current;
  const ctaFade = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(ctaFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(ctaSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const onPressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const onPressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>

      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <View style={styles.logoMark}>
            <Ionicons name="leaf" size={16} color={T.textOnAccent} />
          </View>
          <Text style={styles.logoText}>hiyame</Text>
        </View>
        <Pressable onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <Animated.View
        style={[styles.heroCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <View style={styles.heroGradientTop} />
        <View style={styles.heroGradientMid} />
        <View style={styles.heroGradientBottom} />
        <View style={[styles.floatingCircle, styles.circle1]} />
        <View style={[styles.floatingCircle, styles.circle2]} />
        <View style={[styles.floatingCircle, styles.circle3]} />

        <View style={styles.centerIconWrap}>
          <View style={styles.centerIcon}>
            <Ionicons name="shield-checkmark" size={48} color={T.accent} />
          </View>
          <View style={styles.centerIconRing} />
        </View>

        <View style={styles.heroTextGroup}>
          <Text style={styles.heroLine}>Opportunities</Text>
          <Text style={styles.heroLineAccent}>Come to You</Text>
          <View style={styles.divider} />
          <Text style={styles.heroSub}>Get verified. Get matched. Get hired.</Text>
        </View>

        <View style={styles.dotsRow}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: ctaFade, transform: [{ translateY: ctaSlide }, { scale: scaleAnim }] }}>
        {/* Get Started = Sign Up / New Users */}
        <Pressable
          style={styles.ctaPill}
          onPress={() => router.push('/(auth)/register')}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        >
          <Text style={styles.ctaText}>Get Started</Text>
          <View style={styles.ctaIconCircle}>
            <Ionicons name="arrow-forward" size={20} color={T.textOnAccent} />
          </View>
        </Pressable>

        {/* Sign In = Existing Users → Dual-Persona Portal */}
        <Pressable
          style={styles.signInPill}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.signInPillText}>Sign In</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg, paddingHorizontal: 20 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoMark: { width: 28, height: 28, borderRadius: 8, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 18, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.5 },
  skipText: { color: T.textSecondary, fontSize: 14, fontWeight: '500' },
  heroCard: { flex: 1, borderRadius: 28, overflow: 'hidden', backgroundColor: '#1DA1F2', justifyContent: 'flex-end' },
  heroGradientTop: { ...StyleSheet.absoluteFill, backgroundColor: '#1A8CD8', opacity: 0.7 },
  heroGradientMid: { position: 'absolute', top: '20%', left: -width * 0.2, width: width * 1.4, height: width * 1.4, borderRadius: width * 0.7, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroGradientBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%', backgroundColor: 'rgba(0,0,0,0.25)' },
  floatingCircle: { position: 'absolute', borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)' },
  circle1: { width: 140, height: 140, top: 30, right: -30 },
  circle2: { width: 100, height: 100, top: 140, left: 10 },
  circle3: { width: 70, height: 70, top: 70, left: '42%' as any },
  centerIconWrap: { position: 'absolute', top: '28%', alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  centerIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 8 },
  centerIconRing: { position: 'absolute', width: 108, height: 108, borderRadius: 54, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  heroTextGroup: { padding: 28, zIndex: 1 },
  heroLine: { fontSize: 32, fontWeight: '300', color: '#FFFFFF', marginBottom: 2 },
  heroLineAccent: { fontSize: 34, fontWeight: '800', color: '#FFFFFF', lineHeight: 40, marginBottom: 12 },
  divider: { width: 40, height: 3, borderRadius: 2, backgroundColor: '#FFFFFF', marginBottom: 12 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  dotsRow: { flexDirection: 'row', alignSelf: 'center', gap: 8, marginBottom: 20, zIndex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: '#FFFFFF', width: 24, borderRadius: 4 },
  ctaPill: { marginTop: 20, backgroundColor: T.textPrimary, borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingLeft: 24, paddingRight: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 6 },
  ctaText: { color: T.mode === 'dark' ? '#0D0D0C' : '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  ctaIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  signInPill: { marginTop: 12, borderRadius: 50, borderWidth: 2, borderColor: T.textPrimary, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  signInPillText: { fontSize: 17, fontWeight: '700', color: T.textPrimary, letterSpacing: 0.3 },
});
