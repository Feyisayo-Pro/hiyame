import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Themed';
import { useTheme, ThemePalette } from '@/lib/theme';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';

interface Step {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: 'sparkles-outline',
    title: 'Companies come to you',
    body: "You don't send applications on Hiyame. When a company wants to work with you, you receive an introduction — you choose whether to accept or decline it.",
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Get verified first',
    body: 'Only verified profiles are matched to roles. Finish the 4-step checklist on your Home screen: identity, video intro, skills assessment, and an employer review.',
  },
  {
    icon: 'home-outline',
    title: 'Home',
    body: 'Your verification progress and your latest introductions at a glance — plus a checklist of what still needs doing.',
  },
  {
    icon: 'briefcase-outline',
    title: 'Jobs',
    body: 'Every introduction lands here. The company stays anonymous — you only see the industry and size — until you accept. Then the full role and their contact details are revealed.',
  },
  {
    icon: 'people-outline',
    title: 'Connections & Profile',
    body: 'Accepted introductions live in Connections with the company’s contact details, so you can reach out directly. Keep your Profile current — skills, rate and availability all feed your match score.',
  },
];

export default function WelcomeTourScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const { candidateId } = useAuth();
  const { width } = useWindowDimensions();
  const [i, setI] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const last = i === STEPS.length - 1;
  const step = STEPS[i];

  const finish = async () => {
    setFinishing(true);
    if (candidateId) {
      await supabase.from('candidates').update({ tour_seen_at: new Date().toISOString() }).eq('id', candidateId);
    }
    router.replace('/(candidate)');
  };

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right', 'bottom']}>
      <View style={[st.card, { maxWidth: Math.min(width - 32, 460) }]}>
        <View style={st.top}>
          <View style={st.dots}>
            {STEPS.map((_, idx) => (
              <View key={idx} style={[st.dot, idx === i && st.dotActive]} />
            ))}
          </View>
          <Pressable onPress={finish} hitSlop={10} accessibilityRole="button" accessibilityLabel="Skip the tour">
            <Text style={st.skip}>Skip</Text>
          </Pressable>
        </View>

        <View style={st.body}>
          <View style={st.iconWrap}>
            <Ionicons name={step.icon} size={30} color={T.accent} />
          </View>
          <Text style={st.title}>{step.title}</Text>
          <Text style={st.text}>{step.body}</Text>
        </View>

        <View style={st.nav}>
          <Pressable
            onPress={() => setI((n) => Math.max(0, n - 1))}
            disabled={i === 0}
            style={[st.backBtn, i === 0 && { opacity: 0 }]}
            accessibilityRole="button"
            accessibilityLabel="Previous"
          >
            <Ionicons name="arrow-back" size={18} color={T.textSecondary} />
            <Text style={st.backText}>Back</Text>
          </Pressable>

          <Pressable
            onPress={() => (last ? finish() : setI((n) => n + 1))}
            disabled={finishing}
            style={st.nextBtn}
            accessibilityRole="button"
            accessibilityLabel={last ? 'Get started' : 'Next'}
          >
            <Text style={st.nextText}>{last ? 'Get started' : 'Next'}</Text>
            <Ionicons name="arrow-forward" size={18} color={T.textOnAccent} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: {
    width: '100%',
    backgroundColor: T.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    padding: 24,
    gap: 8,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: T.border },
  dotActive: { width: 22, backgroundColor: T.accent },
  skip: { fontSize: 14, fontWeight: '600', color: T.textSecondary },
  body: { alignItems: 'center', gap: 14, paddingVertical: 18, minHeight: 220, justifyContent: 'center' },
  iconWrap: { width: 60, height: 60, borderRadius: 18, backgroundColor: T.accentBg, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  title: { fontSize: 22, fontWeight: '800', color: T.textPrimary, textAlign: 'center', letterSpacing: -0.3 },
  text: { fontSize: 14.5, lineHeight: 22, color: T.textSecondary, textAlign: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 6 },
  backText: { fontSize: 14, fontWeight: '600', color: T.textSecondary },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.accent, paddingVertical: 13, paddingHorizontal: 22, borderRadius: 50,
  },
  nextText: { fontSize: 15, fontWeight: '700', color: T.textOnAccent },
});
