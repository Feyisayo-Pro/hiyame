import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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

// The landing screen — folds the old two-step welcome-carousel → register
// flow into one decisive screen (per the redesign brief: Viamatch's whole
// landing is one full-viewport screen, not a carousel then a separate list).
// register.tsx now just redirects here.
//
// That "one screen" rule is specifically about the HERO (the two-panel
// block above) staying a single no-scroll viewport on every device — a real
// bug was fixed here once already (mobile hero overflow). It was never a
// rule against the page ever scrolling: everything below the hero (How It
// Works, footer) is deliberate additional content, the same way a normal
// landing page has a hero fold and more underneath.
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

// "How it works" content for both personas — real steps matching what the
// product actually does (app/(company)/create-role.tsx's form, lib/
// matchingEngine.ts's scoring, app/(company)/shortlist.tsx's ranked list;
// candidate side reuses the same 3 steps as app/(auth)/about.tsx so the two
// pages never describe the flow differently).
interface HowItWorksStep {
  tab: string;
  icon: string;
  title: string;
  body: string;
}

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

export default function WelcomeScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const { width } = useWindowDimensions();
  const stacked = width < STACK_BREAKPOINT;

  // Deep-link from Pricing/About's persona tabs: /(auth)/welcome?mode=
  // hiring|candidate&focus=how lands here already on the right persona and
  // auto-scrolled to How It Works, instead of dumping the visitor back at
  // the plain top-of-page hero with no sense they landed anywhere specific.
  const params = useLocalSearchParams<{ mode?: string; focus?: string }>();

  // -1 = candidate panel focused, 0 = resting (both full color), 1 = company
  // focused. One shared value drives both panels' flex + color together, so
  // they always move in lockstep — one expanding is always the other's
  // recede, never independent.
  const focus = useRef(new Animated.Value(0)).current;
  const [pressed, setPressed] = useState<PanelKey | null>(null);

  const [mode, setMode] = useState<PersonaMode>(params.mode === 'candidate' ? 'candidate' : 'hiring');
  const [activeStep, setActiveStep] = useState(0);

  // Scrolling to the How It Works section on persona-switch is what makes
  // "click the pill → the section above changes" actually visible — the
  // pill sits fixed at the bottom of the viewport, often nowhere near the
  // section it controls, so without this the change happens off-screen and
  // looks like nothing happened at all.
  const scrollRef = useRef<ScrollView>(null);
  const howSectionY = useRef(0);
  const scrollToHow = () => {
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(0, howSectionY.current - 24), animated: true }));
  };

  // A brief colored glow around the section header on every switch — the
  // second half of making the change unmistakable even for a visitor who's
  // already scrolled to the section and doesn't need the scroll-to.
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
    scrollToHow();
    pulseHighlight();
  };
  const steps = mode === 'hiring' ? HIRING_STEPS : CANDIDATE_STEPS;

  // Sliding pill behind the step tabs (segmented-control style) instead of
  // each tab just swapping its own flat background — measured per-tab via
  // onLayout since the three labels differ in width per persona ("Post a
  // role" vs. "Verify"). Non-stacked layout only: stacked mode's tabs stack
  // in a column, where a horizontally-sliding pill doesn't make sense.
  const [tabLayouts, setTabLayouts] = useState<Record<number, { x: number; width: number }>>({});
  const pillX = useRef(new Animated.Value(0)).current;
  const pillWidth = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = tabLayouts[activeStep];
    if (!l) return;
    Animated.spring(pillX, { toValue: l.x, useNativeDriver: false, speed: 18, bounciness: 7 }).start();
    Animated.spring(pillWidth, { toValue: l.width, useNativeDriver: false, speed: 18, bounciness: 7 }).start();
  }, [activeStep, tabLayouts]);

  // Arriving via ?focus=how (from Pricing/About's persona tabs) scrolls
  // straight to the section as soon as its position is known. A ref
  // mutation (howSectionY.current) doesn't re-render anything, so this has
  // to fire from the section's own onLayout — the first moment a real y is
  // available — rather than a useEffect watching that ref.
  const didAutoScrollForFocus = useRef(false);
  const onHowSectionLayout = (y: number) => {
    howSectionY.current = y;
    if (params.focus === 'how' && !didAutoScrollForFocus.current) {
      didAutoScrollForFocus.current = true;
      scrollToHow();
      pulseHighlight();
    }
  };

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
      <ScrollView ref={scrollRef} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Nav ── */}
        <SwipeFadeContainer axis="y" offset={16} duration={420} delay={0}>
          <PublicNav stacked={stacked} />
        </SwipeFadeContainer>

        {/* Blob field spans headline → end of How It Works — the region
            that used to read as visually flat/"blank". Rendered first so it
            paints behind every sibling below it (default DOM stacking,
            no z-index needed). */}
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

        {/* ── How it works ── */}
        <View
          style={st.howSection}
          onLayout={(e) => onHowSectionLayout(e.nativeEvent.layout.y)}
        >
          {/* Glow ring that flashes on every persona switch — visible even
              to someone already scrolled here who doesn't need the
              scroll-to, so the section changing is unmistakable either way. */}
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
              // Deliberately NOT wrapped in a per-tab container View — the
              // sliding pill is positioned absolutely against `stepTabs`
              // directly, and RN's onLayout reports x/y relative to the
              // IMMEDIATE parent. A wrapper here would make every tab
              // measure x≈0 relative to its own wrapper instead of its real
              // offset within stepTabs, which is exactly the bug that had
              // the pill freeze at the wrong position once tab 3 (behind an
              // extra wrapper) became active. Fragment groups [tab, arrow]
              // without introducing that extra coordinate frame.
              <Fragment key={step.tab}>
                <Pressable
                  onPress={() => setActiveStep(i)}
                  onLayout={(e) => {
                    const { x, width } = e.nativeEvent.layout;
                    setTabLayouts((prev) => (prev[i]?.x === x && prev[i]?.width === width ? prev : { ...prev, [i]: { x, width } }));
                  }}
                  style={[
                    st.stepTab,
                    // Non-stacked: the active tab's own background is left
                    // OFF so the animated sliding pill underneath (which
                    // exactly matches its measured bounds) is what shows
                    // through — an opaque background here would just hide
                    // the pill completely. Stacked mode has no pill at all,
                    // so it keeps the instant white/dark swap.
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
// screenshots, but built from the exact same mock-card visual language as
// the hero panels above (same avatar/chip/badge treatment), so this doesn't
// introduce a second unrelated visual style partway down the page.
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
  // Extra clearance at the very end for the fixed PersonaSwitcher pill,
  // which would otherwise sit directly over the footer's last line.
  scrollContent: { flexGrow: 1, paddingBottom: 88 },

  // Wraps headline → end of How It Works so GradientBlobBackground's
  // absoluteFill covers exactly that region (not the nav, not the footer).
  blobZone: { position: 'relative' },

  headlineBlock: { alignItems: 'center', marginBottom: 28, paddingHorizontal: 12 },
  headlineBlockStacked: { marginBottom: 16 },
  headline: { fontSize: 34, lineHeight: 40, fontWeight: '800', color: COMPANY_COLOR, letterSpacing: -0.6, textAlign: 'center', maxWidth: 620, fontFamily: DISPLAY_FONT_FAMILY },
  headlineStacked: { fontSize: 24, lineHeight: 29 },
  subhead: { fontSize: 16, color: '#536471', marginTop: 10, fontWeight: '500' },

  // SwipeFadeContainer's own Animated.View needs flex:1 too, or the panels'
  // own flex:1 (which makes them fill the remaining single-viewport height)
  // has nothing to expand into and silently collapses to content size.
  panelsFadeWrap: { flex: 1 },
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
  panelHeadlineLight: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4, marginBottom: 10, fontFamily: DISPLAY_FONT_FAMILY },
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

  // ── How it works ──
  // position:relative so howHighlightRing (an absolute overlay) hugs
  // exactly this block; paddingBottom cut from 80 to 32 — combined with
  // PublicFooter's own marginTop:56 that was ~136px of pure dead air
  // between the step content and the footer, the single biggest
  // contributor to the section reading as "blank".
  howSection: { marginTop: 56, paddingBottom: 32, position: 'relative' },
  howHighlightRing: {
    position: 'absolute', top: -20, left: -20, right: -20, bottom: -20,
    borderRadius: 32, borderWidth: 2, borderColor: CANDIDATE_COLOR, backgroundColor: 'rgba(29,161,242,0.05)',
  },
  howEyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, color: CANDIDATE_COLOR, marginBottom: 10 },
  howTitle: { fontSize: 30, fontWeight: '800', color: COMPANY_COLOR, letterSpacing: -0.5, marginBottom: 8, fontFamily: DISPLAY_FONT_FAMILY },
  howSubhead: { fontSize: 15.5, color: '#536471', fontWeight: '500', maxWidth: 480, marginBottom: 32 },

  stepTabs: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32, flexWrap: 'wrap' },
  stepTabsStacked: { flexDirection: 'column', alignItems: 'flex-start' },
  // No background here anymore — see the onLayout-measured usage above for
  // why (the sliding stepTabPill needs to show through the active tab).
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
  // minHeight + the translucent frame around StepMockCard (mockStyles.frame,
  // below) is what fills what used to be a mostly-empty column — a small
  // 280px-wide card floating alone in a ~500px flex column read as broken,
  // not minimal.
  stepMockCol: { flex: 1, minWidth: 240, alignItems: 'center', justifyContent: 'center', minHeight: 220 },
});

const mockStyles = StyleSheet.create({
  // Translucent "glass" frame the actual mock card sits inside — without
  // this, a 280px card centered in a ~500px flex column at desktop widths
  // just floated in empty space with nothing explaining why. Frosted-glass
  // treatment (semi-transparent white + soft border) reads as a deliberate
  // stage for the card rather than another opaque box competing with it.
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
