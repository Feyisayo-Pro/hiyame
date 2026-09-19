import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import AnimatedPressable from '@/components/AnimatedPressable';
import AnimatedCounter from '@/components/AnimatedCounter';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette, DISPLAY_FONT_FAMILY } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import ScreenFrame from '@/components/ScreenFrame';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import PersonaTabs from '@/components/PersonaTabs';
import GradientBlobBackground from '@/components/GradientBlobBackground';

// Public "About" page. Deliberately does NOT include named team bios or
// photos — there's no real founder/team content anywhere in this codebase
// to draw from, and this session's standing rule is to never invent one
// (a fabricated name, headshot, or quote is worse than no team section at
// all). The stats below are the one part of "bios and stats" that's fully
// real: pulled live from the database, not hardcoded, so they stay honest
// as the network grows instead of going stale the day after launch.
//
// Dark ground, matching welcome.tsx/how-it-works.tsx now — this page used
// to be the odd one out (light while the hero was dark), not a deliberate
// choice, just an artifact of the redesign landing on welcome first.
const PAGE_BG = '#0B1220';
const CANDIDATE_COLOR = '#1DA1F2';
const TEXT_PRIMARY = '#F8FAFC';
const TEXT_MUTED = '#94A3B8';
const GLASS_BG = 'rgba(255,255,255,0.04)';
const GLASS_BORDER = 'rgba(148,163,184,0.14)';
const STACK_BREAKPOINT = 760;

interface Stats {
  candidates: number;
  companies: number;
  roles: number;
}

export default function AboutScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const { width } = useWindowDimensions();
  const stacked = width < STACK_BREAKPOINT;
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    // RLS correctly hides real candidates/companies/roles rows from
    // unauthenticated visitors, so a direct anon count would silently come
    // back as 0 (not an error) — this RPC is a SECURITY DEFINER function
    // that returns only the 3 aggregate counts, never real row data.
    supabase.rpc('get_public_landing_stats').then(({ data, error }) => {
      if (!alive || error || !data?.[0]) return;
      const row = data[0];
      setStats({
        candidates: Number(row.candidates_count),
        companies: Number(row.companies_count),
        roles: Number(row.roles_count),
      });
    });
    return () => { alive = false; };
  }, []);

  return (
    <SafeAreaView style={st.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenFrame maxWidth={1120} style={st.frame}>
        <ScrollView contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
          <PublicNav stacked={stacked} active="about" />
          <PersonaTabs />

          <View style={st.blobZone}>
            <GradientBlobBackground dark />

            <SwipeFadeContainer axis="y" offset={16} duration={420} delay={0}>
              <View style={st.headlineBlock}>
                <Text style={st.eyebrow}>ABOUT HIYAME</Text>
                <Text style={st.headline}>Job boards make you apply and hope.{'\n'}We make you verified and found.</Text>
                <Text style={st.subhead}>
                  Hiyame replaces job boards and recruitment agencies with a verified match between African
                  professionals and the companies hiring them, no résumé pile, no cold applications.
                </Text>
              </View>
            </SwipeFadeContainer>

            {/* Real, live counts — not hardcoded copy. Renders nothing until
                the numbers load rather than flashing a wrong placeholder,
                then counts up once they arrive (AnimatedCounter). */}
            {stats && (
              <SwipeFadeContainer axis="y" offset={18} duration={420} delay={100}>
                <View style={[st.statsRow, stacked && st.statsRowStacked]}>
                  <StatTile value={Math.floor(stats.candidates / 100) * 100} suffix="+" label="Professionals in the network" />
                  <StatTile value={stats.companies} label="Companies hiring on Hiyame" />
                  <StatTile value={stats.roles} label="Roles posted to date" />
                </View>
              </SwipeFadeContainer>
            )}
          </View>

          <View style={st.section}>
            <Text style={st.sectionTitle}>How it works</Text>
            <View style={[st.stepsRow, stacked && st.stepsColumn]}>
              {STEPS.map((step, i) => (
                <SwipeFadeContainer key={step.title} axis="y" offset={18} duration={420} delay={i * 90} style={stacked ? undefined : st.stepFlex}>
                  <StepCard {...step} />
                </SwipeFadeContainer>
              ))}
            </View>
          </View>

          <SwipeFadeContainer axis="y" offset={18} duration={420} delay={0}>
            <View style={st.section}>
              <Text style={st.sectionTitle}>Built for Africa's job market</Text>
              <Text style={st.bodyText}>
                Hiring across African markets runs on referrals and trust because job boards weren't built for how
                this market actually verifies people. Hiyame verifies candidates properly, once, and prices in
                naira, so companies and professionals aren't translating a foreign platform's assumptions onto a
                local hire.
              </Text>
            </View>
          </SwipeFadeContainer>

          <PublicFooter stacked={stacked} />
        </ScrollView>
      </ScreenFrame>
    </SafeAreaView>
  );
}

