import { useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, usePathname } from 'expo-router';
import AppIcon, { AppIconName } from '@/components/AppIcon';
import { Text } from '@/components/Themed';
import { useTheme, useThemeToggle, ThemePalette, ICON, RADIUS } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { initials } from '@/lib/format';
import AnimatedPressable from '@/components/AnimatedPressable';

// Persistent left sidebar for desktop web. The tab layouts render this beside
// the screen content (flexDirection: row) and hide the bottom tab bar at this
// width; on mobile / narrow web it renders nothing and the bottom tabs stay.
export const DESKTOP_NAV_BREAKPOINT = 900;
export const SIDEBAR_WIDTH = 236;
// Content (ScreenFrame) caps at 1180px and centers once the sidebar's own
// 236px is accounted for — so the content pane already hits that 1180px cap
// once the viewport reaches SIDEBAR_WIDTH + CONTENT_MAX_WIDTH (236 + 1180 =
// 1416). Past that point there's headroom to go from 2 columns to 3 without
// making cards any narrower than they already are at exactly 2-column width.
export const WIDE_DESKTOP_BREAKPOINT = 1440;

type Item = { label: string; route: string; screen: string; icon: AppIconName };

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

export function useIsWideDesktopWeb(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= WIDE_DESKTOP_BREAKPOINT;
}

function filled(icon: string): AppIconName {
  return icon.replace('-outline', '') as AppIconName;
}

