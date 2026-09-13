import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text } from '@/components/Themed';
import { useTheme, ThemePalette, ICON } from '@/lib/theme';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';

// A real Hiyame footer for the one screen in this app shaped like a page a
// footer belongs on (Settings). The pasted reference (sticky-footer.tsx) was
// a shadcn/Tailwind/Framer-Motion/Lenis marketing-site footer for a fintech
// called "Cognition, Inc." with ~56 links to Cards & Issuing, Crypto Wallets,
// Investor Relations, etc. — none of that is Hiyame, and the sticky
// clip-path-reveal-on-scroll trick only makes sense on a long freely
// scrolling marketing page, which this app doesn't have (it's tab-based).
// This keeps only what's real: the brand mark, an accurate one-line
// description, the 3 support links that actually go somewhere
// (components/HelpCenterScreen.tsx, components/LegalScreen.tsx), and a
// copyright line. No social icons — Hiyame has no real accounts to link.

interface AppFooterProps {
  persona: 'candidate' | 'company';
}

export default function AppFooter({ persona }: AppFooterProps) {
  const T = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const router = useRouter();

  const helpRoute = persona === 'company' ? '/(company)/help' : '/(candidate)/help';
  const legalRoute = persona === 'company' ? '/(company)/legal' : '/(candidate)/legal';

  const links = [
    { label: 'Help Center', onPress: () => router.push(helpRoute as any) },
    { label: 'Terms of Service', onPress: () => router.push({ pathname: legalRoute as any, params: { tab: 'terms' } }) },
    { label: 'Privacy Policy', onPress: () => router.push({ pathname: legalRoute as any, params: { tab: 'privacy' } }) },
  ];

  return (
    <SwipeFadeContainer axis="y" offset={12} duration={280}>
      <View style={s.footer}>
        <View style={s.brandRow}>
          <View style={s.brandDot}>
            <Ionicons name="flash" size={ICON.sm} color={T.textOnAccent} />
          </View>
          <Text style={s.brandText}>Hiyame</Text>
        </View>

        <Text style={s.tagline}>
          Verified African talent, matched directly to the companies that want to hire them.
        </Text>

        <View style={s.linkRow}>
          {links.map((link, i) => (
            <View key={link.label} style={s.linkItem}>
              {i > 0 && <View style={s.dot} />}
              <Pressable onPress={link.onPress} hitSlop={8}>
                <Text style={s.linkText}>{link.label}</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <View style={s.divider} />
        <Text style={s.copyright}>© 2026 Hiyame. All rights reserved.</Text>
      </View>
    </SwipeFadeContainer>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  footer: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 32, paddingBottom: 8, gap: 12 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandDot: { width: 24, height: 24, borderRadius: 8, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  brandText: { fontSize: 15, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.2 },
  tagline: { fontSize: 12.5, color: T.textSecondary, textAlign: 'center', lineHeight: 18, maxWidth: 300 },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 4 },
  linkItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: T.textMuted },
  linkText: { fontSize: 12.5, fontWeight: '600', color: T.textSecondary },
  divider: { width: 40, height: 1, backgroundColor: T.border, marginTop: 12, marginBottom: 4 },
  copyright: { fontSize: 11, color: T.textMuted },
});
