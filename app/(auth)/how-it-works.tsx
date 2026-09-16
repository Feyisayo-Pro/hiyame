import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette, DISPLAY_FONT_FAMILY } from '@/lib/theme';
import ScreenFrame from '@/components/ScreenFrame';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import PersonaSwitcher, { PersonaMode } from '@/components/PersonaSwitcher';
import GradientBlobBackground from '@/components/GradientBlobBackground';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';

// Was a section embedded in app/(auth)/welcome.tsx (the home page), reached
// only by scrolling down or via Pricing/About's persona tabs auto-scrolling
// there. Pulled out to its own route so it's a real, directly-linkable
// destination (in PublicNav, from Pricing/About, and shareable as a URL) —
// matching how viamatch.ai itself actually structures this (their version
// lives on a dedicated /for-employers page, confirmed live earlier this
// session, not a section on their bare homepage).
const CANDIDATE_COLOR = '#1DA1F2';
const COMPANY_COLOR = '#0F1419';
const PAGE_BG = '#F5F8FC';
const STACK_BREAKPOINT = 760;

interface HowItWorksStep {
  tab: string;
  icon: string;
  title: string;
  body: string;
}

// Real steps matching what the product actually does (app/(company)/
// create-role.tsx's form, lib/matchingEngine.ts's scoring, app/(company)/
// shortlist.tsx's ranked list; candidate side mirrors app/(auth)/about.tsx's
// 3 steps so the two pages never describe the flow differently).
const HIRING_STEPS: HowItWorksStep[] = [
  { tab: 'Post a role', icon: 'create-outline', title: 'Post a role', body: "Tell us the title, tier, must-have skills, and rate. It goes live and starts matching right away — no job board listing to write." },
  { tab: 'We match', icon: 'compass-outline', title: 'We match', body: "A scoring engine ranks every verified candidate against your role's real requirements — skill fit, experience, rate, and availability." },
  { tab: 'Review shortlist', icon: 'people-outline', title: 'Review your shortlist', body: "Get a ranked shortlist of verified candidates. Send a real introduction to the ones you like — no résumé pile to sift through." },
];

const CANDIDATE_STEPS: HowItWorksStep[] = [
  { tab: 'Verify', icon: 'shield-checkmark-outline', title: 'Verify once', body: 'Identity, video introduction, skills assessment, and employer reference checks — once, not for every application you make.' },
  { tab: 'Get matched', icon: 'compass-outline', title: 'Get matched', body: 'The same scoring engine ranks you against real open roles — skill fit, experience, rate, and availability, not keyword luck.' },
  { tab: 'Get introduced', icon: 'paper-plane-outline', title: 'Get introduced', body: "Companies send you a real introduction and you respond — no cold applications, no job board to keep refreshing." },
];

