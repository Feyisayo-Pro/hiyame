import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette, DISPLAY_FONT_FAMILY } from '@/lib/theme';
import ScreenFrame from '@/components/ScreenFrame';
import PublicNav from '@/components/PublicNav';
import GradientBlobBackground from '@/components/GradientBlobBackground';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';

// The landing screen — folds the old two-step welcome-carousel → register
// flow into one decisive screen (per the redesign brief: Viamatch's whole
// landing is one full-viewport screen, not a carousel then a separate list).
// register.tsx now just redirects here.
//
// Back to a pure single-viewport hero (nav + headline + two panels, no
// scroll, no footer) — "How it works" briefly lived here as a section
// below the fold, then moved to its own route (app/(auth)/how-it-works.tsx)
// so it's a real, directly-linkable destination rather than something you
// only reach by scrolling. That also restores this screen's original
// no-scroll intent for real, not just "the hero fold happens to fit."
//
// Fixed hero identity colors, not theme tokens — same precedent this screen
// already used before this pass (the old hero hardcoded '#1DA1F2' directly).
// A marketing entry point keeping one deliberate look regardless of the
// signed-in app's light/dark toggle is standard, not an oversight.
const CANDIDATE_COLOR = 'rgba(29,161,242,0.98)'; // slightly transparent brand hue
const CANDIDATE_COLOR_SOFT = 'rgba(29,161,242,0.12)'; // pastel tint of the same hue
const COMPANY_COLOR = 'rgba(15,20,25,0.96)'; // near-black, slightly transparent
const COMPANY_COLOR_SOFT = 'rgba(15,20,25,0.08)'; // soft tint of the near-black
const PAGE_BG = '#F3F6FA'; // slightly richer near-white for contrast

const STACK_BREAKPOINT = 760;

type PanelKey = 'company' | 'candidate';

