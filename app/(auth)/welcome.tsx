import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
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
      <StatusBar style="dark" />

      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <View style={styles.logoMark}>
            <Ionicons name="leaf" size={16} color="#FFFFFF" />
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
            <Ionicons name="shield-checkmark" size={48} color="#43A047" />
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
        <Pressable
          style={styles.ctaPill}
          onPress={() => router.push('/(auth)/register')}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        >
          <Text style={styles.ctaText}>Get Started</Text>
          <View style={styles.ctaIconCircle}>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </View>
        </Pressable>
      </Animated.View>

      <Animated.View style={{ opacity: ctaFade }}>
        <Pressable onPress={() => router.push('/(auth)/login')} style={styles.signInRow}>
          <Text style={styles.signInText}>Already have an account? </Text>
          <Text style={styles.signInLink}>Sign In</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7F0', paddingHorizontal: 20 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoMark: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#43A047', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5 },
  skipText: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
  heroCard: { flex: 1, borderRadius: 28, overflow: 'hidden', backgroundColor: '#C8E6C0', justifyContent: 'flex-end' },
  heroGradientTop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#A5D6A7', opacity: 0.5 },
  heroGradientMid: { position: 'absolute', top: '30%', left: -width * 0.2, width: width * 1.4, height: width * 1.4, borderRadius: width * 0.7, backgroundColor: '#81C784', opacity: 0.25 },
  heroGradientBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%', backgroundColor: 'rgba(0,0,0,0.3)' },
  floatingCircle: { position: 'absolute', borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.12)' },
  circle1: { width: 120, height: 120, top: 40, right: -20 },
  circle2: { width: 80, height: 80, top: 160, left: 20 },
  circle3: { width: 60, height: 60, top: 80, left: '45%' as any },
  centerIconWrap: { position: 'absolute', top: '28%', alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  centerIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8 },
  centerIconRing: { position: 'absolute', width: 108, height: 108, borderRadius: 54, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  heroTextGroup: { padding: 28, zIndex: 1 },
  heroLine: { fontSize: 32, fontWeight: '300', color: '#FFFFFF', marginBottom: 2 },
  heroLineAccent: { fontSize: 34, fontWeight: '800', color: '#FFFFFF', lineHeight: 40, marginBottom: 12 },
  divider: { width: 40, height: 3, borderRadius: 2, backgroundColor: '#66BB6A', marginBottom: 12 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  dotsRow: { flexDirection: 'row', alignSelf: 'center', gap: 8, marginBottom: 20, zIndex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { backgroundColor: '#FFFFFF', width: 24, borderRadius: 4 },
  ctaPill: { marginTop: 20, backgroundColor: '#1A1A1A', borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingLeft: 24, paddingRight: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 6 },
  ctaText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  ctaIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#43A047', alignItems: 'center', justifyContent: 'center' },
  signInRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16, marginBottom: 32 },
  signInText: { fontSize: 14, color: '#6B7280' },
  signInLink: { fontSize: 14, fontWeight: '700', color: '#43A047' },
});