export default function HowItWorksScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const { width } = useWindowDimensions();
  const stacked = width < STACK_BREAKPOINT;

  // Deep-link from PublicNav / Pricing / About's persona tabs:
  // /(auth)/how-it-works?mode=hiring|candidate lands already on the right
  // persona instead of always defaulting to hiring.
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<PersonaMode>(params.mode === 'candidate' ? 'candidate' : 'hiring');
  const [activeStep, setActiveStep] = useState(0);

  // A brief colored glow around the header on every switch — makes the
  // content actually changing unmistakable rather than a silent swap.
  const highlight = useRef(new Animated.Value(0)).current;
  const pulseHighlight = () => {
    highlight.setValue(1);
    Animated.timing(highlight, { toValue: 0, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  };

  // Switching persona resets to step 1 of that persona's flow — carrying
  // "step 3 of hiring" over into "step 3 of candidate" would land on an
  // unrelated step by coincidence of index, not intent.
  const changeMode = (m: PersonaMode) => {
    setMode(m);
    setActiveStep(0);
    pulseHighlight();
  };
  const steps = mode === 'hiring' ? HIRING_STEPS : CANDIDATE_STEPS;

  // Sliding pill behind the step tabs (segmented-control style) — measured
  // per-tab via onLayout since the three labels differ in width per persona
  // ("Post a role" vs. "Verify"). Non-stacked layout only.
  const [tabLayouts, setTabLayouts] = useState<Record<number, { x: number; width: number }>>({});
  const pillX = useRef(new Animated.Value(0)).current;
  const pillWidth = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = tabLayouts[activeStep];
    if (!l) return;
    Animated.spring(pillX, { toValue: l.x, useNativeDriver: false, speed: 18, bounciness: 7 }).start();
    Animated.spring(pillWidth, { toValue: l.width, useNativeDriver: false, speed: 18, bounciness: 7 }).start();
  }, [activeStep, tabLayouts]);

  return (
    <SafeAreaView style={st.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenFrame maxWidth={1120} style={st.frame}>
        <ScrollView contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
          <SwipeFadeContainer axis="y" offset={16} duration={420} delay={0}>
            <PublicNav stacked={stacked} active="how-it-works" />
          </SwipeFadeContainer>

          <View style={st.blobZone}>
            <GradientBlobBackground />

            <View style={st.howSection}>
              <Animated.View
                pointerEvents="none"
                style={[
                  st.howHighlightRing,
                  {
                    opacity: highlight,
                    transform: [{ scale: highlight.interpolate({ inputRange: [0, 1], outputRange: [1, 1.01] }) }],
                  },
                ]}
              />
              <Text style={st.howEyebrow}>{mode === 'hiring' ? 'FOR EMPLOYERS' : 'FOR CANDIDATES'}</Text>
              <Text style={st.howTitle}>How it works {mode === 'hiring' ? 'for employers' : 'for candidates'}</Text>
              <Text style={st.howSubhead}>
                {mode === 'hiring'
                  ? 'Find the best candidates for your role in three simple steps.'
                  : 'Get matched with real roles in three simple steps.'}
              </Text>

              <View style={[st.stepTabs, stacked && st.stepTabsStacked]}>
                {!stacked && (
                  <Animated.View style={[st.stepTabPill, { left: pillX, width: pillWidth }]} />
                )}
                {steps.map((step, i) => (
                  <Fragment key={step.tab}>
                    <Pressable
                      onPress={() => setActiveStep(i)}
                      onLayout={(e) => {
                        const { x, width: w } = e.nativeEvent.layout;
                        setTabLayouts((prev) => (prev[i]?.x === x && prev[i]?.width === w ? prev : { ...prev, [i]: { x, width: w } }));
                      }}
                      style={[
                        st.stepTab,
                        (stacked || i !== activeStep) && st.stepTabInactiveLook,
                        stacked && i === activeStep && st.stepTabActive,
                      ]}
                    >
                      <Text style={[st.stepTabText, i === activeStep && st.stepTabTextActive]}>{step.tab}</Text>
                    </Pressable>
                    {i < steps.length - 1 && !stacked && <AppIcon name="arrow-forward" size={14} color="#536471" />}
                  </Fragment>
                ))}
              </View>

              <SwipeFadeContainer key={`${mode}-${activeStep}`} axis="y" offset={12} duration={260} delay={0} style={[st.stepContent, stacked && st.stepContentStacked]}>
                <View style={st.stepTextCol}>
                  <View style={st.stepIconWrap}>
                    <AppIcon name={steps[activeStep].icon} size={22} color={CANDIDATE_COLOR} />
                  </View>
                  <Text style={st.stepNumber}>Step {activeStep + 1}</Text>
                  <Text style={st.stepTitle}>{steps[activeStep].title}</Text>
                  <Text style={st.stepBody}>{steps[activeStep].body}</Text>
                </View>

                <View style={st.stepMockCol}>
                  <View style={mockStyles.frame}>
                    <StepMockCard mode={mode} step={activeStep} st={st} />
                  </View>
                </View>
              </SwipeFadeContainer>
            </View>
          </View>

          <PublicFooter stacked={stacked} />
        </ScrollView>
      </ScreenFrame>
      <PersonaSwitcher mode={mode} onChange={changeMode} />
    </SafeAreaView>
  );
}

