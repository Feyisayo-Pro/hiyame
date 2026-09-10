import { useMemo, useState, useCallback, useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/Themed';
import { useTheme, ThemePalette } from '@/lib/theme';
import { useSubscription } from '@/lib/subscriptionStore';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import { notify } from '@/lib/notify';

// The team roster is real: it reads and writes the company_users table
// (scoped to the signed-in user's company via RLS). An "invite" is a
// persisted row with status = 'pending' and no auth_user_id — a record of
// intent only. There is NO invite email and no way for the invitee to sign
// in yet; a future email-based claim flow will activate pending rows. Until
// then a pending member stays pending. Seat cap comes from the plan tier
// (useSubscription), counted against real rows.

interface Member {
  id: string;
  email: string | null;
  role: string | null;
  status: 'active' | 'pending';
  auth_user_id: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function displayName(email: string | null): string {
  if (!email) return 'Unknown';
  return email.split('@')[0];
}

function initialsFor(email: string | null): string {
  return displayName(email).slice(0, 2).toUpperCase();
}

function roleLabel(m: Member): string {
  if (m.status === 'pending') return 'Pending Invite';
  if (m.role === 'talent_lead') return 'Talent Lead';
  return 'Hiring Manager';
}

export default function TeamMembersScreen() {
  const T = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const router = useRouter();
  const { config } = useSubscription();
  const { companyId, session } = useAuth();

  const [members, setMembers] = useState<Member[] | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) {
      setMembers([]);
      return;
    }
    const { data, error } = await supabase
      .from('company_users')
      .select('id, email, role, status, auth_user_id')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('Failed to load team:', error.message);
      setMembers([]);
      return;
    }
    setMembers((data ?? []) as Member[]);
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const seatCap = config.teamSeatCap;
  const seatsUsed = members?.length ?? 0;
  const seatsFull = seatCap !== -1 && seatsUsed >= seatCap;

  const handleInvite = useCallback(async () => {
    if (seatsFull) {
      notify(
        'Seat Limit Reached',
        `Your ${config.name} plan is limited to ${seatCap} team seat${seatCap === 1 ? '' : 's'}. Upgrade to Enterprise for unlimited seats.`,
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/(company)/subscriptions') },
        ],
      );
      return;
    }
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_RE.test(email)) {
      notify('Invalid email', 'Enter a valid email address.');
      return;
    }
    if (!companyId) {
      notify('Something went wrong', 'No company account found for this session.');
      return;
    }

    setInviting(true);
    const { error } = await supabase
      .from('company_users')
      .insert({ company_id: companyId, email, role: 'hiring_manager', status: 'pending' });
    setInviting(false);

    if (error) {
      if (error.code === '23505') {
        notify('Already on the team', `${email} has already been invited or added.`);
      } else {
        notify('Could not send invite', error.message);
      }
      return;
    }
    setInviteEmail('');
    await load();
  }, [seatsFull, config.name, seatCap, router, inviteEmail, companyId, load]);

  const handleRemove = useCallback(
    (member: Member) => {
      if (member.auth_user_id && member.auth_user_id === session?.user?.id) {
        notify("Can't remove yourself", 'Ask another teammate to remove your seat.');
        return;
      }
      notify(
        member.status === 'pending' ? 'Cancel Invite' : 'Remove Team Member',
        member.status === 'pending'
          ? `Cancel the pending invite for ${member.email}?`
          : `Remove ${displayName(member.email)} from your team? This frees up a seat immediately.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: member.status === 'pending' ? 'Cancel Invite' : 'Remove',
            style: 'destructive',
            onPress: async () => {
              setBusyId(member.id);
              const { error } = await supabase.from('company_users').delete().eq('id', member.id);
              setBusyId(null);
              if (error) {
                notify('Something went wrong', error.message);
                return;
              }
              await load();
            },
          },
        ],
      );
    },
    [session, load],
  );

  return (
    <SafeAreaView style={s.safeArea} edges={['top', 'left', 'right']}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={T.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>Team Members</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <SwipeFadeContainer>
          {/* Seat usage banner */}
          <View style={s.seatCard}>
            <View style={s.seatIconWrap}>
              <Ionicons name="people" size={18} color={T.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.seatTitle}>{config.name} Plan</Text>
              <Text style={s.seatSubtitle}>
                {seatsUsed} of {seatCap === -1 ? 'unlimited' : seatCap} seats used
              </Text>
            </View>
          </View>

          {/* Member list */}
          <Text style={s.sectionLabel}>MEMBERS</Text>
          {members === null ? (
            <View style={s.loadingBox}>
              <ActivityIndicator color={T.accent} />
            </View>
          ) : members.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>No team members yet. Invite your first teammate below.</Text>
            </View>
          ) : (
            <View style={s.memberList}>
              {members.map((m, i) => {
                const isSelf = !!m.auth_user_id && m.auth_user_id === session?.user?.id;
                const label = roleLabel(m);
                return (
                  <View key={m.id} style={[s.memberRow, i < members.length - 1 && s.memberRowBorder]}>
                    <View style={s.avatarCircle}>
                      <Text style={s.avatarInitials}>{initialsFor(m.email)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.memberName}>
                        {displayName(m.email)}
                        {isSelf ? ' (you)' : ''}
                      </Text>
                      <Text style={s.memberEmail}>{m.email}</Text>
                    </View>
                    <View style={[s.roleBadge, m.status === 'pending' && s.roleBadgePending]}>
                      <Text style={[s.roleBadgeText, m.status === 'pending' && s.roleBadgeTextPending]}>{label}</Text>
                    </View>
                    {isSelf ? (
                      <View style={s.deleteBtn} />
                    ) : busyId === m.id ? (
                      <View style={s.deleteBtn}>
                        <ActivityIndicator size="small" color={T.danger} />
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => handleRemove(m)}
                        style={s.deleteBtn}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`${m.status === 'pending' ? 'Cancel invite for' : 'Remove'} ${m.email ?? 'member'}`}
                      >
                        <Ionicons name="trash-outline" size={18} color={T.danger} />
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Invite section */}
          <Text style={s.sectionLabel}>INVITE A TEAMMATE</Text>
          <View style={s.inviteCard}>
            <TextInput
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="teammate@company.com"
              placeholderTextColor={T.inputPlaceholder}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!seatsFull && !inviting}
              style={[s.inviteInput, (seatsFull || inviting) && s.inviteInputDisabled]}
            />
            <Pressable
              onPress={handleInvite}
              disabled={inviting}
              style={[s.inviteBtn, (seatsFull || inviting) && s.inviteBtnDisabled]}
            >
              <Ionicons name={seatsFull ? 'lock-closed' : 'person-add'} size={16} color={T.textOnAccent} />
              <Text style={s.inviteBtnText}>{inviting ? 'Inviting…' : 'Invite Member'}</Text>
            </Pressable>
            <Text style={s.inviteHint}>
              Adds a pending seat now. No email is sent yet — teammate sign-in is coming later.
            </Text>
          </View>

          {seatsFull && (
            <View style={s.limitNotice}>
              <Ionicons name="alert-circle" size={16} color={T.amber} />
              <Text style={s.limitNoticeText}>
                Your {config.name} plan is limited to {seatCap} team seat{seatCap === 1 ? '' : 's'}. Upgrade to Enterprise for unlimited seats.
              </Text>
            </View>
          )}
        </SwipeFadeContainer>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: T.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: T.textPrimary },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

  seatCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.accentBg, borderRadius: 16, borderWidth: 1, borderColor: T.accent + '30', padding: 16, marginBottom: 24 },
  seatIconWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: T.card, alignItems: 'center', justifyContent: 'center' },
  seatTitle: { fontSize: 14, fontWeight: '700', color: T.textPrimary },
  seatSubtitle: { fontSize: 12, color: T.textSecondary, marginTop: 2 },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: T.textMuted, marginBottom: 8, letterSpacing: 0.3 },
  loadingBox: { backgroundColor: T.card, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 28, alignItems: 'center', marginBottom: 24 },
  emptyBox: { backgroundColor: T.card, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 20, marginBottom: 24 },
  emptyText: { fontSize: 13, color: T.textSecondary, lineHeight: 19, textAlign: 'center' },
  memberList: { backgroundColor: T.card, borderRadius: 16, borderWidth: 1, borderColor: T.border, marginBottom: 24 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  memberRowBorder: { borderBottomWidth: 1, borderBottomColor: T.border },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border },
  avatarInitials: { fontSize: 13, fontWeight: '700', color: T.accent },
  memberName: { fontSize: 14, fontWeight: '600', color: T.textPrimary },
  memberEmail: { fontSize: 12, color: T.textSecondary, marginTop: 1 },
  roleBadge: { backgroundColor: T.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleBadgeText: { fontSize: 10, fontWeight: '700', color: T.textSecondary },
  roleBadgePending: { backgroundColor: T.amberBg },
  roleBadgeTextPending: { color: T.amber },
  deleteBtn: { marginLeft: 10, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  inviteCard: { backgroundColor: T.card, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 16, gap: 12, marginBottom: 12 },
  inviteInput: { backgroundColor: T.inputBg, color: T.inputText, borderRadius: 12, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  inviteInputDisabled: { opacity: 0.5 },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.accent, borderRadius: 12, paddingVertical: 14 },
  inviteBtnDisabled: { backgroundColor: T.textMuted, opacity: 0.6 },
  inviteBtnText: { fontSize: 14, fontWeight: '700', color: T.textOnAccent },
  inviteHint: { fontSize: 11, color: T.textMuted, lineHeight: 15 },

  limitNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: T.amberBg, borderRadius: 12, padding: 14 },
  limitNoticeText: { flex: 1, fontSize: 12, color: T.textPrimary, lineHeight: 17 },
});
