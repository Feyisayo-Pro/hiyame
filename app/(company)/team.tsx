import { useMemo, useState, useCallback } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/Themed';
import { useTheme, ThemePalette } from '@/lib/theme';
import { useSubscription } from '@/lib/subscriptionStore';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarInitials: string;
}

const INITIAL_MEMBERS: TeamMember[] = [
  { id: '1', name: 'Ada Eze', email: 'ada@vertexglobal.com', role: 'Owner', avatarInitials: 'AE' },
  { id: '2', name: 'Chidi Okafor', email: 'chidi@vertexglobal.com', role: 'Hiring Manager', avatarInitials: 'CO' },
  { id: '3', name: 'Bisi Adeyemi', email: 'bisi@vertexglobal.com', role: 'Hiring Manager', avatarInitials: 'BA' },
];

function initialsFor(email: string): string {
  const name = email.split('@')[0];
  return name.slice(0, 2).toUpperCase();
}

export default function TeamMembersScreen() {
  const T = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const router = useRouter();
  const { config } = useSubscription();

  const [members, setMembers] = useState<TeamMember[]>(INITIAL_MEMBERS);
  const [inviteEmail, setInviteEmail] = useState('');

  const seatCap = config.teamSeatCap;
  const seatsUsed = members.length;
  const seatsFull = seatCap !== -1 && seatsUsed >= seatCap;

  const handleInvite = useCallback(() => {
    if (seatsFull) {
      Alert.alert(
        'Seat Limit Reached',
        `Your ${config.name} plan is limited to ${seatCap} team seat${seatCap === 1 ? '' : 's'}. Upgrade to Enterprise for unlimited seats.`,
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/(company)/subscriptions') },
        ],
      );
      return;
    }
    const email = inviteEmail.trim();
    if (!email) return;
    setMembers((prev) => [
      ...prev,
      { id: String(Date.now()), name: email.split('@')[0], email, role: 'Pending Invite', avatarInitials: initialsFor(email) },
    ]);
    setInviteEmail('');
  }, [seatsFull, config.name, seatCap, router, inviteEmail]);

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
          <View style={s.memberList}>
            {members.map((m, i) => (
              <View key={m.id} style={[s.memberRow, i < members.length - 1 && s.memberRowBorder]}>
                <View style={s.avatarCircle}>
                  <Text style={s.avatarInitials}>{m.avatarInitials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.memberName}>{m.name}</Text>
                  <Text style={s.memberEmail}>{m.email}</Text>
                </View>
                <View style={[s.roleBadge, m.role === 'Pending Invite' && s.roleBadgePending]}>
                  <Text style={[s.roleBadgeText, m.role === 'Pending Invite' && s.roleBadgeTextPending]}>{m.role}</Text>
                </View>
              </View>
            ))}
          </View>

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
              editable={!seatsFull}
              style={[s.inviteInput, seatsFull && s.inviteInputDisabled]}
            />
            <Pressable
              onPress={handleInvite}
              style={[s.inviteBtn, seatsFull && s.inviteBtnDisabled]}
            >
              <Ionicons name={seatsFull ? 'lock-closed' : 'person-add'} size={16} color={T.textOnAccent} />
              <Text style={s.inviteBtnText}>Invite Member</Text>
            </Pressable>
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

  inviteCard: { backgroundColor: T.card, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 16, gap: 12, marginBottom: 12 },
  inviteInput: { backgroundColor: T.inputBg, color: T.inputText, borderRadius: 12, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  inviteInputDisabled: { opacity: 0.5 },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.accent, borderRadius: 12, paddingVertical: 14 },
  inviteBtnDisabled: { backgroundColor: T.textMuted, opacity: 0.6 },
  inviteBtnText: { fontSize: 14, fontWeight: '700', color: T.textOnAccent },

  limitNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: T.amberBg, borderRadius: 12, padding: 14 },
  limitNoticeText: { flex: 1, fontSize: 12, color: T.textPrimary, lineHeight: 17 },
});
