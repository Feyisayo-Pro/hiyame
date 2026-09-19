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
import GradientBlobBackground from '@/components/GradientBlobBackground';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';

// Was a section embedded in app/(auth)/welcome.tsx (the home page), reached
// only by scrolling down or via Pricing/About's persona tabs auto-scrolling
// there. Pulled out to its own route so it's a real, directly-linkable
// destination (in PublicNav, from Pricing/About, and shareable as a URL) —
// matching how viamatch.ai itself actually structures this (their version
// lives on a dedicated /for-employers page, confirmed live earlier this
// session, not a section on their bare homepage).
//
// Both flows now render side by side, always — the old version gated one
// behind a PersonaSwitcher toggle you had to tap before you saw anything
// change, plus a step tab you had to click to advance. Real user feedback:
// "I don't like that I have to click before I see the change, maybe both
// can be there." Each flow now also auto-advances on its own timer (with a
// visible fill bar under the active step and the arrow between steps
// pointing at what's next) so you can just watch it — clicking a step still
// jumps straight to it and restarts the timer, but nothing requires a click.
const CANDIDATE_COLOR = '#1DA1F2';
const COMPANY_COLOR = '#0F1419';
const PAGE_BG = '#F5F8FC';
const STACK_BREAKPOINT = 900;
const STEP_DURATION = 3400; // ms each step stays active before auto-advancing

type PersonaMode = 'hiring' | 'candidate';

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
  // /(auth)/how-it-works?mode=hiring|candidate now just decides which flow
  // renders first (both are always visible), so a candidate-focused link
  // still lands with that flow front and center instead of scrolled past.
  const params = useLocalSearchParams<{ mode?: string }>();
  const leadMode: PersonaMode = params.mode === 'candidate' ? 'candidate' : 'hiring';

  const flows: { mode: PersonaMode; eyebrow: string; title: string; subhead: string; steps: HowItWorksStep[] }[] = [
    { mode: 'hiring', eyebrow: 'FOR EMPLOYERS', title: 'Hiring on Hiyame', subhead: 'Find the best candidates for your role in three steps.', steps: HIRING_STEPS },
    { mode: 'candidate', eyebrow: 'FOR CANDIDATES', title: 'Job seeking on Hiyame', subhead: 'Get matched with real roles in three steps.', steps: CANDIDATE_STEPS },
  ];
  if (leadMode === 'candidate') flows.reverse();

  return (
    <SafeAreaView style={st.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenFrame maxWidth={1120} style={st.frame}>
        <ScrollView contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
          <SwipeFadeContainer axis="y" offset={16} duration={420} delay={0}>
            <PublicNav stacked={stacked} active="how-it-works" />
          </SwipeFadeContainer>

          <View style={st.blobZone}>
            <GradientBlobBackground />

            <SwipeFadeContainer axis="y" offset={14} duration={420} delay={80}>
              <View style={st.howIntro}>
                <Text style={st.howMainEyebrow}>HOW IT WORKS</Text>
                <Text style={st.howMainTitle}>Two sides, one platform</Text>
                <Text style={st.howMainSubhead}>Both flows below play on their own — click any step to jump straight to it.</Text>
              </View>
            </SwipeFadeContainer>

            <View style={[st.flowsRow, stacked && st.flowsColumn]}>
              {flows.map((f, i) => (
                <SwipeFadeContainer key={f.mode} axis="y" offset={18} duration={460} delay={140 + i * 100} style={st.flowFadeWrap}>
                  <AutoStepFlow {...f} st={st} />
                </SwipeFadeContainer>
              ))}
            </View>
          </View>

          <PublicFooter stacked={stacked} />
        </ScrollView>
      </ScreenFrame>
    </SafeAreaView>
  );
}

