import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Themed';
import { useTheme, useThemeToggle, ThemePalette, ICON, RADIUS } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

// Persistent left sidebar for desktop web. The tab layouts render this beside
// the screen content (flexDirection: row) and hide the bottom tab bar at this
// width; on mobile / narrow web it renders nothing and the bottom tabs stay.
export const DESKTOP_NAV_BREAKPOINT = 900;
export const SIDEBAR_WIDTH = 236;

type Item = { label: string; route: string; screen: string; icon: keyof typeof Ionicons.glyphMap };

const CANDIDATE: Item[] = [
  { label: 'Home', route: '/(candidate)', screen: 'index', icon: 'home-outline' },
  { label: 'Jobs', route: '/(candidate)/opportunities', screen: 'opportunities', icon: 'briefcase-outline' },
  { label: 'Connections', route: '/(candidate)/messages', screen: 'messages', icon: 'people-outline' },
  { label: 'Profile', route: '/(candidate)/profile', screen: 'profile', icon: 'person-outline' },
];

const COMPANY: Item[] = [
  { label: 'Home', route: '/(company)', screen: 'index', icon: 'home-outline' },
  { label: 'Discover', route: '/(company)/roles', screen: 'roles', icon: 'compass-outline' },
  { label: 'Connections', route: '/(company)/messages', screen: 'messages', icon: 'people-outline' },
  { label: 'Insights', route: '/(company)/analytics', screen: 'analytics', icon: 'stats-chart-outline' },
];

export function useIsDesktopWeb(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESKTOP_NAV_BREAKPOINT;
}

function filled(icon: string): keyof typeof Ionicons.glyphMap {
  return icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap;
}

export default function SideNav({ role }: { role: 'candidate' | 'company' }) {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const { mode, toggleTheme } = useThemeToggle();
  const pathname = usePathname();
  const isDesktop = useIsDesktopWeb();

  if (!isDesktop) return null;

  const items = role === 'candidate' ? CANDIDATE : COMPANY;
  const base = role === 'candidate' ? '/(candidate)' : '/(company)';
  const last = pathname.replace(/\/+$/, '').split('/').pop() || '';
  const activeScreen = last === '' || last === '(candidate)' || last === '(company)' ? 'index' : last;

  return (
    <View style={st.bar}>
      <Pressable style={st.brand} onPress={() => router.navigate(items[0].route as any)} accessibilityRole="link">
        <View style={st.brandDot}>
          <Ionicons name="flash" size={ICON.md} color={T.textOnAccent} />
        </View>
        <Text style={st.brandText}>Hiyame</Text>
      </Pressable>

      <View style={st.links}>
        {items.map((it) => {
          const active = it.screen === activeScreen;
          return (
            <Pressable
              key={it.screen}
              onPress={() => router.navigate(it.route as any)}
              style={({ pressed }) => [st.link, active && st.linkActive, pressed && !active && st.linkPressed]}
              accessibilityRole="link"
              accessibilityState={{ selected: active }}
            >
              <Ionicons name={active ? filled(it.icon) : it.icon} size={ICON.lg} color={active ? T.accent : T.textSecondary} />
              <Text style={[st.linkText, active && st.linkTextActive]}>{it.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={st.footer}>
        <Pressable
          style={({ pressed }) => [st.footRow, pressed && st.linkPressed]}
          onPress={() => router.navigate(`${base}/notifications` as any)}
          accessibilityRole="link"
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={ICON.md} color={T.textSecondary} />
          <Text style={st.footText}>Notifications</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [st.footRow, pressed && st.linkPressed]}
          onPress={toggleTheme}
          accessibilityRole="button"
          accessibilityLabel={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          <Ionicons name={mode === 'light' ? 'moon-outline' : 'sunny-outline'} size={ICON.md} color={T.textSecondary} />
          <Text style={st.footText}>{mode === 'light' ? 'Dark mode' : 'Light mode'}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [st.footRow, pressed && st.linkPressed]}
          onPress={() => router.navigate(`${base}/settings` as any)}
          accessibilityRole="link"
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={ICON.md} color={T.textSecondary} />
          <Text style={st.footText}>Settings</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [st.footRow, pressed && st.linkPressed]}
          onPress={() => supabase.auth.signOut()}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Ionicons name="log-out-outline" size={ICON.md} color={T.danger} />
          <Text style={[st.footText, { color: T.danger }]}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  bar: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    backgroundColor: T.card,
    borderRightWidth: 1,
    borderRightColor: T.border,
    paddingVertical: 20,
    paddingHorizontal: 14,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, marginBottom: 26 },
  brandDot: { width: 30, height: 30, borderRadius: 9, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  brandText: { fontSize: 18, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.3 },
  links: { gap: 3, flex: 1 },
  link: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    height: 42, paddingHorizontal: 12, borderRadius: RADIUS.control,
  },
  linkActive: { backgroundColor: T.accentBg },
  linkPressed: { backgroundColor: T.surface },
  linkText: { fontSize: 14, fontWeight: '600', color: T.textSecondary, letterSpacing: -0.1 },
  linkTextActive: { color: T.accent, fontWeight: '700' },
  footer: { gap: 3, borderTopWidth: 1, borderTopColor: T.border, paddingTop: 10, marginTop: 10 },
  footRow: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 40, paddingHorizontal: 12, borderRadius: RADIUS.control },
  footText: { fontSize: 13.5, fontWeight: '600', color: T.textSecondary },
});
