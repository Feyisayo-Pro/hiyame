import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import AppIcon, { AppIconName } from '@/components/AppIcon';
import { useTheme, ThemePalette, DISPLAY_FONT_FAMILY } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';
import { initials } from '@/lib/format';
import PageHead from '@/components/PageHead';
import AnimatedPressable from '@/components/AnimatedPressable';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import { DURATION } from '@/lib/motion';

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
interface AssessmentRequest {
  id: string;
  fullName: string;
  email: string | null;
  skillTags: string[] | null;
  experienceLevel: string | null;
  requestedAt: string;
}

// One accent per queue — ties each section to a color the rest of the app
// already uses for that same meaning (accent = company/work, indigo =
// candidate/people, amber = pending/in-review), rather than three identical
// gray sections a reviewer has to tell apart by reading the heading.
const SECTION_META: Record<'company' | 'candidate' | 'assessment', { icon: AppIconName; colorKey: 'accent' | 'indigo' | 'amber'; bgKey: 'accentBg' | 'indigoBg' | 'amberBg' }> = {
  company: { icon: 'business-outline', colorKey: 'accent', bgKey: 'accentBg' },
  candidate: { icon: 'person-outline', colorKey: 'indigo', bgKey: 'indigoBg' },
  assessment: { icon: 'shield-checkmark-outline', colorKey: 'amber', bgKey: 'amberBg' },
};

export default function AdminReviewScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);

  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [companies, setCompanies] = useState<PendingCompany[]>([]);
  const [candidates, setCandidates] = useState<PendingCandidate[]>([]);
  const [assessmentRequests, setAssessmentRequests] = useState<AssessmentRequest[]>([]);
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
    setAssessmentRequests(payload?.assessmentRequests ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const decide = async (type: 'company' | 'candidate' | 'assessment', id: string, decision: 'approved' | 'rejected') => {
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
    notify(decision === 'approved' ? 'Approved' : 'Rejected', type === 'assessment' ? 'The skills assessment status has been updated.' : 'The account status has been updated.');
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
          <View style={st.forbiddenIconWrap}>
            <AppIcon name="lock-closed-outline" size={26} color={T.textMuted} />
          </View>
          <Text style={st.forbiddenText}>Sign in with an admin account to view this page.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalPending = companies.length + candidates.length + assessmentRequests.length;

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <PageHead title="Admin Review" />
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        <SwipeFadeContainer axis="y" offset={16}>
          <View style={st.header}>
            <View style={{ flex: 1 }}>
              <Text style={st.headerTitle}>Account Review</Text>
              <Text style={st.headerSub}>Pending companies, candidates, and skills assessment requests</Text>
            </View>
            <View style={st.totalBadge}>
              <Text style={st.totalBadgeText}>{totalPending}</Text>
            </View>
          </View>
        </SwipeFadeContainer>

        <Section
          T={T} st={st} kind="company" title="Companies" count={companies.length}
          emptyIcon="business-outline" emptyText="No companies pending review"
        >
          {companies.map((c, i) => (
            <Row
              key={c.id} T={T} st={st} index={i}
              name={c.trading_name || c.legal_name}
              meta={[c.industry, c.size_range].filter(Boolean).join(' · ') || 'No details yet'}
              busy={busyId === c.id}
              approveLabel="Approve"
              onApprove={() => decide('company', c.id, 'approved')}
              onReject={() => decide('company', c.id, 'rejected')}
              rejectLabel={`Reject ${c.trading_name || c.legal_name}`}
            />
          ))}
        </Section>

        <Section
          T={T} st={st} kind="candidate" title="Candidates" count={candidates.length}
          emptyIcon="person-outline" emptyText="No candidates pending review"
        >
          {candidates.map((c, i) => (
            <Row
              key={c.id} T={T} st={st} index={i}
              name={c.full_name}
              meta={[c.experience_level, (c.skill_tags ?? []).slice(0, 3).join(', ')].filter(Boolean).join(' · ') || 'No profile details yet'}
              busy={busyId === c.id}
              approveLabel="Approve"
              onApprove={() => decide('candidate', c.id, 'approved')}
              onReject={() => decide('candidate', c.id, 'rejected')}
              rejectLabel={`Reject ${c.full_name}`}
            />
          ))}
        </Section>

        <Section
          T={T} st={st} kind="assessment" title="Skills Assessment Requests" count={assessmentRequests.length}
          emptyIcon="shield-checkmark-outline" emptyText="No assessment requests waiting on review"
        >
          {assessmentRequests.map((c, i) => (
            <Row
              key={c.id} T={T} st={st} index={i}
              name={c.fullName}
              meta={[c.experienceLevel, (c.skillTags ?? []).slice(0, 3).join(', ')].filter(Boolean).join(' · ') || c.email || 'No profile details yet'}
              busy={busyId === c.id}
              approveLabel="Passed"
              onApprove={() => decide('assessment', c.id, 'approved')}
              onReject={() => decide('assessment', c.id, 'rejected')}
              rejectLabel={`Mark ${c.fullName}'s assessment failed`}
            />
          ))}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ T, st, kind, title, count, emptyIcon, emptyText, children }: {
  T: ThemePalette; st: ReturnType<typeof makeStyles>;
  kind: 'company' | 'candidate' | 'assessment'; title: string; count: number;
  emptyIcon: AppIconName; emptyText: string; children: React.ReactNode;
}) {
  const meta = SECTION_META[kind];
  return (
    <SwipeFadeContainer axis="y" offset={16} delay={200}>
      <View style={st.sectionHeader}>
        <View style={[st.sectionIconWrap, { backgroundColor: T[meta.bgKey] }]}>
          <AppIcon name={meta.icon} size={16} color={T[meta.colorKey]} />
        </View>
        <Text style={st.sectionTitle}>{title}</Text>
        <View style={st.sectionCountPill}>
          <Text style={st.sectionCountText}>{count}</Text>
        </View>
      </View>
      {count === 0 ? (
        <View style={st.emptyBlock}>
          <AppIcon name={emptyIcon} size={20} color={T.textMuted} />
          <Text style={st.emptyText}>{emptyText}</Text>
        </View>
      ) : (
        <View style={st.sectionList}>{children}</View>
      )}
    </SwipeFadeContainer>
  );
}