const STEPS = [
  {
    icon: 'shield-checkmark-outline',
    title: 'Verify once',
    body: 'Candidates go through identity, video introduction, skills assessment, and employer reference checks, once, not for every application.',
  },
  {
    icon: 'compass-outline',
    title: 'Get matched',
    body: "A scoring engine ranks verified candidates against each open role's real requirements: skill fit, experience, rate, and availability.",
  },
  {
    icon: 'paper-plane-outline',
    title: 'Get introduced',
    body: 'Companies receive a ranked shortlist and send a real introduction, no job board, no sifting through hundreds of résumés.',
  },
] as const;

function StatTile({ value, suffix, label }: { value: number; suffix?: string; label: string }) {
  return (
    <View style={tileStyles.tile}>
      <AnimatedCounter value={value} suffix={suffix} style={tileStyles.value} />
      <Text style={tileStyles.label}>{label}</Text>
    </View>
  );
}

function StepCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  // Not a link — no onPress — but still wrapped in AnimatedPressable so it
  // gets the same hover-lift feel as everything else on the page, matching
  // how viamatch treats even non-interactive cards on hover.
  return (
    <AnimatedPressable style={(state) => [stepStyles.card, state.hovered && stepStyles.cardHover]} scaleTo={1}>
      <View style={stepStyles.iconWrap}>
        <AppIcon name={icon} size={20} color={CANDIDATE_COLOR} />
      </View>
      <Text style={stepStyles.title}>{title}</Text>
      <Text style={stepStyles.body}>{body}</Text>
    </AnimatedPressable>
  );
}

const tileStyles = StyleSheet.create({
  tile: {
    flex: 1, backgroundColor: GLASS_BG, borderRadius: 20, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: GLASS_BORDER,
  },
  value: { fontSize: 30, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.5, fontFamily: DISPLAY_FONT_FAMILY },
  label: { fontSize: 12.5, color: TEXT_MUTED, fontWeight: '600', marginTop: 6, textAlign: 'center' },
});

const stepStyles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: GLASS_BG, borderRadius: 20, padding: 22,
    borderWidth: 1, borderColor: GLASS_BORDER,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0, shadowRadius: 18,
  },
  cardHover: { borderColor: 'rgba(148,163,184,0.28)', shadowOpacity: 0.24 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(29,161,242,0.14)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  title: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 8 },
  body: { fontSize: 13.5, color: TEXT_MUTED, lineHeight: 20, fontWeight: '500' },
});

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },
  frame: { paddingHorizontal: 20, paddingTop: 16 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },

  blobZone: { position: 'relative' },

  headlineBlock: { alignItems: 'center', marginBottom: 32, paddingHorizontal: 12 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, color: CANDIDATE_COLOR, marginBottom: 12 },
  headline: { fontSize: 30, lineHeight: 37, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.5, textAlign: 'center', maxWidth: 640, fontFamily: DISPLAY_FONT_FAMILY },
  subhead: { fontSize: 15.5, color: TEXT_MUTED, marginTop: 14, fontWeight: '500', textAlign: 'center', maxWidth: 560, lineHeight: 23 },

  statsRow: { flexDirection: 'row', gap: 14, marginBottom: 40 },
  statsRowStacked: { flexDirection: 'column' },

  section: { marginBottom: 40 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 18, letterSpacing: -0.3, fontFamily: DISPLAY_FONT_FAMILY },
  bodyText: { fontSize: 15, color: TEXT_MUTED, lineHeight: 24, fontWeight: '500', maxWidth: 720 },

  stepsRow: { flexDirection: 'row', gap: 14 },
  stepsColumn: { flexDirection: 'column' },
  stepFlex: { flex: 1 },
});
