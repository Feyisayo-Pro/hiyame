import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import AnimatedPressable from '@/components/AnimatedPressable';

// Shared footer for every logged-out page. Deliberately does NOT include a
// physical address, phone number, or social links — viamatch.ai's footer has
// all three, but none of that exists for Hiyame anywhere in this codebase,
// and a placeholder address/phone would read as real contact info that
// doesn't work. Only real, working links here: in-app routes.
const COMPANY_COLOR = '#0F1419';
const CANDIDATE_COLOR = '#1DA1F2';

interface LinkItem { label: string; onPress: () => void }

export default function PublicFooter({ stacked }: { stacked: boolean }) {
  const columns: { title: string; links: LinkItem[] }[] = [
    {
      title: 'Product',
      links: [
        { label: 'For Companies', onPress: () => router.push('/(auth)/company-signup') },
        { label: 'For Candidates', onPress: () => router.push('/(auth)/candidate-signup') },
        { label: 'Pricing', onPress: () => router.push('/(auth)/pricing') },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', onPress: () => router.push('/(auth)/about') },
        { label: 'Login', onPress: () => router.push('/(auth)/login') },
      ],
    },
  ];

  return (
    <View style={[st.wrap, stacked && st.wrapStacked]}>
      <View style={st.top}>
        <View style={st.brandCol}>
          <View style={st.brandRow}>
            <View style={st.brandDot}>
              <AppIcon name="flash" size={14} color="#FFFFFF" />
            </View>
            <Text style={st.brandText}>Hiyame</Text>
          </View>
          <Text style={st.tagline}>Replaces job boards and agencies.</Text>
        </View>

        <View style={[st.columns, stacked && st.columnsStacked]}>
          {columns.map((col) => (
            <View key={col.title} style={st.col}>
              <Text style={st.colTitle}>{col.title}</Text>
              {col.links.map((l) => (
                <AnimatedPressable key={l.label} style={st.link} onPress={l.onPress} scaleTo={0.97}>
                  {(state) => (
                    <Text style={[st.linkText, state.hovered && st.linkTextHover]}>{l.label}</Text>
                  )}
                </AnimatedPressable>
              ))}
            </View>
          ))}
        </View>
      </View>

      <View style={st.bottom}>
        <Text style={st.copyright}>© {new Date().getFullYear()} Hiyame</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { marginTop: 56, paddingTop: 32, borderTopWidth: 1, borderTopColor: '#E1E8ED' },
  wrapStacked: { marginTop: 40 },
  top: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32 },
  brandCol: { maxWidth: 260, gap: 8 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandDot: { width: 24, height: 24, borderRadius: 8, backgroundColor: CANDIDATE_COLOR, alignItems: 'center', justifyContent: 'center' },
  brandText: { fontSize: 15, fontWeight: '800', color: COMPANY_COLOR, letterSpacing: -0.3 },
  tagline: { fontSize: 13, color: '#8A97A4', fontWeight: '500' },

  columns: { flexDirection: 'row', gap: 48 },
  columnsStacked: { gap: 32 },
  col: { gap: 10, minWidth: 120 },
  colTitle: { fontSize: 11.5, fontWeight: '800', color: '#8A97A4', letterSpacing: 0.5, marginBottom: 2 },
  link: { alignSelf: 'flex-start' },
  linkText: { fontSize: 13.5, fontWeight: '600', color: '#536471' },
  linkTextHover: { color: COMPANY_COLOR },

  bottom: { marginTop: 32, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#E1E8ED' },
  copyright: { fontSize: 12, color: '#8A97A4', fontWeight: '500' },
});
