import { useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { useTheme, ThemePalette } from '@/lib/theme';
import ScreenFrame from '@/components/ScreenFrame';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';

type Persona = 'candidate' | 'company';

interface Faq { q: string; a: string }
interface FaqSection { title: string; icon: keyof typeof Ionicons.glyphMap; items: Faq[] }

const CANDIDATE_SECTIONS: FaqSection[] = [
  {
    title: 'Getting started',
    icon: 'rocket-outline',
    items: [
      { q: 'How does Hiyame work?', a: "You build a profile, complete verification, and companies come to you. When a company likes your profile for a role, they send an introduction — you see the industry and company size first, and the full company name and contact details once you accept. There's no browsing or applying to a feed of jobs." },
      { q: 'Why can\'t I see the company name right away?', a: 'Identities stay masked until both sides opt in. You accept or decline based on the role, tier and company profile alone; the company\'s name and contact only reveal once you accept — this keeps both sides honest and avoids you being contacted by companies you\'d rather not hear from.' },
      { q: 'What do the tiers (Corporate / Short-Term / Gig) mean?', a: 'They describe the kind of work a role is: Corporate is a full-time hire, Short-Term is contract work with a defined length, and Gig is short, task-based work. Each tier can have different verification requirements.' },
    ],
  },
  {
    title: 'Verification',
    icon: 'shield-checkmark-outline',
    items: [
      { q: 'Why do I need to verify my profile?', a: 'Unverified profiles are not included in matching — companies only ever see candidates who\'ve completed verification. It exists to make every introduction you receive a serious one.' },
      { q: 'What are the 4 verification components?', a: 'Identity Check (confirming you are who you say you are), Video Introduction, Skills Assessment, and Employer Review. Your Profile screen shows exactly which ones are done and which remain.' },
      { q: 'I finished a step but it still shows Pending', a: 'Some checks are reviewed before they\'re marked passed. If a step has been pending for more than a couple of days, contact support with your account email and the step in question.' },
    ],
  },
  {
    title: 'Introductions',
    icon: 'paper-plane-outline',
    items: [
      { q: 'How long do I have to respond to an introduction?', a: 'Each introduction shows a countdown ("Xh left to respond"). The window depends on the role\'s tier. If it lapses without a response, the introduction expires automatically and the company\'s shortlist seat frees up.' },
      { q: 'What happens when I accept?', a: 'The company\'s name, industry detail and hiring contact become visible to you immediately, and the company can see your full contact details. From there, next steps happen directly between you and the company by email.' },
      { q: 'Can I undo a decline?', a: 'Not currently — decline only when you\'re sure. If it was a mistake, contact support with the role name and we can look into reopening it.' },
    ],
  },
];

const COMPANY_SECTIONS: FaqSection[] = [
  {
    title: 'Getting started',
    icon: 'rocket-outline',
    items: [
      { q: 'How do I find candidates?', a: 'Post a role from "My Roles" → "Post a Role". Once posted, the matching engine scores every eligible, verified candidate against it and builds a ranked shortlist you can work through with Accept, Skip or Save.' },
      { q: 'Why is my new role\'s shortlist empty?', a: 'Matching runs automatically right after you post a role, but on a busy candidate pool it can take a short while to finish scoring. If a shortlist is still empty after several minutes, use the refresh button on the shortlist screen.' },
      { q: 'What does the score % on a candidate mean?', a: "It's the matching engine's fit score for that candidate against this specific role — weighing skills, experience, pay expectations, availability, location and reliability. It's a ranking signal, not a guarantee." },
    ],
  },
  {
    title: 'Introductions & contact',
    icon: 'paper-plane-outline',
    items: [
      { q: 'What happens when I Accept a candidate?', a: 'An introduction is created and the candidate is notified. They see your industry and company size, but not your company name yet — that reveals once they accept too, along with your hiring contact\'s details.' },
      { q: 'The candidate hasn\'t responded — what now?', a: 'Every introduction has a response window shown on the shortlist. If it lapses, it expires automatically and that seat on your shortlist frees up for another candidate.' },
    ],
  },
  {
    title: 'Team & billing',
    icon: 'people-outline',
    items: [
      { q: 'How do I add a teammate?', a: 'Go to Team Members and enter their email. This reserves a seat and records the invite, up to your plan\'s seat limit. There is no invite email sent yet — this is on our roadmap.' },
      { q: 'How do I change my plan?', a: 'Settings → Subscription & Billing, or Profile → Manage Subscription. Note: real payment processing isn\'t connected yet, so plan changes don\'t charge you anything at this stage.' },
      { q: 'What are Team Seats?', a: 'The number of people who can be part of your company account at once. It\'s capped by your plan tier — see the Team Seats bar on your Company Profile.' },
    ],
  },
];

function AccordionItem({ item, T }: { item: Faq; T: ThemePalette }) {
  const [open, setOpen] = useState(false);
  const rotate = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    Animated.parallel([
      Animated.timing(rotate, { toValue: next ? 1 : 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade, { toValue: next ? 1 : 0, duration: next ? 260 : 140, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  };

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: T.border }}>
      <Pressable
        onPress={toggle}
        style={({ pressed }) => [
          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
          pressed && { opacity: 0.7 },
        ]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: T.textPrimary }}>{item.q}</Text>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="chevron-down" size={18} color={T.textMuted} />
        </Animated.View>
      </Pressable>
      {open && (
        <Animated.View style={{ opacity: fade, paddingBottom: 16 }}>
          <Text style={{ fontSize: 13, color: T.textSecondary, lineHeight: 19 }}>{item.a}</Text>
        </Animated.View>
      )}
    </View>
  );
}

export default function HelpCenterScreen({ persona }: { persona: Persona }) {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const sections = persona === 'candidate' ? CANDIDATE_SECTIONS : COMPANY_SECTIONS;
  const contactEmail = 'strivoglobal@gmail.com';

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <ScreenFrame>
        <View style={st.header}>
          <Pressable style={st.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={20} color={T.textPrimary} />
          </Pressable>
          <View>
            <Text style={st.headerTitle}>Help Center</Text>
            <Text style={st.headerSub}>Answers to common questions</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
          <SwipeFadeContainer>
            {sections.map((section, si) => (
              <View key={section.title} style={st.section}>
                <View style={st.sectionHead}>
                  <View style={st.sectionIconWrap}>
                    <Ionicons name={section.icon} size={16} color={T.accent} />
                  </View>
                  <Text style={st.sectionTitle}>{section.title}</Text>
                </View>
                <View style={st.card}>
                  {section.items.map((item) => (
                    <AccordionItem key={item.q} item={item} T={T} />
                  ))}
                </View>
              </View>
            ))}

            <View style={st.contactCard}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={T.accent} />
              <Text style={st.contactTitle}>Still stuck?</Text>
              <Text style={st.contactSub}>Email us and we'll get back to you.</Text>
              <Text style={st.contactEmail}>{contactEmail}</Text>
            </View>
          </SwipeFadeContainer>
        </ScrollView>
      </ScreenFrame>
    </SafeAreaView>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.card, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: T.textPrimary },
  headerSub: { fontSize: 12, color: T.textSecondary, marginTop: 2 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  section: { marginBottom: 20 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: T.accentBg, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: T.textPrimary },
  card: { backgroundColor: T.card, borderRadius: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: T.border },
  contactCard: { alignItems: 'center', gap: 4, backgroundColor: T.accentBg, borderRadius: 16, padding: 22, marginTop: 4, borderWidth: 1, borderColor: T.accentBg20 },
  contactTitle: { fontSize: 15, fontWeight: '800', color: T.textPrimary, marginTop: 6 },
  contactSub: { fontSize: 12, color: T.textSecondary },
  contactEmail: { fontSize: 13, fontWeight: '700', color: T.accent, marginTop: 6 },
});
