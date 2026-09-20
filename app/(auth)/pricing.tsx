import { useEffect, useMemo, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette, DISPLAY_FONT_FAMILY } from '@/lib/theme';
import ScreenFrame from '@/components/ScreenFrame';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import PersonaTabs from '@/components/PersonaTabs';
import GradientBlobBackground from '@/components/GradientBlobBackground';
import AnimatedPressable from '@/components/AnimatedPressable';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import { PLANS, PricingPlan } from '@/lib/subscriptionStore';
import { DURATION, EASE, SPRING } from '@/lib/motion';

// Public, logged-out pricing page — the highest-value, lowest-risk nav
// addition flagged from the Viamatch research pass: it surfaces the real
// tiers that already exist in lib/subscriptionStore.ts (and are already
// live in the in-app subscriptions screen) instead of inventing new copy.
// Same visual language as welcome.tsx (colors, nav, ScreenFrame) so the
// three public pages read as one site, not three.
//
// Structure below (banner, comparison section) is modeled on a live look at
// viamatch.ai/pricing — it's a long page with a highlighted free-tier
// banner and a cost-comparison section, not just 4 bare cards. The banner
// here is honest to Hiyame's own real pricing (Pilot/Starter really are
// ₦0/mo already, this isn't a marketing-only "free trial" framing), and the
// comparison is a feature comparison, not invented cost figures — viamatch's
// version cites specific £ agency/LinkedIn costs that aren't something we
// have real verified numbers for.
// Dark ground, matching welcome.tsx/how-it-works.tsx/about.tsx now — was
// the odd light page out while the other three went dark, an artifact of
// the redesign landing on welcome first rather than a deliberate choice.
const PAGE_BG = '#0B1220';
const COMPANY_COLOR = '#0F1419'; // dark text on the still-white/still-solid-blue button surfaces below
const CANDIDATE_COLOR = '#1DA1F2';
const TEXT_PRIMARY = '#F8FAFC';
const TEXT_MUTED = '#94A3B8';
const GLASS_BG = 'rgba(255,255,255,0.04)';
const GLASS_BORDER = 'rgba(148,163,184,0.14)';
const STACK_BREAKPOINT = 760;

export default function PricingScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const { width } = useWindowDimensions();
  const stacked = width < STACK_BREAKPOINT;

  return (
    <SafeAreaView style={st.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenFrame maxWidth={1120} style={st.frame}>
        <ScrollView contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
          <PublicNav stacked={stacked} active="pricing" />
          <PersonaTabs />

          <View style={st.blobZone}>
            <GradientBlobBackground dark />

            <SwipeFadeContainer axis="y" offset={16} duration={420} delay={0}>
              <View style={st.headlineBlock}>
                <Text style={st.headline}>Simple, transparent pricing</Text>
                <Text style={st.subhead}>Naira pricing, no hidden fees. Start free, upgrade when you're ready to scale.</Text>
              </View>
            </SwipeFadeContainer>

            <SwipeFadeContainer axis="y" offset={16} duration={420} delay={80}>
              <View style={[st.freeBanner, stacked && st.freeBannerStacked]}>
                <View style={st.freeBannerText}>
                  <Text style={st.freeBannerTitle}>Pilot & Starter combined: ₦0/mo</Text>
                  <Text style={st.freeBannerBody}>Try Hiyame before you spend anything. No card required, no trial countdown.</Text>
                </View>
                <AnimatedPressable
                  style={(state) => [st.freeBannerCta, state.hovered && st.freeBannerCtaHover]}
                  onPress={() => router.push('/(auth)/company-signup')}
                  scaleTo={0.96}
                >
                  <Text style={st.freeBannerCtaText}>Start free</Text>
                  <AppIcon name="arrow-forward" size={14} color={COMPANY_COLOR} />
                </AnimatedPressable>
              </View>
            </SwipeFadeContainer>

            <View style={[st.grid, stacked && st.gridStacked]}>
              {PLANS.map((plan, i) => (
                <SwipeFadeContainer key={plan.id} axis="y" offset={20} duration={420} delay={150 + i * 70} style={stacked ? undefined : st.gridItem}>
                  <PlanCard plan={plan} st={st} stacked={stacked} />
                </SwipeFadeContainer>
              ))}
            </View>

            <View style={st.footNote}>
              <AppIcon name="information-circle-outline" size={16} color={TEXT_MUTED} />
              <Text style={st.footNoteText}>
                All plans start on Pilot. Pick or change your plan from inside your company workspace once you're signed up.
              </Text>
            </View>
          </View>

          <ComparisonSection st={st} stacked={stacked} />

          <PublicFooter stacked={stacked} />
        </ScrollView>
      </ScreenFrame>
    </SafeAreaView>
  );
}

