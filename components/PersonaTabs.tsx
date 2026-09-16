import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import AnimatedPressable from '@/components/AnimatedPressable';

// "Company / Candidate" tabs at the top of Pricing and About — both were
// persona-agnostic pages with no link into the home page's persona-specific
// How It Works content. Tapping either takes the visitor straight to that
// section, already on the right persona and auto-scrolled there (see
// app/(auth)/welcome.tsx's ?mode=&focus=how handling), instead of leaving
// "how does this actually work for me" as a dead end on these two pages.
const COMPANY_COLOR = '#0F1419';
const CANDIDATE_COLOR = '#1DA1F2';

export default function PersonaTabs() {
  const go = (mode: 'hiring' | 'candidate') => {
    router.push({ pathname: '/(auth)/welcome', params: { mode, focus: 'how' } });
  };

  return (
    <View style={st.wrap}>
      <Text style={st.label}>How it works for</Text>
      <View style={st.row}>
        <AnimatedPressable style={(state) => [st.tab, state.hovered && st.tabHover]} onPress={() => go('hiring')} scaleTo={0.97}>
          <AppIcon name="business-outline" size={14} color={COMPANY_COLOR} />
          <Text style={st.tabText}>Company</Text>
          <AppIcon name="arrow-forward" size={12} color="#8A97A4" />
        </AnimatedPressable>
        <AnimatedPressable style={(state) => [st.tab, state.hovered && st.tabHover]} onPress={() => go('candidate')} scaleTo={0.97}>
          <AppIcon name="person-outline" size={14} color={COMPANY_COLOR} />
          <Text style={st.tabText}>Candidate</Text>
          <AppIcon name="arrow-forward" size={12} color="#8A97A4" />
        </AnimatedPressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: 28 },
  label: { fontSize: 12, fontWeight: '700', color: '#8A97A4', letterSpacing: 0.3, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E8ED',
  },
  tabHover: { borderColor: CANDIDATE_COLOR, backgroundColor: '#F0F8FE' },
  tabText: { fontSize: 13, fontWeight: '700', color: COMPANY_COLOR },
});
