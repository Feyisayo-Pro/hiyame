import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import { useTheme, ThemePalette, DISPLAY_FONT_FAMILY } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';
import PageHead from '@/components/PageHead';

// Minimal admin review screen for the lightweight account-vetting gate
// (2026-10-02) — not a new persona/auth system, deliberately: sign in as
// whichever existing candidate or company account has an email listed in
// api/admin-review.ts's ADMIN_EMAILS, then open /admin directly. Outside
// the (candidate)/(company)/(auth) route groups, so AuthGate (app/_layout.tsx)
// never redirects away from it regardless of the signed-in user's own role.

interface PendingCompany {
  id: string;
  legal_name: string;
  trading_name: string | null;
  industry: string | null;
  size_range: string | null;
  created_at: string;
}
interface PendingCandidate {
  id: string;
  full_name: string;
  email: string | null;
  skill_tags: string[] | null;
  experience_level: string | null;
  created_at: string;
}

export default function AdminReviewScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);

  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [companies, setCompanies] = useState<PendingCompany[]>([]);
  const [candidates, setCandidates] = useState<PendingCandidate[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) { setLoading(false); setForbidden(true); return; }
    const resp = await fetch('/api/admin-review', { headers: { Authorization: `Bearer ${token}` } });
    if (resp.status === 403 || resp.status === 401) { setLoading(false); setForbidden(true); return; }
    const payload = await resp.json().catch(() => null);
    setCompanies(payload?.companies ?? []);
    setCandidates(payload?.candidates ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const decide = async (type: 'company' | 'candidate', id: string, decision: 'approved' | 'rejected') => {
    setBusyId(id);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const resp = await fetch('/api/admin-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type, id, decision }),
    });
    setBusyId(null);
    if (!resp.ok) {
      const payload = await resp.json().catch(() => null);
      notify('Could not update', payload?.error ?? 'Something went wrong.');
      return;
    }
    notify(decision === 'approved' ? 'Approved' : 'Rejected', 'The account status has been updated.');
    await load();
  };

  if (loading) {
    return (
      <SafeAreaView style={st.container}>
        <View style={st.centerFill}><ActivityIndicator color={T.accent} /></View>
      </SafeAreaView>
    );
  }

  if (forbidden) {
    return (
      <SafeAreaView style={st.container}>
        <PageHead title="Admin" />
        <View style={st.centerFill}>
          <AppIcon name="lock-closed-outline" size={28} color={T.textMuted} />
          <Text style={st.forbiddenText}>Sign in with an admin account to view this page.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <PageHead title="Admin Review" />
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        <Text style={st.headerTitle}>Account Review</Text>
        <Text style={st.headerSub}>Pending companies and candidates — approve to unlock their dashboard.</Text>

        <Text style={st.sectionTitle}>Companies ({companies.length})</Text>
        {companies.length === 0 ? (
          <Text style={st.emptyText}>No companies pending review.</Text>
        ) : (
          companies.map((c) => (
            <View key={c.id} style={st.card}>
              <View style={{ flex: 1 }}>
                <Text style={st.cardTitle}>{c.trading_name || c.legal_name}</Text>
                <Text style={st.cardSub}>{[c.industry, c.size_range].filter(Boolean).join(' · ') || 'No details yet'}</Text>
              </View>
              <View style={st.actions}>
                <Pressable style={[st.actionBtn, st.rejectBtn]} onPress={() => decide('company', c.id, 'rejected')} disabled={busyId === c.id}>
                  <AppIcon name="close" size={16} color={T.danger} />
                </Pressable>
                <Pressable style={[st.actionBtn, st.approveBtn]} onPress={() => decide('company', c.id, 'approved')} disabled={busyId === c.id}>
                  <AppIcon name="checkmark" size={16} color={T.emerald} />
                  <Text style={st.approveText}>Approve</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Text style={st.sectionTitle}>Candidates ({candidates.length})</Text>
        {candidates.length === 0 ? (
          <Text style={st.emptyText}>No candidates pending review.</Text>
        ) : (
          candidates.map((c) => (
            <View key={c.id} style={st.card}>
              <View style={{ flex: 1 }}>
                <Text style={st.cardTitle}>{c.full_name}</Text>
                <Text style={st.cardSub} numberOfLines={1}>
                  {[c.experience_level, (c.skill_tags ?? []).slice(0, 3).join(', ')].filter(Boolean).join(' · ') || 'No profile details yet'}
                </Text>
              </View>
              <View style={st.actions}>
                <Pressable style={[st.actionBtn, st.rejectBtn]} onPress={() => decide('candidate', c.id, 'rejected')} disabled={busyId === c.id}>
                  <AppIcon name="close" size={16} color={T.danger} />
                </Pressable>
                <Pressable style={[st.actionBtn, st.approveBtn]} onPress={() => decide('candidate', c.id, 'approved')} disabled={busyId === c.id}>
                  <AppIcon name="checkmark" size={16} color={T.emerald} />
                  <Text style={st.approveText}>Approve</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  forbiddenText: { fontSize: 14, color: T.textSecondary, textAlign: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: T.textPrimary, fontFamily: DISPLAY_FONT_FAMILY },
  headerSub: { fontSize: 13, color: T.textSecondary, marginTop: 4, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: T.textPrimary, marginTop: 10, marginBottom: 10 },
  emptyText: { fontSize: 13, color: T.textMuted, marginBottom: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: T.card, borderRadius: 14, borderWidth: 1, borderColor: T.border,
    padding: 14, marginBottom: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: T.textPrimary },
  cardSub: { fontSize: 12, color: T.textSecondary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 36, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1.5 },
  rejectBtn: { backgroundColor: T.dangerBg, borderColor: T.danger, width: 36, justifyContent: 'center', paddingHorizontal: 0 },
  approveBtn: { backgroundColor: T.emeraldBg, borderColor: T.emerald },
  approveText: { fontSize: 13, fontWeight: '700', color: T.emerald },
});
