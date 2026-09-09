import { useCallback, useEffect, useState, useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette } from '@/lib/theme';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { TIER_CONFIG, Tier } from '@/lib/mock-data';
import { notify } from '@/lib/notify';

// Replaces the old Tinder-style swipe deck over mock roles. Under the real
// architecture, candidates don't browse and swipe an open pool — a company's
// shortlist Accept creates an "introduction", and this screen is that inbox.
// Company identity stays hidden (industry + size band only) until the
// candidate accepts — enforced server-side by get_introduction_preview(),
// not by anything client-side here.

interface PendingIntro {
  introductionId: string;
  status: string;
  sentAt: string;
  responseWindowHours: number;
  roleTitle: string;
  roleFunction: string | null;
  roleTier: Tier;
  companyIndustry: string | null;
  companySizeRange: string | null;
  expired: boolean;
}

// Matches get_introduction_preview()'s RETURNS TABLE columns exactly — no
// generated Supabase types exist in this project, so .rpc() calls are
// otherwise untyped.
interface IntroductionPreviewRow {
  introduction_id: string;
  status: string;
  sent_at: string;
  response_window_hours: number;
  role_title: string;
  role_function: string | null;
  role_tier: Tier;
  company_industry: string | null;
  company_size_range: string | null;
}

interface AcceptedIntro {
  introductionId: string;
  roleTitle: string;
  roleTier: Tier;
  companyName: string;
}