function Row({ T, st, index, name, meta, busy, approveLabel, onApprove, onReject, rejectLabel }: {
  T: ThemePalette; st: ReturnType<typeof makeStyles>; index: number;
  name: string; meta: string; busy: boolean; approveLabel: string;
  onApprove: () => void; onReject: () => void; rejectLabel: string;
}) {
  return (
    <SwipeFadeContainer axis="y" offset={14} duration={DURATION.stagger} delay={Math.min(index, 8) * 40}>
      <View style={st.card}>
        <View style={st.avatarWrap}>
          <Text style={st.avatarText}>{initials(name)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.cardTitle} numberOfLines={1}>{name}</Text>
          <Text style={st.cardSub} numberOfLines={1}>{meta}</Text>
        </View>
        <View style={st.statusPill}>
          <Text style={st.statusPillText}>Pending</Text>
        </View>
        <View style={st.actions}>
          <AnimatedPressable style={[st.actionBtn, st.rejectBtn]} onPress={onReject} disabled={busy} hitSlop={4} accessibilityRole="button" accessibilityLabel={rejectLabel}>
            <AppIcon name="close" size={16} color={T.danger} />
          </AnimatedPressable>
          <AnimatedPressable style={[st.actionBtn, st.approveBtn]} onPress={onApprove} disabled={busy}>
            {busy ? <ActivityIndicator size="small" color={T.emerald} /> : (
              <>
                <AppIcon name="checkmark" size={16} color={T.emerald} />
                <Text style={st.approveText}>{approveLabel}</Text>
              </>
            )}
          </AnimatedPressable>
        </View>
      </View>
    </SwipeFadeContainer>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  forbiddenIconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  forbiddenText: { fontSize: 14, color: T.textSecondary, textAlign: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 22 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: T.textPrimary, fontFamily: DISPLAY_FONT_FAMILY, letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: T.textSecondary, marginTop: 4, lineHeight: 18 },
  totalBadge: { minWidth: 32, height: 32, paddingHorizontal: 8, borderRadius: 16, backgroundColor: T.accentSolid, alignItems: 'center', justifyContent: 'center' },
  totalBadgeText: { fontSize: 14, fontWeight: '800', color: T.textOnAccent },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, marginBottom: 12 },
  sectionIconWrap: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: T.textPrimary },
  sectionCountPill: { minWidth: 24, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  sectionCountText: { fontSize: 12, fontWeight: '700', color: T.textSecondary },
  sectionList: { gap: 10 },

  emptyBlock: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border,
    padding: 16, marginBottom: 4,
  },
  emptyText: { fontSize: 13, color: T.textMuted, flex: 1 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: T.card, borderRadius: 14, borderWidth: 1, borderColor: T.border,
    padding: 14,
  },
  avatarWrap: {
    width: 38, height: 38, borderRadius: 13, backgroundColor: T.accentBg,
    borderWidth: 1, borderColor: T.accentBg20,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '800', color: T.accentDim },
  cardTitle: { fontSize: 14, fontWeight: '700', color: T.textPrimary },
  cardSub: { fontSize: 12, color: T.textSecondary, marginTop: 2 },
  statusPill: { backgroundColor: T.amberBg, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  statusPillText: { fontSize: 10, fontWeight: '700', color: T.amber, textTransform: 'uppercase', letterSpacing: 0.3 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 36, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1.5 },
  rejectBtn: { backgroundColor: T.dangerBg, borderColor: T.danger, width: 36, justifyContent: 'center', paddingHorizontal: 0 },
  approveBtn: { backgroundColor: T.emeraldBg, borderColor: T.emerald, minWidth: 36, justifyContent: 'center' },
  approveText: { fontSize: 13, fontWeight: '700', color: T.emerald },
});
