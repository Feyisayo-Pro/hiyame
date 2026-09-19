import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import AnimatedPressable from '@/components/AnimatedPressable';

// Real multi-column footer (was one centered logo + a single flat row of 5
// links, no hierarchy — real feedback: "the footer can be better"). Grouped
// into the columns a footer actually needs: what the product is, what it
// does, and how to get into it — same real routes as before, just organized
// instead of a single undifferentiated row.
//
// Still deliberately omits a social-icon row and a newsletter form, same as
// before this pass: no verified Hiyame social accounts and no mailing-list
// backend exist, so an icon linking nowhere or a "Subscribe" button that
// silently does nothing would be worse than not having them — this file's
// standing "no fabricated content" rule, unchanged.
const COMPANY_COLOR = '#0F1419';
const CANDIDATE_COLOR = '#1DA1F2';

interface LinkItem { label: string; onPress: () => void }

const PRODUCT_LINKS: LinkItem[] = [
  { label: 'How it works', onPress: () => router.push('/(auth)/how-it-works') },
  { label: 'Pricing', onPress: () => router.push('/(auth)/pricing') },
];
const COMPANY_LINKS: LinkItem[] = [
  { label: 'About', onPress: () => router.push('/(auth)/about') },
];
const START_LINKS: LinkItem[] = [
  { label: 'For companies', onPress: () => router.push('/(auth)/company-signup') },
  { label: 'For candidates', onPress: () => router.push('/(auth)/candidate-signup') },
  { label: 'Login', onPress: () => router.push('/(auth)/login') },
];

function FooterColumn({ title, links }: { title: string; links: LinkItem[] }) {
  return (
    <View style={st.col}>
      <Text style={st.colTitle}>{title}</Text>
      {links.map((l) => (
        <AnimatedPressable key={l.label} onPress={l.onPress} scaleTo={0.96} style={st.linkRow}>
          {(state) => <Text style={[st.linkText, state.hovered && st.linkTextHover]}>{l.label}</Text>}
        </AnimatedPressable>
      ))}
    </View>
  );
}

export default function PublicFooter({ stacked }: { stacked: boolean }) {
  return (
    <View style={[st.wrap, stacked && st.wrapStacked]}>
      <View style={[st.topRow, stacked && st.topRowStacked]}>
        <View style={st.brandCol}>
          <AnimatedPressable style={st.brandRow} onPress={() => router.push('/(auth)/welcome')} scaleTo={0.96}>
            <View style={st.logoBadge}>
              <AppIcon name="flash" size={18} color="#FFFFFF" />
            </View>
            <Text style={st.brandText}>Hiyame</Text>
          </AnimatedPressable>
          <Text style={st.tagline}>Verified professionals, matched directly, no job boards, no agencies.</Text>
        </View>

        <View style={[st.linkCols, stacked && st.linkColsStacked]}>
          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />
          <FooterColumn title="Get started" links={START_LINKS} />
        </View>
      </View>

      <View style={st.bottomBar}>
        <Text style={st.copyright}>© {new Date().getFullYear()} Hiyame. All rights reserved.</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    marginTop: 56, paddingTop: 40, paddingBottom: 8,
    borderTopWidth: 1, borderTopColor: '#E1E8ED',
  },
  wrapStacked: { marginTop: 40, paddingTop: 32 },

  topRow: { flexDirection: 'row', gap: 48, marginBottom: 32 },
  topRowStacked: { flexDirection: 'column', gap: 32 },

  brandCol: { flex: 1.2, minWidth: 200, maxWidth: 320 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  logoBadge: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: CANDIDATE_COLOR,
    alignItems: 'center', justifyContent: 'center',
  },
  brandText: { fontSize: 17, fontWeight: '800', color: COMPANY_COLOR, letterSpacing: -0.3 },
  tagline: { fontSize: 13.5, color: '#8A97A4', fontWeight: '500', lineHeight: 20, maxWidth: 280 },

  linkCols: { flexDirection: 'row', flex: 2, gap: 32, flexWrap: 'wrap' },
  linkColsStacked: { flexDirection: 'row', gap: 28 },
  col: { minWidth: 120, gap: 4 },
  colTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, color: '#8A97A4', marginBottom: 10, textTransform: 'uppercase' },
  linkRow: { paddingVertical: 6 },
  linkText: { fontSize: 14, fontWeight: '600', color: '#536471' },
  linkTextHover: { color: CANDIDATE_COLOR },

  bottomBar: { borderTopWidth: 1, borderTopColor: '#EDF1F4', paddingTop: 20, alignItems: 'center' },
  copyright: { fontSize: 13, color: '#8A97A4', fontWeight: '500', marginBottom: 8 },
});
