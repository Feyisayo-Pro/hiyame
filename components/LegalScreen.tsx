import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/Themed';
import { useTheme, ThemePalette } from '@/lib/theme';
import ScreenFrame from '@/components/ScreenFrame';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';

const LAST_UPDATED = '11 September 2026';

// First draft, written to reflect exactly what this product does today
// (introductions, masked identities, verification, tiers, seat-based plans,
// no live payments yet). Not reviewed by a lawyer — treat as a starting point
// to have checked before it's relied on for real legal protection.

const TERMS_SECTIONS = [
  { title: '1. Acceptance', body: 'By creating an account on Hiyame, as a company or as a candidate, you agree to these Terms. If you\'re signing up on behalf of a company, you\'re confirming you have the authority to do so.' },
  { title: '2. What Hiyame is', body: 'Hiyame connects companies with candidates through scored "introductions" — it is not an employment agency, does not guarantee a hire or a placement, and is not a party to any employment or contract relationship that results from an introduction.' },
  { title: '3. Accounts', body: 'You\'re responsible for the accuracy of the information on your profile and for keeping your login credentials secure. One account per person; one company account per organisation, with additional teammates added as seats.' },
  { title: '4. Verification', body: 'Candidate verification (identity check, video introduction, skills assessment, employer review) reflects only that the listed checks were completed at the time shown — it is not a guarantee of a candidate\'s skills, conduct, or suitability for any role.' },
  { title: '5. Introductions', body: 'An introduction is a mutual opt-in: a company selects a candidate from a shortlist, and the candidate accepts or declines. Identities and contact details are masked until both sides accept. Each introduction has a response window; if it lapses without a response, it expires automatically.' },
  { title: '6. Subscriptions', body: 'Company accounts are on a plan tier (Pilot, Starter, Growth or Enterprise) that determines team seat limits and available features. Where real payment processing is enabled, charges, upgrades, downgrades and cancellations will be described at the point of purchase; no live payment processing is connected as of the date below.' },
  { title: '7. Acceptable use', body: 'You agree not to misuse the platform — no scraping candidate or company data, no creating accounts to impersonate someone else, no attempting to bypass the introduction/masking flow to contact a party who hasn\'t accepted, and no using the platform for anything unlawful.' },
  { title: '8. Termination', body: 'You may stop using Hiyame at any time by signing out and requesting account deletion (see the Privacy Policy). We may suspend or terminate an account that violates these Terms.' },
  { title: '9. Disclaimers', body: 'Hiyame is provided "as is". We do not warrant that matching scores, verification results, or any information supplied by another user is accurate or complete. To the fullest extent permitted by law, Hiyame is not liable for indirect or consequential losses arising from your use of the platform.' },
  { title: '10. Changes', body: 'We may update these Terms as the product changes. Material changes will be reflected by updating the date below.' },
  { title: '11. Governing law', body: 'These Terms are governed by the laws of the Federal Republic of Nigeria.' },
];

const PRIVACY_SECTIONS = [
  { title: '1. What we collect', body: 'Account details (name, email, password — stored hashed, never in plain text); candidate profile data (skills, experience, location, rate expectations, photo); company profile data (name, industry, size, description); verification results; and basic usage data needed to operate the product (e.g. when an introduction was sent or accepted).' },
  { title: '2. How we use it', body: 'To run the matching engine and build shortlists, to create and manage introductions, to reveal contact details once both sides accept, to send transactional email (introduction alerts, reminders), and to secure your account.' },
  { title: '3. Who can see what', body: 'Companies see full candidate details only for candidates on their own shortlists, and only masked company information reaches a candidate until they accept an introduction — at which point both sides see full contact details. A company never sees another company\'s data, and a candidate never sees another candidate\'s data.' },
  { title: '4. Where it\'s stored', body: 'Data is stored with Supabase (our database and authentication provider) and transactional email is sent via Resend. Both are processors acting on our instructions, not independent owners of your data. Access to raw data is restricted to what\'s needed to operate the product.' },
  { title: '5. Data we don\'t sell', body: 'We do not sell your personal data to third parties, and we do not use it for advertising.' },
  { title: '6. Retention & deletion', body: 'We keep your data for as long as your account is active. To request deletion of your account and associated data, contact us at the address below — we\'ll confirm once it\'s been removed, except where we\'re required to retain records by law.' },
  { title: '7. Your rights', body: 'You can request a copy of the data we hold on you, ask us to correct inaccurate information (or edit most of it yourself from Profile/Settings), or ask us to delete it, subject to the retention note above.' },
  { title: '8. Cookies & local storage', body: 'The web app uses local browser storage only for things like your theme preference and session token — not for tracking or advertising.' },
  { title: '9. Children', body: 'Hiyame is intended for people old enough to work in their jurisdiction and is not directed at children.' },
  { title: '10. Changes', body: 'We may update this policy as the product changes. Material changes will be reflected by updating the date below.' },
];

export default function LegalScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<'terms' | 'privacy'>(params.tab === 'privacy' ? 'privacy' : 'terms');

  const sections = tab === 'terms' ? TERMS_SECTIONS : PRIVACY_SECTIONS;

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <ScreenFrame>
        <View style={st.header}>
          <Pressable style={st.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={20} color={T.textPrimary} />
          </Pressable>
          <View>
            <Text style={st.headerTitle}>{tab === 'terms' ? 'Terms of Service' : 'Privacy Policy'}</Text>
            <Text style={st.headerSub}>Last updated {LAST_UPDATED}</Text>
          </View>
        </View>

        <View style={st.tabRow}>
          <Pressable style={[st.tabBtn, tab === 'terms' && st.tabBtnActive]} onPress={() => setTab('terms')}>
            <Text style={[st.tabText, tab === 'terms' && st.tabTextActive]}>Terms of Service</Text>
          </Pressable>
          <Pressable style={[st.tabBtn, tab === 'privacy' && st.tabBtnActive]} onPress={() => setTab('privacy')}>
            <Text style={[st.tabText, tab === 'privacy' && st.tabTextActive]}>Privacy Policy</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
          <SwipeFadeContainer triggerKey={tab} duration={220} offset={16}>
            {sections.map((s) => (
              <View key={s.title} style={st.block}>
                <Text style={st.blockTitle}>{s.title}</Text>
                <Text style={st.blockBody}>{s.body}</Text>
              </View>
            ))}
            <Text style={st.footNote}>
              Questions about either policy? Email strivoglobal@gmail.com.
            </Text>
          </SwipeFadeContainer>
        </ScrollView>
      </ScreenFrame>
    </SafeAreaView>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.card, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 19, fontWeight: '800', color: T.textPrimary },
  headerSub: { fontSize: 12, color: T.textSecondary, marginTop: 2 },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  tabBtnActive: { backgroundColor: T.accentBg, borderColor: T.accent },
  tabText: { fontSize: 12.5, fontWeight: '700', color: T.textSecondary },
  tabTextActive: { color: T.accent },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  block: { marginBottom: 18 },
  blockTitle: { fontSize: 14, fontWeight: '800', color: T.textPrimary, marginBottom: 6 },
  blockBody: { fontSize: 13, color: T.textSecondary, lineHeight: 20 },
  footNote: { fontSize: 12, color: T.textMuted, marginTop: 8, marginBottom: 20 },
});