export default function OpportunitiesScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const { candidateId } = useAuth();

  const [pending, setPending] = useState<PendingIntro[] | null>(null);
  const [accepted, setAccepted] = useState<AcceptedIntro[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!candidateId) {
      setPending([]);
      return;
    }

    const { data: intros, error } = await supabase
      .from('introductions')
      .select('id, status, sent_at, response_window_hours')
      .eq('candidate_id', candidateId)
      .order('sent_at', { ascending: false });
    if (error) {
      console.warn('Failed to load introductions:', error.message);
      setPending([]);
      return;
    }

    const sentRows = (intros ?? []).filter((i) => i.status === 'sent');
    const acceptedRows = (intros ?? []).filter((i) => i.status === 'accepted');

    const previews: PendingIntro[] = [];
    for (const row of sentRows) {
      const { data: preview, error: previewErr } = await supabase
        .rpc('get_introduction_preview', { p_introduction_id: row.id })
        .maybeSingle<IntroductionPreviewRow>();
      if (previewErr || !preview) continue;
      const deadline = new Date(preview.sent_at).getTime() + preview.response_window_hours * 60 * 60 * 1000;
      previews.push({
        introductionId: preview.introduction_id,
        status: preview.status,
        sentAt: preview.sent_at,
        responseWindowHours: preview.response_window_hours,
        roleTitle: preview.role_title,
        roleFunction: preview.role_function,
        roleTier: preview.role_tier,
        companyIndustry: preview.company_industry,
        companySizeRange: preview.company_size_range,
        expired: Date.now() > deadline,
      });
    }
    setPending(previews);

    const acceptedDetails: AcceptedIntro[] = [];
    if (acceptedRows.length > 0) {
      const { data: fullIntros } = await supabase
        .from('introductions')
        .select('id, role_id')
        .in('id', acceptedRows.map((r) => r.id));
      for (const intro of fullIntros ?? []) {
        const { data: role } = await supabase.from('roles').select('title, tier, company_id').eq('id', intro.role_id).maybeSingle();
        if (!role) continue;
        const { data: company } = await supabase.from('companies').select('legal_name').eq('id', role.company_id).maybeSingle();
        acceptedDetails.push({
          introductionId: intro.id,
          roleTitle: role.title,
          roleTier: role.tier as Tier,
          companyName: company?.legal_name ?? 'Company',
        });
      }
    }
    setAccepted(acceptedDetails);
  }, [candidateId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const respond = async (introductionId: string, status: 'accepted' | 'declined') => {
    setBusyId(introductionId);
    const { error } = await supabase
      .from('introductions')
      .update({ status, responded_at: new Date().toISOString() })
      .eq('id', introductionId);
    setBusyId(null);
    if (error) {
      notify('Something went wrong', error.message);
      return;
    }
    await load();
  };

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <View style={st.header}>
        <Text style={st.headerTitle}>Introductions</Text>
        <Text style={st.headerSub}>Companies interested in working with you</Text>
      </View>

      {pending === null ? (
        <View style={st.centerFill}>
          <ActivityIndicator color={T.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={st.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} colors={[T.accent]} />}
        >
          {pending.length === 0 && accepted.length === 0 && (
            <View style={st.emptyBlock}>
              <Ionicons name="mail-outline" size={28} color={T.textMuted} />
              <Text style={st.emptyTitle}>No introductions yet</Text>
              <Text style={st.emptySub}>
                When a company wants to connect, it'll show up here. Complete verification to become eligible for matching.
              </Text>
            </View>
          )}

          {pending.filter((p) => !p.expired).map((intro) => {
            const cfg = TIER_CONFIG[intro.roleTier];
            const hoursLeft = Math.max(0, Math.round(
              (new Date(intro.sentAt).getTime() + intro.responseWindowHours * 60 * 60 * 1000 - Date.now()) / (60 * 60 * 1000),
            ));
            return (
              <View key={intro.introductionId} style={st.card}>
                <View style={st.lockedRow}>
                  <View style={st.lockIcon}>
                    <Ionicons name="lock-closed" size={14} color={T.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.lockedLabel}>Company identity revealed after you accept</Text>
                    <Text style={st.metaText}>{intro.companyIndustry ?? 'Unknown industry'} · {intro.companySizeRange ?? 'Size not specified'}</Text>
                  </View>
                </View>
                <Text style={st.roleTitle}>{intro.roleTitle}</Text>
                <View style={[st.tierPill, { backgroundColor: cfg.accent + '14' }]}>
                  <Text style={[st.tierText, { color: cfg.accent }]}>{cfg.label.toUpperCase()}</Text>
                </View>
                <Text style={st.deadlineText}>{hoursLeft}h left to respond</Text>
                <View style={st.actionsRow}>
                  <Pressable style={[st.actionBtn, st.declineBtn]} onPress={() => respond(intro.introductionId, 'declined')} disabled={busyId === intro.introductionId}>
                    <Ionicons name="close" size={18} color={T.danger} />
                    <Text style={st.declineText}>Decline</Text>
                  </Pressable>
                  <Pressable style={[st.actionBtn, st.acceptBtn]} onPress={() => respond(intro.introductionId, 'accepted')} disabled={busyId === intro.introductionId}>
                    <Ionicons name="checkmark" size={18} color={T.emerald} />
                    <Text style={st.acceptText}>Accept</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}

          {accepted.length > 0 && (
            <>
              <Text style={st.sectionLabel}>ACCEPTED</Text>
              {accepted.map((a) => {
                const cfg = TIER_CONFIG[a.roleTier];
                return (
                  <View key={a.introductionId} style={st.card}>
                    <View style={[st.tierPill, { backgroundColor: cfg.accent + '14', alignSelf: 'flex-start', marginBottom: 8 }]}>
                      <Text style={[st.tierText, { color: cfg.accent }]}>{cfg.label.toUpperCase()}</Text>
                    </View>
                    <Text style={st.roleTitle}>{a.roleTitle}</Text>
                    <View style={st.metaRow}>
                      <Ionicons name="business-outline" size={14} color={T.textSecondary} />
                      <Text style={st.metaText}>{a.companyName}</Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.3 },
  headerSub: { fontSize: 14, color: T.textSecondary, marginTop: 4 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: T.textMuted, letterSpacing: 0.5, marginTop: 8, marginBottom: 10 },
  emptyBlock: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: T.textPrimary, marginTop: 12, marginBottom: 6 },
  emptySub: { fontSize: 13, color: T.textSecondary, textAlign: 'center', lineHeight: 19 },
  card: { backgroundColor: T.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: T.border },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  lockIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  lockedLabel: { fontSize: 11, color: T.textMuted, fontWeight: '600', marginBottom: 2 },
  roleTitle: { fontSize: 17, fontWeight: '700', color: T.textPrimary, marginBottom: 8 },
  tierPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 10 },
  tierText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  deadlineText: { fontSize: 12, color: T.amber, fontWeight: '600', marginBottom: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: T.textSecondary },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 12, borderWidth: 1.5 },
  declineBtn: { backgroundColor: T.dangerBg, borderColor: T.danger },
  declineText: { fontSize: 14, fontWeight: '700', color: T.danger },
  acceptBtn: { backgroundColor: T.emeraldBg, borderColor: T.emerald },
  acceptText: { fontSize: 14, fontWeight: '700', color: T.emerald },
});
