/**
 * AccountSettings -- premium account settings & SaaS subscription gateway.
 * Shared component for both candidate and company personas.
 */
import { useState } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme, useThemeToggle, ThemePalette } from '@/lib/theme';
import { useSubscription } from '@/lib/subscriptionStore';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import ScreenFrame from '@/components/ScreenFrame';

type Persona = 'company' | 'candidate';

// == Settings Row ==

function SettingsRow({ icon, label, value, onPress, T, danger }: {
  icon: string; label: string; value?: string; onPress?: () => void; T: ThemePalette; danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 14, paddingHorizontal: 16,
        backgroundColor: pressed ? T.surfaceHover : 'transparent',
        borderBottomWidth: 1, borderBottomColor: T.border,
      })}
    >
      <Ionicons name={icon as any} size={20} color={danger ? T.danger : T.textSecondary} />
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: danger ? T.danger : T.textPrimary }}>{label}</Text>
      {value && <Text style={{ fontSize: 13, color: T.textSecondary }}>{value}</Text>}
      {onPress && <Ionicons name="chevron-forward" size={16} color={T.textMuted} />}
    </Pressable>
  );
}

// == Main Component ==

export default function AccountSettings({ persona = 'company' }: { persona?: Persona }) {
  const T = useTheme();
  const router = useRouter();
  const { mode, toggleTheme } = useThemeToggle();
  const { config } = useSubscription();
  const { session } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const profileRoute = persona === 'company' ? '/(company)/profile' : '/(candidate)/profile';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['top', 'left', 'right']}>
      <ScreenFrame>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <SwipeFadeContainer>
          {/* Header */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: T.textPrimary }}>Settings</Text>
            <Text style={{ fontSize: 13, color: T.textSecondary, marginTop: 2 }}>Manage your account and subscription</Text>
          </View>

          {/* Subscription — company persona only; routes to the real Plans & Pricing
              screen (lib/subscriptionStore.ts) rather than a separate mock checkout. */}
          {persona === 'company' && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: T.textMuted, paddingHorizontal: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Subscription</Text>
              <View style={{ backgroundColor: T.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.border }}>
                <SettingsRow
                  icon="card-outline"
                  label="Subscription & Billing"
                  value={`${config.name} Plan`}
                  onPress={() => router.push('/(company)/subscriptions')}
                  T={T}
                />
              </View>
            </View>
          )}

          {/* Account Settings */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: T.textMuted, paddingHorizontal: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Account</Text>
            <View style={{ backgroundColor: T.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.border }}>
              <SettingsRow icon="person-outline" label="Edit Profile" onPress={() => router.push(profileRoute as any)} T={T} />
              <SettingsRow icon="mail-outline" label="Email" value={session?.user?.email ?? '—'} T={T} />
              <SettingsRow icon="lock-closed-outline" label="Password" onPress={() => setShowPasswordModal(true)} T={T} />
              <SettingsRow icon="globe-outline" label="Language" value="English" T={T} />
            </View>
          </View>

          {/* Preferences */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: T.textMuted, paddingHorizontal: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 }}>Preferences</Text>
            <View style={{ backgroundColor: T.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: T.border }}>
                <Ionicons name={mode === 'light' ? 'sunny-outline' : 'moon-outline'} size={20} color={T.textSecondary} />
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: T.textPrimary }}>Dark Mode</Text>
                <Switch value={mode === 'dark'} onValueChange={toggleTheme} trackColor={{ false: T.surface, true: T.accent }} thumbColor={T.white} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: T.border }}>
                <Ionicons name="notifications-outline" size={20} color={T.textSecondary} />
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: T.textPrimary }}>Push Notifications</Text>
                <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ false: T.surface, true: T.accent }} thumbColor={T.white} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16 }}>
                <Ionicons name="mail-outline" size={20} color={T.textSecondary} />
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: T.textPrimary }}>Email Updates</Text>
                <Switch value={emailUpdates} onValueChange={setEmailUpdates} trackColor={{ false: T.surface, true: T.accent }} thumbColor={T.white} />
              </View>
            </View>
          </View>

          {/* Support — Help Center / Terms / Privacy hidden until there's real
              content behind them; a tappable row that goes nowhere is worse
              than no row at all. */}

          {/* Danger Zone */}
          <View>
            <View style={{ backgroundColor: T.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.border }}>
              <SettingsRow icon="log-out-outline" label="Sign Out" onPress={() => supabase.auth.signOut()} T={T} danger />
            </View>
          </View>

          {/* Version */}
          <View style={{ alignItems: 'center', paddingTop: 24 }}>
            <Text style={{ fontSize: 12, color: T.textMuted }}>hiyame v1.0.0</Text>
          </View>
        </SwipeFadeContainer>
      </ScrollView>
      </ScreenFrame>

      <ChangePasswordModal visible={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </SafeAreaView>
  );
}
