import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette } from '@/lib/theme';
import ScreenFrame from '@/components/ScreenFrame';
import PublicNav from '@/components/PublicNav';
import { PLANS, PricingPlan } from '@/lib/subscriptionStore';

// Public, logged-out pricing page — the highest-value, lowest-risk nav
// addition flagged from the Viamatch research pass: it surfaces the real
// tiers that already exist in lib/subscriptionStore.ts (and are already
// live in the in-app subscriptions screen) instead of inventing new copy.
// Same visual language as welcome.tsx (colors, nav, ScreenFrame) so the
// three public pages read as one site, not three.
const PAGE_BG = '#F5F8FC';
const COMPANY_COLOR = '#0F1419';
const CANDIDATE_COLOR = '#1DA1F2';
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

          <View style={st.headlineBlock}>
            <Text style={st.headline}>Simple, transparent pricing</Text>
            <Text style={st.subhead}>Naira pricing, no hidden fees. Start free, upgrade when you're ready to scale.</Text>
          </View>

          <View style={[st.grid, stacked && st.gridStacked]}>
            {PLANS.map((plan) => (
              <PlanCard key={plan.id} plan={plan} T={T} st={st} stacked={stacked} />
            ))}
          </View>

          <View style={st.footNote}>
            <AppIcon name="information-circle-outline" size={16} color="#8A97A4" />
            <Text style={st.footNoteText}>
              All plans start on Pilot — pick or change your plan from inside your company workspace once you're signed up.
            </Text>
          </View>
        </ScrollView>
      </ScreenFrame>
    </SafeAreaView>
  );
}

function PlanCard({ plan, T, st, stacked }: { plan: PricingPlan; T: ThemePalette; st: ReturnType<typeof makeStyles>; stacked: boolean }) {
  return (
    <View style={[st.card, stacked && st.cardStacked, plan.highlight && st.cardHighlight]}>
      {plan.highlight && (
        <View style={st.popularBadge}>
          <Text style={st.popularBadgeText}>MOST POPULAR</Text>
        </View>
      )}

      <Text style={st.planName}>{plan.name}</Text>
      <Text style={st.planSubtitle}>{plan.subtitle}</Text>

      <View style={st.priceRow}>
        <Text style={st.price}>{plan.price}</Text>
        <Text style={st.period}>{plan.period}</Text>
      </View>

      <View style={st.featuresList}>
        {plan.features.map((f) => (
          <View key={f} style={st.featureRow}>
            <AppIcon name="checkmark-circle" size={16} color={CANDIDATE_COLOR} />
            <Text style={st.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [st.ctaBtn, plan.highlight && st.ctaBtnHighlight, pressed && { opacity: 0.85 }]}
        onPress={() => router.push('/(auth)/company-signup')}
      >
        <Text style={[st.ctaBtnText, plan.highlight && st.ctaBtnTextHighlight]}>Get started</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },
  frame: { paddingHorizontal: 20, paddingTop: 16 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },

  headlineBlock: { alignItems: 'center', marginBottom: 32, paddingHorizontal: 12 },
  headline: { fontSize: 34, lineHeight: 40, fontWeight: '800', color: COMPANY_COLOR, letterSpacing: -0.6, textAlign: 'center', maxWidth: 620 },
  subhead: { fontSize: 16, color: '#536471', marginTop: 10, fontWeight: '500', textAlign: 'center', maxWidth: 480 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
  gridStacked: { flexDirection: 'column' },

  card: {
    width: 250, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24,
    borderWidth: 1.5, borderColor: '#E1E8ED',
  },
  cardStacked: { width: '100%' },
  cardHighlight: { borderColor: CANDIDATE_COLOR, borderWidth: 2 },
  popularBadge: {
    position: 'absolute', top: -12, alignSelf: 'center',
    backgroundColor: CANDIDATE_COLOR, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5,
  },
  popularBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.4 },

  planName: { fontSize: 18, fontWeight: '800', color: COMPANY_COLOR, marginTop: 6 },
  planSubtitle: { fontSize: 13, color: '#8A97A4', fontWeight: '600', marginTop: 2 },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 18, marginBottom: 20 },
  price: { fontSize: 28, fontWeight: '800', color: COMPANY_COLOR },
  period: { fontSize: 14, color: '#8A97A4', fontWeight: '600' },

  featuresList: { gap: 12, marginBottom: 24, minHeight: 128 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featureText: { flex: 1, fontSize: 13, color: '#3C4750', lineHeight: 19, fontWeight: '500' },

  ctaBtn: {
    borderRadius: 999, paddingVertical: 13, alignItems: 'center',
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E1E8ED',
  },
  ctaBtnHighlight: { backgroundColor: CANDIDATE_COLOR, borderColor: CANDIDATE_COLOR },
  ctaBtnText: { fontSize: 14, fontWeight: '700', color: COMPANY_COLOR },
  ctaBtnTextHighlight: { color: '#FFFFFF' },

  footNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, alignSelf: 'center',
    maxWidth: 480, marginTop: 32, paddingHorizontal: 20,
  },
  footNoteText: { flex: 1, fontSize: 12.5, color: '#8A97A4', lineHeight: 18, fontWeight: '500' },
});