export default function WelcomeScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const { width } = useWindowDimensions();
  const stacked = width < STACK_BREAKPOINT;

  // -1 = candidate panel focused, 0 = resting (both full color), 1 = company
  // focused. One shared value drives both panels' flex + color together, so
  // they always move in lockstep — one expanding is always the other's
  // recede, never independent.
  const focus = useRef(new Animated.Value(0)).current;
  const [pressed, setPressed] = useState<PanelKey | null>(null);

  // Separate from `focus` (which drives the hover-expand) — a small press-down
  // scale so tapping a panel gives the same instant, physical feedback every
  // other button in the app has, instead of the panel just silently
  // navigating away mid-hover.
  const companyPress = useRef(new Animated.Value(1)).current;
  const candidatePress = useRef(new Animated.Value(1)).current;
  const pressDown = (v: Animated.Value) => Animated.spring(v, { toValue: 0.985, useNativeDriver: false, speed: 50, bounciness: 6 }).start();
  const pressUp = (v: Animated.Value) => Animated.spring(v, { toValue: 1, useNativeDriver: false, speed: 30, bounciness: 8 }).start();

  const animateTo = (value: number) => {
    Animated.spring(focus, { toValue: value, useNativeDriver: false, speed: 14, bounciness: 6 }).start();
  };

  // Ambient float on the two mock cards — decorative motion layered on top
  // of content that's already fully visible (not gating anything on this
  // running, unlike a scroll-triggered reveal, which MASTER.md explicitly
  // bans). Two independent loops, out of phase, so the cards never move in
  // lockstep like the hover-driven panel motion above.
  const floatA = useRef(new Animated.Value(0)).current;
  const floatB = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // useNativeDriver: false to match `focus` above (which also drives a
    // `rotate` in this same transform array via flex/backgroundColor
    // interpolation, incompatible with the native driver) — mixing native-
    // and JS-driven animations on the same view's `transform` array is
    // rejected by RN at runtime, not just slower.
    const loop = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 2600, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          Animated.timing(v, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ])
      );
    const a = loop(floatA, 0);
    const b = loop(floatB, 400);
    a.start();
    b.start();
    return () => { a.stop(); b.stop(); };
  }, []);
  const floatATranslate = floatA.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  const floatBTranslate = floatB.interpolate({ inputRange: [0, 1], outputRange: [0, -9] });

  const focusPanel = (key: PanelKey) => { setPressed(key); animateTo(key === 'company' ? 1 : -1); };
  const resetFocus = () => { setPressed(null); animateTo(0); };

  const goCompany = () => router.push('/(auth)/company-signup');
  const goCandidate = () => router.push('/(auth)/candidate-signup');

  const companyFlex = focus.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.72, 1, stacked ? 1 : 1.45] });
  const candidateFlex = focus.interpolate({ inputRange: [-1, 0, 1], outputRange: [stacked ? 1 : 1.45, 1, 0.72] });
  const companyBg = focus.interpolate({ inputRange: [-1, 0, 1], outputRange: [COMPANY_COLOR_SOFT, COMPANY_COLOR, COMPANY_COLOR] });
  const candidateBg = focus.interpolate({ inputRange: [-1, 0, 1], outputRange: [CANDIDATE_COLOR, CANDIDATE_COLOR, CANDIDATE_COLOR_SOFT] });
  const companyTextOpacity = focus.interpolate({ inputRange: [-1, -0.3, 0], outputRange: [0.35, 1, 1], extrapolate: 'clamp' });
  const candidateTextOpacity = focus.interpolate({ inputRange: [0, 0.3, 1], outputRange: [1, 1, 0.35], extrapolate: 'clamp' });
  const companyCardTilt = focus.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-2deg', '-4deg', '0deg'] });
  const candidateCardTilt = focus.interpolate({ inputRange: [-1, 0, 1], outputRange: ['0deg', '3deg', '5deg'] });

  return (
    <SafeAreaView style={st.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenFrame maxWidth={1120} style={st.frame}>
      <ScrollView contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Nav ── */}
        <SwipeFadeContainer axis="y" offset={16} duration={420} delay={0}>
          <PublicNav stacked={stacked} />
        </SwipeFadeContainer>

        <View style={st.blobZone}>
        <GradientBlobBackground />

        {/* ── Headline ── */}
        <SwipeFadeContainer axis="y" offset={16} duration={420} delay={90}>
            <View style={[st.headlineBlock, stacked && st.headlineBlockStacked]}>
            <Text style={[st.headline, stacked && st.headlineStacked]}>Hiyame replaces job boards and agencies</Text>
            <Text style={st.subhead}>Two sides, one platform. Pick yours.</Text>
          </View>
        </SwipeFadeContainer>

        {/* ── Two panels ── */}
        <SwipeFadeContainer axis="y" offset={20} duration={480} delay={180} style={st.panelsFadeWrap}>
        <View style={[st.panelsRow, stacked && st.panelsColumn]}>
          <Animated.View style={[st.panel, stacked && st.panelStacked, { flex: companyFlex, backgroundColor: companyBg, transform: [{ scale: companyPress }] }]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onHoverIn={() => focusPanel('company')}
              onHoverOut={resetFocus}
              onPressIn={() => { focusPanel('company'); pressDown(companyPress); }}
              onPressOut={() => { resetFocus(); pressUp(companyPress); }}
              onPress={goCompany}
              accessibilityRole="button"
              accessibilityLabel="For Companies — post a role"
            >
              <View style={[st.panelInner, stacked && st.panelInnerStacked]}>
                <Animated.View style={{ opacity: companyTextOpacity }}>
                  <Text style={st.panelEyebrowLight}>FOR COMPANIES</Text>
                  <Text style={st.panelHeadlineLight}>We're hiring</Text>
                  <Text style={st.panelBodyLight}>
                    Get a ranked shortlist of verified African professionals — no job board, no sifting through résumés.
                  </Text>
                  <View style={st.panelCta}>
                    <Text style={st.panelCtaTextLight}>Post a role</Text>
                    <AppIcon name="arrow-forward" size={16} color="#FFFFFF" />
                  </View>
                </Animated.View>

                {/* The mock card is decorative filler for the panel's empty
                    lower half — on stacked (mobile) layout there's no empty
                    half to fill, and its ~150px would push the two panels
                    past the viewport, forcing the exact "scroll to see the
                    rest of the hero" bug this was fixed for. */}
                {!stacked && (
                  <Animated.View style={[st.mockCard, st.mockCardCompany, { transform: [{ rotate: companyCardTilt }, { translateY: floatATranslate }] }]}>
                    <View style={st.mockCardRow}>
                      <View style={st.mockAvatar}><Text style={st.mockAvatarText}>KA</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={st.mockCardName}>Kemi A.</Text>
                        <Text style={st.mockCardMeta}>Senior Backend Engineer</Text>
                      </View>
                      <View style={st.mockScoreBadge}><Text style={st.mockScoreText}>92%</Text></View>
                    </View>
                    <View style={st.mockChipRow}>
                      <View style={st.mockChip}><Text style={st.mockChipText}>Python</Text></View>
                      <View style={st.mockChip}><Text style={st.mockChipText}>FastAPI</Text></View>
                    </View>
                  </Animated.View>
                )}
              </View>
            </Pressable>
          </Animated.View>

          <Animated.View style={[st.panel, stacked && st.panelStacked, { flex: candidateFlex, backgroundColor: candidateBg, transform: [{ scale: candidatePress }] }]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onHoverIn={() => focusPanel('candidate')}
              onHoverOut={resetFocus}
              onPressIn={() => { focusPanel('candidate'); pressDown(candidatePress); }}
              onPressOut={() => { resetFocus(); pressUp(candidatePress); }}
              onPress={goCandidate}
              accessibilityRole="button"
              accessibilityLabel="For Candidates — get verified"
            >
              <View style={[st.panelInner, stacked && st.panelInnerStacked]}>
                <Animated.View style={{ opacity: candidateTextOpacity }}>
                  <Text style={st.panelEyebrowLight}>FOR CANDIDATES</Text>
                  <Text style={st.panelHeadlineLight}>I'm looking for work</Text>
                  <Text style={st.panelBodyLight}>
                    Get verified once, then let vetted companies come to you with real introductions.
                  </Text>
                  <View style={[st.panelCta, st.panelCtaOnBlue]}>
                    <Text style={st.panelCtaTextDark}>Get verified</Text>
                    <AppIcon name="arrow-forward" size={16} color={COMPANY_COLOR} />
                  </View>
                </Animated.View>

                {!stacked && (
                  <Animated.View style={[st.mockCard, st.mockCardCandidate, { transform: [{ rotate: candidateCardTilt }, { translateY: floatBTranslate }] }]}>
                    <View style={st.mockMatchHead}>
                      <AppIcon name="sparkles" size={13} color="#17A75B" />
                      <Text style={st.mockMatchHeadText}>You've been matched</Text>
                    </View>
                    <Text style={st.mockCardName}>Data Analyst</Text>
                    <View style={st.mockChipRow}>
                      <View style={[st.mockChip, st.mockChipDark]}><Text style={st.mockChipTextDark}>Corporate</Text></View>
                      <Text style={st.mockWindowText}>48h to respond</Text>
                    </View>
                  </Animated.View>
                )}
              </View>
            </Pressable>
          </Animated.View>
        </View>
        </SwipeFadeContainer>

        {/* "How it works" link — the discoverable path to its own page now
            that it's no longer a section on this one. */}
        <SwipeFadeContainer axis="y" offset={12} duration={400} delay={260}>
          <Pressable style={st.howLink} onPress={() => router.push('/(auth)/how-it-works')}>
            <Text style={st.howLinkText}>See exactly how it works</Text>
            <AppIcon name="arrow-forward" size={14} color={CANDIDATE_COLOR} />
          </Pressable>
        </SwipeFadeContainer>
        
        <SwipeFadeContainer axis="y" offset={12} duration={420} delay={320}>
          <View style={st.featuresSection}>
            <Text style={st.featuresTitle}>What you'll get</Text>
            <View style={st.featuresGrid}>
              <View style={st.featureCard}>
                <AppIcon name="sparkles" size={18} color={CANDIDATE_COLOR} />
                <Text style={st.featureText}>Ranked, verified shortlists</Text>
              </View>
              <View style={st.featureCard}>
                <AppIcon name="checkmark-circle" size={18} color={COMPANY_COLOR} />
                <Text style={st.featureText}>Focus on interviews, not screening</Text>
              </View>
              <View style={st.featureCard}>
                <AppIcon name="time" size={18} color={CANDIDATE_COLOR} />
                <Text style={st.featureText}>Timed introductions and reminders</Text>
              </View>
            </View>
          </View>
        </SwipeFadeContainer>
        </View>
      </ScrollView>
      </ScreenFrame>
    </SafeAreaView>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },
  frame: { paddingHorizontal: 20, paddingTop: 16 },
  scrollContent: { flexGrow: 1, paddingBottom: 24 },

  // Wraps headline → panels → "how it works" link so GradientBlobBackground's
  // absoluteFill covers exactly that region (not the nav).
  blobZone: { position: 'relative' },

  headlineBlock: { alignItems: 'center', marginBottom: 28, paddingHorizontal: 12 },
  headlineBlockStacked: { marginBottom: 16 },
  headline: { fontSize: 40, lineHeight: 46, fontWeight: '800', color: COMPANY_COLOR, letterSpacing: -0.6, textAlign: 'center', maxWidth: 720, fontFamily: DISPLAY_FONT_FAMILY },
  headlineStacked: { fontSize: 28, lineHeight: 34 },
  subhead: { fontSize: 17, color: '#475A6B', marginTop: 12, fontWeight: '600', maxWidth: 640, textAlign: 'center' },

  // SwipeFadeContainer's own Animated.View needs flex:1 too, or the panels'
  // own flex:1 (which makes them fill the remaining single-viewport height)
  // has nothing to expand into and silently collapses to content size.
  panelsFadeWrap: { flex: 1 },
  panelsRow: { flexDirection: 'row', gap: 16, flex: 1, minHeight: 420 },
  panelsColumn: { flexDirection: 'column', minHeight: 0 },
  panel: { borderRadius: 28, overflow: 'hidden', minHeight: 340, backgroundColor: 'transparent' },
  // No mock card competing for room when stacked, so this only needs to fit
  // eyebrow + headline + body + CTA — verified against real phone heights
  // (390×844 and smaller) with Playwright before shipping. Bumped from 190
  // to 300 after the panel text sizes grew (headline 26->28, body 14->15/
  // lineHeight 22) without this being raised to match — the CTA button
  // ("Post a role" / "Get verified") was getting clipped off entirely on
  // mobile since `panel` has overflow:'hidden'.
  panelStacked: { minHeight: 300 },
  panelInner: { flex: 1, padding: 28, justifyContent: 'space-between' },
  panelInnerStacked: { padding: 20 },

  panelEyebrowLight: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: 'rgba(255,255,255,0.7)', marginBottom: 10 },
  panelHeadlineLight: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4, marginBottom: 10, fontFamily: DISPLAY_FONT_FAMILY },
  panelBodyLight: { fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.9)', maxWidth: 360, marginBottom: 20 },
  panelCta: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999 },
  panelCtaOnBlue: { backgroundColor: '#FFFFFF' },
  panelCtaTextLight: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  panelCtaTextDark: { fontSize: 14, fontWeight: '700', color: COMPANY_COLOR },

  mockCard: {
    position: 'absolute', right: 8, bottom: 8, width: 220,
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16,
    shadowColor: '#0B1220', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 22, elevation: 8,
  },
  mockCardCompany: {},
  mockCardCandidate: {},
  mockCardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  mockAvatar: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#EEF0F3', alignItems: 'center', justifyContent: 'center' },
  mockAvatarText: { fontSize: 12, fontWeight: '700', color: COMPANY_COLOR },
  mockCardName: { fontSize: 14, fontWeight: '700', color: COMPANY_COLOR },
  mockCardMeta: { fontSize: 11, color: '#8A97A4', marginTop: 1 },
  mockScoreBadge: { backgroundColor: 'rgba(23,167,91,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  mockScoreText: { fontSize: 11, fontWeight: '800', color: '#17A75B' },
  mockChipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 },
  mockChip: { backgroundColor: '#EEF0F3', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 },
  mockChipText: { fontSize: 10, fontWeight: '600', color: '#5B6875' },
  mockChipDark: { backgroundColor: 'rgba(15,20,25,0.06)' },
  mockChipTextDark: { fontSize: 10, fontWeight: '700', color: COMPANY_COLOR },
  mockWindowText: { fontSize: 10, fontWeight: '600', color: '#E0870B' },
  mockMatchHead: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  mockMatchHeadText: { fontSize: 11, fontWeight: '700', color: '#17A75B' },

  howLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20, paddingVertical: 4 },
  howLinkText: { fontSize: 13.5, fontWeight: '700', color: CANDIDATE_COLOR },

  // Features section added to provide more landing-page content
  featuresSection: { marginTop: 22, paddingHorizontal: 12, alignItems: 'center' },
  featuresTitle: { fontSize: 20, fontWeight: '800', color: COMPANY_COLOR, marginBottom: 12, fontFamily: DISPLAY_FONT_FAMILY },
  // flexWrap added — 3 fixed-content cards in one unwrapped row overflowed
  // the viewport horizontally on mobile (the 3rd card was cut off at the
  // edge), which is also a banned anti-pattern (no horizontal page scroll).
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  featureCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, marginHorizontal: 6 },
  featureText: { fontSize: 14, color: '#2E3B44', fontWeight: '600' },
});