// Self-contained: owns its own step index + a linear timer that fills over
// STEP_DURATION and, once full, advances to the next step (looping forever).
// Tapping a step jumps straight there and restarts the timer from 0 — the
// auto-play never has to be "turned off" to be interactive.
function AutoStepFlow({ mode, eyebrow, title, subhead, steps, st }: {
  mode: PersonaMode; eyebrow: string; title: string; subhead: string; steps: HowItWorksStep[]; st: ReturnType<typeof makeStyles>;
}) {
  const [activeStep, setActiveStep] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    const anim = Animated.timing(progress, { toValue: 1, duration: STEP_DURATION, easing: Easing.linear, useNativeDriver: false });
    anim.start(({ finished }) => {
      if (finished) setActiveStep((s) => (s + 1) % steps.length);
    });
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, steps.length]);

  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={st.flowCol}>
      <Text style={st.howEyebrow}>{eyebrow}</Text>
      <Text style={st.howTitle}>{title}</Text>
      <Text style={st.howSubhead}>{subhead}</Text>

      <View style={st.stepTabsAuto}>
        {steps.map((step, i) => (
          <Fragment key={step.tab}>
            <Pressable
              onPress={() => setActiveStep(i)}
              style={[st.stepTabAuto, i === activeStep && st.stepTabAutoActive]}
              accessibilityRole="button"
              accessibilityLabel={`Jump to step: ${step.tab}`}
            >
              <Text style={[st.stepTabText, i === activeStep && st.stepTabTextActive]}>{step.tab}</Text>
              <View style={st.timerTrack}>
                {i === activeStep && <Animated.View style={[st.timerFill, { width: progressWidth }]} />}
              </View>
            </Pressable>
            {i < steps.length - 1 && <AppIcon name="arrow-forward" size={14} color="#8A97A4" />}
          </Fragment>
        ))}
      </View>

      <SwipeFadeContainer key={`${mode}-${activeStep}`} axis="y" offset={10} duration={240} delay={0} style={st.stepContentAuto}>
        <View style={st.stepIconWrap}>
          <AppIcon name={steps[activeStep].icon} size={20} color={CANDIDATE_COLOR} />
        </View>
        <Text style={st.stepNumber}>STEP {activeStep + 1} OF {steps.length}</Text>
        <Text style={st.stepTitle}>{steps[activeStep].title}</Text>
        <Text style={st.stepBody}>{steps[activeStep].body}</Text>

        <View style={st.stepMockColAuto}>
          <View style={mockStyles.frame}>
            <StepMockCard mode={mode} step={activeStep} st={st} />
          </View>
        </View>
      </SwipeFadeContainer>
    </View>
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
          <AppIcon name="compass-outline" size={13} color="#17A75B" />
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
  scrollContent: { flexGrow: 1, paddingBottom: 40 },

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

  howIntro: { alignItems: 'center', marginTop: 16, marginBottom: 32, paddingHorizontal: 12 },
  howMainEyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, color: CANDIDATE_COLOR, marginBottom: 10 },
  howMainTitle: { fontSize: 32, fontWeight: '800', color: COMPANY_COLOR, letterSpacing: -0.6, marginBottom: 8, fontFamily: DISPLAY_FONT_FAMILY, textAlign: 'center' },
  howMainSubhead: { fontSize: 15.5, color: '#536471', fontWeight: '500', maxWidth: 480, textAlign: 'center' },

  // Two persona flows side by side on desktop/tablet, stacked on phone —
  // both always visible, no toggle to click through first.
  flowsRow: { flexDirection: 'row', gap: 28, alignItems: 'flex-start', paddingBottom: 24 },
  flowsColumn: { flexDirection: 'column', gap: 40 },
  flowFadeWrap: { flex: 1, minWidth: 0 },
  flowCol: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#E1E8ED',
    shadowColor: '#0B1220', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 3,
  },

  howEyebrow: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.7, color: CANDIDATE_COLOR, marginBottom: 8 },
  howTitle: { fontSize: 22, fontWeight: '800', color: COMPANY_COLOR, letterSpacing: -0.4, marginBottom: 6, fontFamily: DISPLAY_FONT_FAMILY },
  howSubhead: { fontSize: 14, color: '#536471', fontWeight: '500', marginBottom: 22 },

  // Step tabs + the timer bar living under each one — the concrete "arrow
  // and a timer, I don't have to keep clicking" ask. The arrow between tabs
  // points at what's coming next; the fill bar under the active tab is the
  // timer itself, restarting from empty every time the step changes.
  stepTabsAuto: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  stepTabAuto: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#F5F8FC', borderWidth: 1, borderColor: '#E1E8ED', gap: 6, minWidth: 96 },
  stepTabAutoActive: { backgroundColor: COMPANY_COLOR, borderColor: COMPANY_COLOR },
  stepTabText: { fontSize: 12.5, fontWeight: '700', color: '#536471', textAlign: 'center' },
  stepTabTextActive: { color: '#FFFFFF' },
  timerTrack: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)', marginTop: 6, overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 2, backgroundColor: CANDIDATE_COLOR },

  stepContentAuto: { alignItems: 'flex-start' },
  stepIconWrap: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#DCEEFB', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  stepNumber: { fontSize: 11, fontWeight: '800', color: CANDIDATE_COLOR, letterSpacing: 0.4, marginBottom: 6 },
  stepTitle: { fontSize: 19, fontWeight: '800', color: COMPANY_COLOR, marginBottom: 8, letterSpacing: -0.2, fontFamily: DISPLAY_FONT_FAMILY },
  stepBody: { fontSize: 14, color: '#536471', lineHeight: 21, fontWeight: '500' },
  stepMockColAuto: { width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
});

const mockStyles = StyleSheet.create({
  frame: {
    width: '100%', maxWidth: 320, minHeight: 180, borderRadius: 24, padding: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F5F8FC', borderWidth: 1, borderColor: '#E1E8ED',
  },
  card: {
    width: '100%', maxWidth: 260, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16,
    shadowColor: '#0B1220', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 5,
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
