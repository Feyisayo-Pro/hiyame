import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemeToggle, ThemePalette, ICON, RADIUS } from '@/lib/theme';
import { useIsDesktopWeb } from '@/components/TopNav';

// Persistent top bar for desktop web — sits above the screen content, beside
// the left sidebar. Holds the always-available controls (notifications, theme,
// settings) so they don't move as you navigate.
export const TOPBAR_HEIGHT = 54;

export default function TopBar({ role }: { role: 'candidate' | 'company' }) {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const { mode, toggleTheme } = useThemeToggle();
  const isDesktop = useIsDesktopWeb();

  if (!isDesktop) return null;

  const base = role === 'candidate' ? '/(candidate)' : '/(company)';

  const IconBtn = ({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [st.btn, pressed && st.btnPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={ICON.md} color={T.textSecondary} />
    </Pressable>
  );

  return (
    <View style={st.bar}>
      <View style={st.actions}>
        <IconBtn icon="notifications-outline" label="Notifications" onPress={() => router.navigate(`${base}/notifications` as any)} />
        <IconBtn
          icon={mode === 'light' ? 'moon-outline' : 'sunny-outline'}
          label={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          onPress={toggleTheme}
        />
        <IconBtn icon="settings-outline" label="Settings" onPress={() => router.navigate(`${base}/settings` as any)} />
      </View>
    </View>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  bar: {
    height: TOPBAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    backgroundColor: T.card,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  btn: { width: 36, height: 36, borderRadius: RADIUS.control, alignItems: 'center', justifyContent: 'center' },
  btnPressed: { backgroundColor: T.surface },
});
