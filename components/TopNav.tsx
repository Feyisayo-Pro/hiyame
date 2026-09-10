import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Themed';
import { useTheme, useThemeToggle, ThemePalette, ICON, ELEVATION, RADIUS } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

// Desktop-web top navigation. Replaces the floating bottom tab bar on wide
// screens (the tab layouts hide the bottom bar and render this instead); on
// mobile / narrow web it renders nothing and the bottom tabs stay.
export const DESKTOP_NAV_BREAKPOINT = 860;

type Item = { label: string; route: string; screen: string; icon: keyof typeof Ionicons.glyphMap };

const CANDIDATE: Item[] = [
  { label: 'Home', route: '/(candidate)', screen: 'index', icon: 'home-outline' },
  { label: 'Jobs', route: '/(candidate)/opportunities', screen: 'opportunities', icon: 'briefcase-outline' },
  { label: 'Connections', route: '/(candidate)/messages', screen: 'messages', icon: 'people-outline' },
  { label: 'Profile', route: '/(candidate)/profile', screen: 'profile', icon: 'person-outline' },
];

const COMPANY: Item[] = [
  { label: 'Home', route: '/(company)', screen: 'index', icon: 'home-outline' },
  { label: 'Discover', route: '/(company)/roles', screen: 'roles', icon: 'swap-horizontal-outline' },
  { label: 'Connections', route: '/(company)/messages', screen: 'messages', icon: 'people-outline' },
  { label: 'Insights', route: '/(company)/analytics', screen: 'analytics', icon: 'bar-chart-outline' },
];

export function useIsDesktopWeb(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESKTOP_NAV_BREAKPOINT;
}

export default function TopNav({ role }: { role: 'candidate' | 'company' }) {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const { mode, toggleTheme } = useThemeToggle();
  const pathname = usePathname();
  const isDesktop = useIsDesktopWeb();

  if (!isDesktop) return null;

  const items = role === 'candidate' ? CANDIDATE : COMPANY;
  const last = pathname.replace(/\/+$/, '').split('/').pop() || '';
  const activeScreen = last === '' || last === '(candidate)' || last === '(company)' ? 'index' : last;

  return (
    <View style={st.bar}>
      <Pressable style={st.brand} onPress={() => router.navigate(items[0].route as any)} accessibilityRole="link">
        <View style={st.brandDot}>
          <Ionicons name="flash" size={ICON.sm} color={T.textOnAccent} />
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
              <Ionicons
                name={active ? (it.icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap) : it.icon}
                size={ICON.md}
                color={active ? T.accent : T.textSecondary}
              />
              <Text style={[st.linkText, active && st.linkTextActive]}>{it.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={st.actions}>
        <Pressable style={({ pressed }) => [st.iconBtn, pressed && st.iconBtnPressed]} onPress={toggleTheme} accessibilityRole="button" accessibilityLabel="Toggle theme">
          <Ionicons name={mode === 'light' ? 'sunny-outline' : 'moon-outline'} size={ICON.md} color={T.textSecondary} />
        </Pressable>
        <Pressable style={({ pressed }) => [st.iconBtn, pressed && st.iconBtnPressed]} onPress={() => supabase.auth.signOut()} accessibilityRole="button" accessibilityLabel="Sign out">
          <Ionicons name="log-out-outline" size={ICON.md} color={T.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
    height: 56,
    paddingHorizontal: 22,
    backgroundColor: T.card,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    ...ELEVATION.card,
    zIndex: 10,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandDot: { width: 26, height: 26, borderRadius: 8, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  brandText: { fontSize: 16, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.3 },
  links: { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1 },
  link: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 13, height: 34, borderRadius: RADIUS.control,
  },
  linkActive: { backgroundColor: T.accentBg },
  linkPressed: { backgroundColor: T.surface },
  linkText: { fontSize: 13.5, fontWeight: '600', color: T.textSecondary, letterSpacing: -0.1 },
  linkTextActive: { color: T.accent, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { width: 34, height: 34, borderRadius: RADIUS.control, alignItems: 'center', justifyContent: 'center' },
  iconBtnPressed: { backgroundColor: T.surface },
});