function PlanCard({ plan, st, stacked }: { plan: PricingPlan; st: ReturnType<typeof makeStyles>; stacked: boolean }) {
  // Subtle continuous glow pulse on the "MOST POPULAR" badge — decorative,
  // doesn't gate anything on itself (unlike a scroll-triggered reveal).
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!plan.highlight) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: EASE.pulse, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: EASE.pulse, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [plan.highlight]);
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  return (
    <AnimatedPressable
      style={(state) => [
        st.card, stacked && st.cardStacked, plan.highlight && st.cardHighlight,
        state.hovered && st.cardHover,
      ]}
      scaleTo={1}
    >
      {plan.highlight && (
        <Animated.View style={[st.popularBadge, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]}>
          <Text style={st.popularBadgeText}>MOST POPULAR</Text>
        </Animated.View>
      )}

      <Text style={st.planName}>{plan.name}</Text>
      <Text style={st.planSubtitle}>{plan.subtitle}</Text>

      <View style={st.priceRow}>
        <Text style={st.price}>{plan.price}</Text>
        <Text style={st.period}>{plan.period}</Text>
      </View>

      <View style={st.featuresList}>
        {plan.features.map((f, i) => (
          <FeatureRow key={f} label={f} index={i} st={st} />
        ))}
      </View>

      <AnimatedPressable
        style={(state) => [
          st.ctaBtn,
          plan.highlight && st.ctaBtnHighlight,
          state.hovered && (plan.highlight ? st.ctaBtnHighlightHover : st.ctaBtnHover),
        ]}
        onPress={() => router.push('/(auth)/company-signup')}
        scaleTo={0.96}
      >
        <Text style={[st.ctaBtnText, plan.highlight && st.ctaBtnTextHighlight]}>Get started</Text>
      </AnimatedPressable>
    </AnimatedPressable>
  );
}

// Bounce-in on mount: 1 -> 1.25 -> 1, staggered per row so the checklist
// reads as revealing itself rather than all popping in at once.
function FeatureRow({ label, index, st }: { label: string; index: number; st: ReturnType<typeof makeStyles> }) {
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 60),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...SPRING.bounceIn }),
    ]).start();
  }, []);
  return (
    <View style={st.featureRow}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <AppIcon name="checkmark-circle" size={16} color={CANDIDATE_COLOR} />
      </Animated.View>
      <Text style={st.featureText}>{label}</Text>
    </View>
  );
}

// Feature comparison, not a cost comparison — viamatch's own version cites
// specific £ figures for agencies/LinkedIn Recruiter that we have no real,
// verified numbers to back for the Nigerian market. This says the same
// "why us" thing honestly: what each option actually gives you.
const COMPARISON_ROWS: { label: string; jobBoard: boolean | string; agency: boolean | string; hiyame: boolean | string }[] = [
  { label: 'Candidates are pre-verified', jobBoard: false, agency: 'Sometimes', hiyame: true },
  { label: 'You review a ranked shortlist, not a résumé pile', jobBoard: false, agency: true, hiyame: true },
  { label: 'No placement fee (% of first-year salary)', jobBoard: true, agency: false, hiyame: true },
  { label: 'Priced in naira', jobBoard: true, agency: 'Sometimes', hiyame: true },
  { label: 'Free to start', jobBoard: true, agency: false, hiyame: true },
];

function ComparisonSection({ st, stacked }: { st: ReturnType<typeof makeStyles>; stacked: boolean }) {
  return (
    <SwipeFadeContainer axis="y" offset={20} duration={420} delay={0}>
      <View style={st.compSection}>
        <Text style={st.compTitle}>How it compares</Text>
        <View style={st.compTable}>
          <View style={[st.compRow, st.compHeaderRow]}>
            <View style={st.compLabelColSpacer} />
            <Text style={st.compHeaderCell}>Job boards</Text>
            <Text style={st.compHeaderCell}>Agencies</Text>
            <Text style={[st.compHeaderCell, st.compHeaderCellHiyame]}>Hiyame</Text>
          </View>
          {COMPARISON_ROWS.map((row, i) => (
            <SwipeFadeContainer key={row.label} axis="y" offset={10} duration={DURATION.stagger} delay={80 + i * 60}>
              <View style={[st.compRow, i % 2 === 1 && st.compRowAlt]}>
                <Text style={st.compLabelText}>{row.label}</Text>
                <CompCell value={row.jobBoard} st={st} />
                <CompCell value={row.agency} st={st} />
                <CompCell value={row.hiyame} st={st} highlight />
              </View>
            </SwipeFadeContainer>
          ))}
        </View>
      </View>
    </SwipeFadeContainer>
  );
}

