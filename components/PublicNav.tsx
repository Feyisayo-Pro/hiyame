import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';

// Shared top nav for every logged-out marketing page (welcome, pricing,
// about) — pulled out of welcome.tsx once a second and third public page
// needed the exact same pill so all three don't drift out of sync.
const CANDIDATE_COLOR = '#1DA1F2';
const COMPANY_COLOR = '#0F1419';

interface Props {
  stacked: boolean;
  active?: 'pricing' | 'about';
}

export default function PublicNav({ stacked, active }: Props) {
  return (
    <View style={[st.navPill, stacked && st.navPillStacked]}>
      <Pressable style={st.brandRow} onPress={() => router.push('/(auth)/welcome')}>
        <View style={st.brandDot}>
          <AppIcon name="flash" size={16} color="#FFFFFF" />
        </View>
        <Text style={st.brandText}>Hiyame</Text>
      </Pressable>

      {!stacked && (
        <View style={st.navLinks}>
          <Pressable onPress={() => router.push('/(auth)/pricing')} style={st.navLink}>
            <Text style={[st.navLinkText, active === 'pricing' && st.navLinkTextActive]}>Pricing</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/(auth)/about')} style={st.navLink}>
            <Text style={[st.navLinkText, active === 'about' && st.navLinkTextActive]}>About</Text>
          </Pressable>
        </View>
      )}

      <View style={st.navActions}>
        <Pressable style={st.loginPill} onPress={() => router.push('/(auth)/login')}>
          <Text style={st.loginPillText}>Login</Text>
        </Pressable>
        {/* Candidates are Hiyame's larger, lower-friction audience by far
            (over a thousand vs. a couple dozen companies) — the sensible
            default for a generic "Sign up" with no persona context yet. */}
        <Pressable style={st.signUpPill} onPress={() => router.push('/(auth)/candidate-signup')}>
          <Text style={st.signUpPillText}>Sign up</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  navPill: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 999,
    paddingVertical: 8, paddingLeft: 14, paddingRight: 8,
    marginBottom: 28,
    shadowColor: '#0B1220', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  navPillStacked: { marginBottom: 16 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandDot: { width: 28, height: 28, borderRadius: 9, backgroundColor: CANDIDATE_COLOR, alignItems: 'center', justifyContent: 'center' },
  brandText: { fontSize: 16, fontWeight: '800', color: COMPANY_COLOR, letterSpacing: -0.3 },
  navLinks: { flexDirection: 'row', gap: 4, flex: 1, justifyContent: 'center' },
  navLink: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  navLinkText: { fontSize: 13, fontWeight: '600', color: '#536471' },
  navLinkTextActive: { color: COMPANY_COLOR },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' },
  loginPill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: '#E1E8ED' },
  loginPillText: { fontSize: 13, fontWeight: '700', color: COMPANY_COLOR },
  signUpPill: { backgroundColor: CANDIDATE_COLOR, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999 },
  signUpPillText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});