// Decorative previews of the real screens each step describes — not literal
// screenshots, built from the same mock-card visual language as welcome.tsx's
// hero panels (same avatar/chip/badge treatment).
function StepMockCard({ mode, step, st }: { mode: PersonaMode; step: number; st: ReturnType<typeof makeStyles> }) {
  if (mode === 'hiring') {
    if (step === 0) {
      return (
        <View style={mockStyles.card}>
          <View style={mockStyles.liveBadge}><Text style={mockStyles.liveBadgeText}>LIVE</Text></View>
          <Text style={mockStyles.formTitle}>Senior Backend Engineer</Text>
          <Text style={mockStyles.formMeta}>Corporate · Remote</Text>
          <View style={st.mockChipRow}>
            <View style={st.mockChip}><Text style={st.mockChipText}>Python</Text></View>
            <View style={st.mockChip}><Text style={st.mockChipText}>FastAPI</Text></View>
            <View style={st.mockChip}><Text style={st.mockChipText}>PostgreSQL</Text></View>
          </View>
        </View>
      );
    }
    if (step === 1) {
      return (
        <View style={mockStyles.card}>
          <View style={st.mockCardRow}>
            <View style={st.mockAvatar}><Text style={st.mockAvatarText}>KA</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={st.mockCardName}>Kemi A.</Text>
              <Text style={st.mockCardMeta}>Senior Backend Engineer</Text>
            </View>
            <View style={st.mockScoreBadge}><Text style={st.mockScoreText}>92%</Text></View>
          </View>
          <View style={mockStyles.scoreBar}><View style={[mockStyles.scoreBarFill, { width: '92%' }]} /></View>
        </View>
      );
    }
    return (
      <View style={mockStyles.card}>
        {[{ n: 'Kemi A.', s: '92%' }, { n: 'Tunde O.', s: '87%' }, { n: 'Amaka N.', s: '81%' }].map((c) => (
          <View key={c.n} style={mockStyles.listRow}>
            <Text style={mockStyles.listName}>{c.n}</Text>
            <View style={st.mockScoreBadge}><Text style={st.mockScoreText}>{c.s}</Text></View>
          </View>
        ))}
      </View>
    );
  }
  if (step === 0) {
    return (
      <View style={mockStyles.card}>
        {['Profile Picture', 'Identity Check', 'Video Introduction'].map((label) => (
          <View key={label} style={mockStyles.checkRow}>
            <AppIcon name="checkmark-circle" size={16} color="#17A75B" />
            <Text style={mockStyles.checkLabel}>{label}</Text>
          </View>
        ))}
      </View>
    );
  }
  if (step === 1) {
    return (
      <View style={mockStyles.card}>
        <View style={st.mockMatchHead}>
          <AppIcon name="sparkles" size={13} color="#17A75B" />
          <Text style={st.mockMatchHeadText}>You've been matched</Text>
        </View>
        <Text style={st.mockCardName}>Data Analyst</Text>
        <View style={st.mockChipRow}>
          <View style={[st.mockChip, st.mockChipDark]}><Text style={st.mockChipTextDark}>Corporate</Text></View>
        </View>
      </View>
    );
  }
  return (
    <View style={mockStyles.card}>
      <View style={st.mockCardRow}>
        <View style={st.mockAvatar}><AppIcon name="business" size={16} color={COMPANY_COLOR} /></View>
        <View style={{ flex: 1 }}>
          <Text style={st.mockCardName}>New introduction</Text>
          <Text style={st.mockCardMeta}>From a Corporate-tier company</Text>
        </View>
      </View>
      <Text style={mockStyles.windowText}>48h to respond</Text>
    </View>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },
  frame: { paddingHorizontal: 20, paddingTop: 16 },
  scrollContent: { flexGrow: 1, paddingBottom: 88 },

  blobZone: { position: 'relative' },

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
  mockMatchHead: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  mockMatchHeadText: { fontSize: 11, fontWeight: '700', color: '#17A75B' },

  howSection: { marginTop: 16, paddingBottom: 32, position: 'relative' },
  howHighlightRing: {
    position: 'absolute', top: -20, left: -20, right: -20, bottom: -20,
    borderRadius: 32, borderWidth: 2, borderColor: CANDIDATE_COLOR, backgroundColor: 'rgba(29,161,242,0.05)',
  },
  howEyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, color: CANDIDATE_COLOR, marginBottom: 10 },
  howTitle: { fontSize: 30, fontWeight: '800', color: COMPANY_COLOR, letterSpacing: -0.5, marginBottom: 8, fontFamily: DISPLAY_FONT_FAMILY },
  howSubhead: { fontSize: 15.5, color: '#536471', fontWeight: '500', maxWidth: 480, marginBottom: 32 },

  stepTabs: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32, flexWrap: 'wrap' },
  stepTabsStacked: { flexDirection: 'column', alignItems: 'flex-start' },
  stepTab: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999 },
  stepTabInactiveLook: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E8ED' },
  stepTabActive: { backgroundColor: COMPANY_COLOR, borderColor: COMPANY_COLOR },
  stepTabPill: { position: 'absolute', top: 0, bottom: 0, borderRadius: 999, backgroundColor: COMPANY_COLOR },
  stepTabText: { fontSize: 13, fontWeight: '700', color: '#536471' },
  stepTabTextActive: { color: '#FFFFFF' },

  stepContent: { flexDirection: 'row', gap: 40, alignItems: 'center' },
  stepContentStacked: { flexDirection: 'column', alignItems: 'stretch', gap: 24 },
  stepTextCol: { flex: 1, minWidth: 260 },
  stepIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#DCEEFB', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  stepNumber: { fontSize: 12, fontWeight: '800', color: CANDIDATE_COLOR, letterSpacing: 0.4, marginBottom: 6 },
  stepTitle: { fontSize: 22, fontWeight: '800', color: COMPANY_COLOR, marginBottom: 10, letterSpacing: -0.3, fontFamily: DISPLAY_FONT_FAMILY },
  stepBody: { fontSize: 15, color: '#536471', lineHeight: 23, fontWeight: '500', maxWidth: 420 },
  stepMockCol: { flex: 1, minWidth: 240, alignItems: 'center', justifyContent: 'center', minHeight: 220 },
});

const mockStyles = StyleSheet.create({
  frame: {
    width: '100%', maxWidth: 340, minHeight: 220, borderRadius: 28, padding: 24,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(225,232,237,0.7)',
  },
  card: {
    width: '100%', maxWidth: 280, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18,
    shadowColor: '#0B1220', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 6,
  },
  liveBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(23,167,91,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 10 },
  liveBadgeText: { fontSize: 10, fontWeight: '800', color: '#17A75B', letterSpacing: 0.4 },
  formTitle: { fontSize: 15, fontWeight: '800', color: COMPANY_COLOR },
  formMeta: { fontSize: 12, color: '#8A97A4', marginTop: 2, marginBottom: 4, fontWeight: '600' },
  scoreBar: { height: 6, borderRadius: 3, backgroundColor: '#EEF0F3', marginTop: 12, overflow: 'hidden' },
  scoreBarFill: { height: '100%', backgroundColor: '#17A75B', borderRadius: 3 },
  listRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  listName: { fontSize: 13, fontWeight: '700', color: COMPANY_COLOR },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  checkLabel: { fontSize: 13, fontWeight: '600', color: COMPANY_COLOR },
  windowText: { fontSize: 11, fontWeight: '700', color: '#E0870B', marginTop: 10 },
});