function CompCell({ value, st, highlight }: { value: boolean | string; st: ReturnType<typeof makeStyles>; highlight?: boolean }) {
  if (typeof value === 'string') {
    return <Text style={[st.compCellText, highlight && st.compCellTextHiyame]}>{value}</Text>;
  }
  return (
    <View style={st.compCellIcon}>
      <AppIcon
        name={value ? 'checkmark-circle' : 'close-circle-outline'}
        size={18}
        color={value ? (highlight ? CANDIDATE_COLOR : '#17A75B') : 'rgba(148,163,184,0.4)'}
      />
    </View>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },
  frame: { paddingHorizontal: 20, paddingTop: 16 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },

  blobZone: { position: 'relative' },

  headlineBlock: { alignItems: 'center', marginBottom: 24, paddingHorizontal: 12 },
  headline: { fontSize: 34, lineHeight: 40, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.6, textAlign: 'center', maxWidth: 620, fontFamily: DISPLAY_FONT_FAMILY },
  subhead: { fontSize: 16, color: TEXT_MUTED, marginTop: 10, fontWeight: '500', textAlign: 'center', maxWidth: 480 },

  // Blue, not near-black — a dark banner would nearly disappear against
  // this page's own dark ground (the panel-merging bug already fixed once
  // on welcome.tsx), and blue is this page's one real "pop" color anyway.
  freeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 16, justifyContent: 'space-between',
    backgroundColor: CANDIDATE_COLOR, borderRadius: 20, padding: 20, marginBottom: 28,
  },
  freeBannerStacked: { flexDirection: 'column', alignItems: 'flex-start' },
  freeBannerText: { flex: 1 },
  freeBannerTitle: { fontSize: 15.5, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  freeBannerBody: { fontSize: 13, color: 'rgba(255,255,255,0.78)', fontWeight: '500', lineHeight: 18 },
  freeBannerCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999,
  },
  freeBannerCtaHover: { backgroundColor: '#F1F5F9' },
  freeBannerCtaText: { fontSize: 13.5, fontWeight: '700', color: COMPANY_COLOR },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
  gridStacked: { flexDirection: 'column' },
  gridItem: { width: 250 },

  card: {
    width: 250, backgroundColor: GLASS_BG, borderRadius: 24, padding: 24,
    borderWidth: 1.5, borderColor: GLASS_BORDER,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0, shadowRadius: 20,
  },
  cardStacked: { width: '100%' },
  cardHighlight: { borderColor: CANDIDATE_COLOR, borderWidth: 2 },
  cardHover: { shadowOpacity: 0.3, transform: [{ translateY: -6 }] },
  popularBadge: {
    position: 'absolute', top: -12, alignSelf: 'center',
    backgroundColor: CANDIDATE_COLOR, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5,
  },
  popularBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.4 },

  planName: { fontSize: 18, fontWeight: '800', color: TEXT_PRIMARY, marginTop: 6 },
  planSubtitle: { fontSize: 13, color: TEXT_MUTED, fontWeight: '600', marginTop: 2 },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 18, marginBottom: 20 },
  price: { fontSize: 28, fontWeight: '800', color: TEXT_PRIMARY },
  period: { fontSize: 14, color: TEXT_MUTED, fontWeight: '600' },

  featuresList: { gap: 12, marginBottom: 24, minHeight: 128 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featureText: { flex: 1, fontSize: 13, color: TEXT_MUTED, lineHeight: 19, fontWeight: '500' },

  ctaBtn: {
    borderRadius: 999, paddingVertical: 13, alignItems: 'center',
    backgroundColor: GLASS_BG, borderWidth: 1, borderColor: GLASS_BORDER,
  },
  ctaBtnHover: { backgroundColor: 'rgba(255,255,255,0.08)' },
  ctaBtnHighlight: { backgroundColor: CANDIDATE_COLOR, borderColor: CANDIDATE_COLOR },
  ctaBtnHighlightHover: { backgroundColor: '#0F8FDE' },
  ctaBtnText: { fontSize: 14, fontWeight: '700', color: TEXT_PRIMARY },
  ctaBtnTextHighlight: { color: '#FFFFFF' },

  footNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, alignSelf: 'center',
    maxWidth: 480, marginTop: 32, paddingHorizontal: 20,
  },
  footNoteText: { flex: 1, fontSize: 12.5, color: TEXT_MUTED, lineHeight: 18, fontWeight: '500' },

  compSection: { marginTop: 56 },
  compTitle: { fontSize: 22, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 18, textAlign: 'center', fontFamily: DISPLAY_FONT_FAMILY },
  compTable: { backgroundColor: GLASS_BG, borderRadius: 20, borderWidth: 1, borderColor: GLASS_BORDER, overflow: 'hidden' },
  compRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  compHeaderRow: { backgroundColor: 'rgba(255,255,255,0.03)', borderBottomWidth: 1, borderBottomColor: GLASS_BORDER },
  compRowAlt: { backgroundColor: 'rgba(255,255,255,0.02)' },
  compLabelColSpacer: { flex: 2, paddingRight: 8 },
  compLabelText: { flex: 2, fontSize: 13, fontWeight: '600', color: TEXT_PRIMARY, paddingRight: 8 },
  compHeaderCell: { flex: 1, textAlign: 'center', fontSize: 11.5, fontWeight: '800', color: TEXT_MUTED, letterSpacing: 0.3 },
  compHeaderCellHiyame: { color: CANDIDATE_COLOR },
  compCellText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: TEXT_MUTED },
  compCellTextHiyame: { color: CANDIDATE_COLOR },
  compCellIcon: { flex: 1, alignItems: 'center' },
});
