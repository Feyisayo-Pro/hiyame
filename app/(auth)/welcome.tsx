import { useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette } from '@/lib/theme';
import ScreenFrame from '@/components/ScreenFrame';

// The landing screen — folds the old two-step welcome-carousel → register
// flow into one decisive screen (per the redesign brief: Viamatch's whole
// landing is one full-viewport screen, not a carousel then a separate list).
// register.tsx now just redirects here.
//
// Fixed hero identity colors, not theme tokens — same precedent this screen
// already used before this pass (the old hero hardcoded '#1DA1F2' directly).
// A marketing entry point keeping one deliberate look regardless of the
// signed-in app's light/dark toggle is standard, not an oversight.
const CANDIDATE_COLOR = '#1DA1F2'; // T.accent's light-mode value — Hiyame's one brand hue
const CANDIDATE_COLOR_SOFT = '#DCEEFB'; // pastel tint of the same hue, for the recede state
const COMPANY_COLOR = '#0F1419'; // T.textPrimary's light-mode value — near-black
const COMPANY_COLOR_SOFT = '#E3E5E8'; // pastel tint of the same near-black
const PAGE_BG = '#F5F8FC'; // pale, faintly blue-tinted near-white — not literal lavender

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

  const animateTo = (value: number) => {
    Animated.spring(focus, { toValue: value, useNativeDriver: false, speed: 14, bounciness: 6 }).start();
  };

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
        <View style={[st.navPill, stacked && st.navPillStacked]}>
          <View style={st.brandRow}>
            <View style={st.brandDot}>
              <AppIcon name="flash" size={16} color="#FFFFFF" />
            </View>
            <Text style={st.brandText}>Hiyame</Text>
          </View>

          {!stacked && (
            <View style={st.navLinks}>
              <Pressable onPress={goCompany} style={st.navLink} onHoverIn={() => focusPanel('company')} onHoverOut={resetFocus}>
                <Text style={st.navLinkText}>For Companies</Text>
              </Pressable>
              <Pressable onPress={goCandidate} style={st.navLink} onHoverIn={() => focusPanel('candidate')} onHoverOut={resetFocus}>
                <Text style={st.navLinkText}>For Candidates</Text>
              </Pressable>
            </View>
          )}

          <View style={st.navActions}>
            <Pressable style={st.loginPill} onPress={() => router.push('/(auth)/login')}>
              <Text style={st.loginPillText}>Login</Text>
            </Pressable>
            {/* Candidates are Hiyame's larger, lower-friction audience by far
                (over a thousand vs. a couple dozen companies) — the sensible
                default for a generic "Sign up" with no persona context yet. */}
            <Pressable style={st.signUpPill} onPress={goCandidate}>
              <Text style={st.signUpPillText}>Sign up</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Headline ── */}
        <View style={[st.headlineBlock, stacked && st.headlineBlockStacked]}>
          <Text style={[st.headline, stacked && st.headlineStacked]}>Hiyame replaces job boards and agencies</Text>
          <Text style={st.subhead}>Two sides, one platform. Pick yours.</Text>
        </View>

        {/* ── Two panels ── */}
        <View style={[st.panelsRow, stacked && st.panelsColumn]}>
          <Animated.View style={[st.panel, stacked && st.panelStacked, { flex: companyFlex, backgroundColor: companyBg }]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onHoverIn={() => focusPanel('company')}
              onHoverOut={resetFocus}
              onPressIn={() => focusPanel('company')}
              onPressOut={resetFocus}
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
                  <Animated.View style={[st.mockCard, st.mockCardCompany, { transform: [{ rotate: companyCardTilt }] }]}>
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

          <Animated.View style={[st.panel, stacked && st.panelStacked, { flex: candidateFlex, backgroundColor: candidateBg }]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onHoverIn={() => focusPanel('candidate')}
              onHoverOut={resetFocus}
              onPressIn={() => focusPanel('candidate')}
              onPressOut={resetFocus}
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
                  <Animated.View style={[st.mockCard, st.mockCardCandidate, { transform: [{ rotate: candidateCardTilt }] }]}>
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
      </ScrollView>
      </ScreenFrame>
    </SafeAreaView>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },
  frame: { paddingHorizontal: 20, paddingTop: 16 },
  scrollContent: { flexGrow: 1, paddingBottom: 24 },

  navPill: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 999,
    paddingVertical: 8, paddingLeft: 14, paddingRight: 8,
    marginBottom: 28,
    shadowColor: '#0B1220', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  // Mobile fold: the two stacked panels alone (2 × panelStacked) already
  // approach a phone's real viewport height, so every other block on this
  // screen gets trimmed too — this is what keeps the whole thing a single
  // no-scroll hero on a real device instead of just on a 900px desktop tab.
  navPillStacked: { marginBottom: 16 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandDot: { width: 28, height: 28, borderRadius: 9, backgroundColor: CANDIDATE_COLOR, alignItems: 'center', justifyContent: 'center' },
  brandText: { fontSize: 16, fontWeight: '800', color: COMPANY_COLOR, letterSpacing: -0.3 },
  navLinks: { flexDirection: 'row', gap: 4, flex: 1, justifyContent: 'center' },
  navLink: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  navLinkText: { fontSize: 13, fontWeight: '600', color: '#536471' },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' },
  loginPill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: '#E1E8ED' },
  loginPillText: { fontSize: 13, fontWeight: '700', color: COMPANY_COLOR },
  signUpPill: { backgroundColor: CANDIDATE_COLOR, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999 },
  signUpPillText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  headlineBlock: { alignItems: 'center', marginBottom: 28, paddingHorizontal: 12 },
  headlineBlockStacked: { marginBottom: 16 },
  headline: { fontSize: 34, lineHeight: 40, fontWeight: '800', color: COMPANY_COLOR, letterSpacing: -0.6, textAlign: 'center', maxWidth: 620 },
  headlineStacked: { fontSize: 24, lineHeight: 29 },
  subhead: { fontSize: 16, color: '#536471', marginTop: 10, fontWeight: '500' },

  panelsRow: { flexDirection: 'row', gap: 16, flex: 1, minHeight: 380 },
  panelsColumn: { flexDirection: 'column', minHeight: 0 },
  panel: { borderRadius: 28, overflow: 'hidden', minHeight: 340 },
  // No mock card competing for room when stacked, so this only needs to fit
  // eyebrow + headline + body + CTA — verified against real phone heights
  // (390×844 and smaller) with Playwright before shipping.
  panelStacked: { minHeight: 190 },
  panelInner: { flex: 1, padding: 28, justifyContent: 'space-between' },
  panelInnerStacked: { padding: 20 },

  panelEyebrowLight: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: 'rgba(255,255,255,0.7)', marginBottom: 10 },
  panelHeadlineLight: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4, marginBottom: 10 },
  panelBodyLight: { fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,0.85)', maxWidth: 320, marginBottom: 20 },
  panelCta: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999 },
  panelCtaOnBlue: { backgroundColor: '#FFFFFF' },
  panelCtaTextLight: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  panelCtaTextDark: { fontSize: 14, fontWeight: '700', color: COMPANY_COLOR },

  mockCard: {
    position: 'absolute', right: 8, bottom: 8, width: 200,
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14,
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
});