export default function SideNav({ role }: { role: 'candidate' | 'company' }) {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const { mode, toggleTheme } = useThemeToggle();
  const pathname = usePathname();
  const isDesktop = useIsDesktopWeb();
  const { candidateId, companyId } = useAuth();

  const [identity, setIdentity] = useState<{ name: string; photoUrl: string | null } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (role === 'candidate' && candidateId) {
        const { data } = await supabase.from('candidates').select('full_name, photo_url').eq('id', candidateId).maybeSingle();
        if (alive && data) setIdentity({ name: data.full_name, photoUrl: data.photo_url });
      } else if (role === 'company' && companyId) {
        // logo_url is on the same pending migration as the full_name/
        // notification_prefs grants (20260911140000_notification_prefs.sql) —
        // selected separately so a not-yet-migrated database still shows the
        // company name here instead of the whole query failing on an unknown
        // column.
        const { data } = await supabase.from('companies').select('trading_name, legal_name').eq('id', companyId).maybeSingle();
        if (!alive || !data) return;
        setIdentity({ name: data.trading_name || data.legal_name, photoUrl: null });
        const { data: logoRow } = await supabase.from('companies').select('logo_url').eq('id', companyId).maybeSingle();
        if (alive && logoRow?.logo_url) {
          setIdentity((prev) => (prev ? { ...prev, photoUrl: logoRow.logo_url } : prev));
        }
      }
    })();
    return () => { alive = false; };
  }, [role, candidateId, companyId]);

  if (!isDesktop) return null;

  const items = role === 'candidate' ? CANDIDATE : COMPANY;
  const base = role === 'candidate' ? '/(candidate)' : '/(company)';
  const last = pathname.replace(/\/+$/, '').split('/').pop() || '';
  const activeScreen = last === '' || last === '(candidate)' || last === '(company)' ? 'index' : last;

  return (
    <View style={st.bar}>
      <Pressable style={st.brand} onPress={() => router.navigate(items[0].route as any)} accessibilityRole="link">
        <View style={st.brandDot}>
          <AppIcon name="flash" size={ICON.md} color={T.textOnAccent} />
        </View>
        <Text style={st.brandText}>Hiyame</Text>
      </Pressable>

      <View style={st.links}>
        {items.map((it) => {
          const active = it.screen === activeScreen;
          return (
            <AnimatedPressable
              key={it.screen}
              scaleTo={0.97}
              onPress={() => router.navigate(it.route as any)}
              style={({ pressed }: { pressed: boolean }) => [st.link, active && st.linkActive, pressed && !active && st.linkPressed]}
              accessibilityRole="link"
              accessibilityState={{ selected: active }}
            >
              <AppIcon name={active ? filled(it.icon) : it.icon} size={ICON.lg} color={active ? T.accent : T.textSecondary} />
              <Text style={[st.linkText, active && st.linkTextActive]}>{it.label}</Text>
            </AnimatedPressable>
          );
        })}
      </View>

      <AnimatedPressable
        scaleTo={0.98}
        style={({ pressed }: { pressed: boolean }) => [st.identityRow, pressed && st.linkPressed]}
        onPress={() => router.navigate(`${base}/profile` as any)}
        accessibilityRole="link"
        accessibilityLabel="Your profile"
      >
        <View style={st.avatarWrap}>
          {identity?.photoUrl ? (
            <Image source={{ uri: identity.photoUrl }} style={st.avatarImage} resizeMode="cover" />
          ) : (
            <Text style={st.avatarInitials}>{initials(identity?.name || (role === 'candidate' ? 'You' : 'Co'))}</Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={st.identityName}>{identity?.name || (role === 'candidate' ? 'Your profile' : 'Your company')}</Text>
          <Text style={st.identityRole}>{role === 'candidate' ? 'Candidate' : 'Company'}</Text>
        </View>
      </AnimatedPressable>

      <View style={st.footer}>
        <AnimatedPressable
          scaleTo={0.97}
          style={({ pressed }: { pressed: boolean }) => [st.footRow, pressed && st.linkPressed]}
          onPress={() => router.navigate(`${base}/notifications` as any)}
          accessibilityRole="link"
          accessibilityLabel="Notifications"
        >
          <AppIcon name="notifications-outline" size={ICON.md} color={T.textSecondary} />
          <Text style={st.footText}>Notifications</Text>
        </AnimatedPressable>
        <AnimatedPressable
          scaleTo={0.97}
          style={({ pressed }: { pressed: boolean }) => [st.footRow, pressed && st.linkPressed]}
          onPress={toggleTheme}
          accessibilityRole="button"
          accessibilityLabel={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          <AppIcon name={mode === 'light' ? 'moon-outline' : 'sunny-outline'} size={ICON.md} color={T.textSecondary} />
          <Text style={st.footText}>{mode === 'light' ? 'Dark mode' : 'Light mode'}</Text>
        </AnimatedPressable>
        <AnimatedPressable
          scaleTo={0.97}
          style={({ pressed }: { pressed: boolean }) => [st.footRow, pressed && st.linkPressed]}
          onPress={() => router.navigate(`${base}/settings` as any)}
          accessibilityRole="link"
          accessibilityLabel="Settings"
        >
          <AppIcon name="settings-outline" size={ICON.md} color={T.textSecondary} />
          <Text style={st.footText}>Settings</Text>
        </AnimatedPressable>
        <AnimatedPressable
          scaleTo={0.97}
          style={({ pressed }: { pressed: boolean }) => [st.footRow, pressed && st.linkPressed]}
          onPress={() => supabase.auth.signOut()}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <AppIcon name="log-out-outline" size={ICON.md} color={T.danger} />
          <Text style={[st.footText, { color: T.danger }]}>Sign out</Text>
        </AnimatedPressable>
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
  linkTextActive: { color: T.accentDim, fontWeight: '700' },
  footer: { gap: 3, borderTopWidth: 1, borderTopColor: T.border, paddingTop: 10, marginTop: 10 },
  footRow: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 40, paddingHorizontal: 12, borderRadius: RADIUS.control },
  footText: { fontSize: 13.5, fontWeight: '600', color: T.textSecondary },
  identityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.control,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border,
  },
  avatarWrap: {
    width: 34, height: 34, borderRadius: 11, backgroundColor: T.accentBg,
    borderWidth: 1, borderColor: T.accentBg20,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitials: { fontSize: 13, fontWeight: '800', color: T.accentDim },
  identityName: { fontSize: 13.5, fontWeight: '700', color: T.textPrimary },
  identityRole: { fontSize: 11, color: T.textMuted, fontWeight: '600', marginTop: 1 },
});
