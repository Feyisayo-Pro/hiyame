import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import AnimatedPressable from '@/components/AnimatedPressable';

// "Stacked circular" layout (centered logo badge → nav row → copyright),
// adapted from a shadcn/ui reference component into this app's actual
// stack — that component was React DOM + Tailwind + Radix (raw <footer>/
// <nav>/<a>/<form>/<input> tags, lucide-react icons), none of which run in
// React Native. Rebuilt the same visual shape with AppIcon/AnimatedPressable
// instead.
//
// Deliberately omits two things the reference had: a social-icon row and a
// newsletter signup form. Neither exists for real here — no verified Hiyame
// social accounts, no mailing-list backend to actually subscribe anyone to
// — and a footer icon linking nowhere or a "Subscribe" button that silently
// does nothing is worse than not having them. Same rule this file already
// held before this pass (no fabricated address/phone/socials).
const COMPANY_COLOR = '#0F1419';
const CANDIDATE_COLOR = '#1DA1F2';

interface LinkItem { label: string; onPress: () => void }

const LINKS: LinkItem[] = [
  { label: 'For Companies', onPress: () => router.push('/(auth)/company-signup') },
  { label: 'For Candidates', onPress: () => router.push('/(auth)/candidate-signup') },
  { label: 'Pricing', onPress: () => router.push('/(auth)/pricing') },
  { label: 'About', onPress: () => router.push('/(auth)/about') },
  { label: 'Login', onPress: () => router.push('/(auth)/login') },
];

export default function PublicFooter({ stacked }: { stacked: boolean }) {
  return (
    <View style={[st.wrap, stacked && st.wrapStacked]}>
      <AnimatedPressable style={st.logoBadge} onPress={() => router.push('/(auth)/welcome')} scaleTo={0.94}>
        <AppIcon name="flash" size={24} color={CANDIDATE_COLOR} />
      </AnimatedPressable>

      <View style={st.nav}>
        {LINKS.map((l) => (
          <AnimatedPressable key={l.label} onPress={l.onPress} scaleTo={0.95}>
            {(state) => (
              <Text style={[st.navText, state.hovered && st.navTextHover]}>{l.label}</Text>
            )}
          </AnimatedPressable>
        ))}
      </View>

      <Text style={st.copyright}>© {new Date().getFullYear()} Hiyame. All rights reserved.</Text>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    marginTop: 56, paddingTop: 40, paddingBottom: 8,
    borderTopWidth: 1, borderTopColor: '#E1E8ED',
    alignItems: 'center',
  },
  wrapStacked: { marginTop: 40, paddingTop: 32 },

  logoBadge: {
    width: 64, height: 64, borderRadius: 32, marginBottom: 28,
    backgroundColor: 'rgba(29,161,242,0.1)', alignItems: 'center', justifyContent: 'center',
  },

  nav: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: 24, marginBottom: 28, paddingHorizontal: 12,
  },
  navText: { fontSize: 14, fontWeight: '600', color: '#536471' },
  navTextHover: { color: CANDIDATE_COLOR },

  copyright: { fontSize: 13, color: '#8A97A4', fontWeight: '500', marginBottom: 8 },
});
