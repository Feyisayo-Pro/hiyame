import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import AnimatedPressable from '@/components/AnimatedPressable';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import { useTheme, ThemePalette, DISPLAY_FONT_FAMILY, ELEVATION } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';
import { initials } from '@/lib/format';
import { formatNaira } from '@/lib/currency';
import { DURATION } from '@/lib/motion';
import { openInNewTab } from '@/lib/openLink';
import PageHead from '@/components/PageHead';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';
const FILTERS: StatusFilter[] = ['pending', 'approved', 'rejected', 'all'];

const COMPONENT_LABEL: Record<string, string> = {
  identity: 'Identity',
  video_intro: 'Video Intro',
  skills_assessment: 'Skills Assessment',
  employer_review: 'Employer Review',
  cv_review: 'CV / Portfolio',
};

const PENDING_COMPONENT_TITLE: Record<string, string> = {
  skills_assessment: 'Skills Assessment Requests',
  cv_review: 'CV Review Requests',
  video_intro: 'Video Review Requests',
};

interface VerificationRow { component: string; status: string }
interface Candidate {
  id: string; full_name: string; email: string | null; phone: string | null;
  skill_tags: string[] | null; function_tags: string[] | null;
  experience_level: string | null; location: string | null; remote_preference: string | null;
  tier_preferences: string[] | null; rate_min: number | null; rate_preferred: number | null; rate_max: number | null;
  availability_date: string | null; reliability_score: number | null;
  status: 'pending' | 'approved' | 'rejected'; created_at: string; photo_url: string | null;
  cv_url: string | null; portfolio_url: string | null; video_intro_url: string | null;
  verification: VerificationRow[];
}

async function authedFetch(path: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(path, { ...init, headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` } });
}

export default function AdminCandidatesScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const params = useLocalSearchParams<{ status?: string; component?: string }>();
  // Two distinct lenses sharing one screen: the normal account-status
  // directory (filter chips + search), or — when `component` is in the
  // URL (set by Overview's request cards) — a flat list of candidates with
  // a PENDING verification request for that one component, regardless of
  // their account status. A candidate can be long-since approved and still
  // have a pending CV review, so the account-status filter below can't
  // find these at all.
  const pendingComponent = params.component === 'skills_assessment' || params.component === 'cv_review' || params.component === 'video_intro' ? params.component : null;

  const [status, setStatus] = useState<StatusFilter>((params.status as StatusFilter) ?? 'pending');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    const q = pendingComponent
      ? new URLSearchParams({ view: 'candidates', component: pendingComponent, page: String(page) })
      : new URLSearchParams({ view: 'candidates', status, search, page: String(page) });
    const resp = await authedFetch(`/api/admin-review?${q.toString()}`);
    if (resp.ok) {
      const body = await resp.json();
      setCandidates(body.candidates ?? []);
      setTotal(body.total ?? 0);
    }
  }, [pendingComponent, status, search, page]);

  useEffect(() => { setCandidates(null); load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, search, pendingComponent]);

  const decide = async (type: 'candidate' | 'assessment' | 'cv_review' | 'video_review', id: string, decision: 'approved' | 'rejected') => {
    setBusyId(id);
    const resp = await authedFetch('/api/admin-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, decision }),
    });
    setBusyId(null);
    if (!resp.ok) {
      const body = await resp.json().catch(() => null);
      notify('Could not update', body?.error ?? 'Something went wrong.');
      return;
    }
    notify(
      decision === 'approved' ? 'Approved' : 'Rejected',
      type === 'candidate' ? 'The candidate status has been updated.' : 'The review status has been updated.'
    );
    load();
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));
  const decideType: 'candidate' | 'assessment' | 'cv_review' | 'video_review' =
    pendingComponent === 'skills_assessment' ? 'assessment'
    : pendingComponent === 'cv_review' ? 'cv_review'
    : pendingComponent === 'video_intro' ? 'video_review'
    : 'candidate';

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <PageHead title={pendingComponent ? PENDING_COMPONENT_TITLE[pendingComponent] : 'Candidates'} />
      <View style={st.header}>
        {pendingComponent ? (
          <>
            <AnimatedPressable style={st.backLink} onPress={() => router.replace('/(admin)/candidates')}>
              <AppIcon name="chevron-forward" size={14} color={T.textSecondary} style={{ transform: [{ rotate: '180deg' }] }} />
              <Text style={st.backLinkText}>All Candidates</Text>
            </AnimatedPressable>
            <Text style={st.headerTitle}>{PENDING_COMPONENT_TITLE[pendingComponent]}</Text>
            <Text style={st.headerSub}>{total} awaiting review</Text>
          </>
        ) : (
          <>
            <Text style={st.headerTitle}>Candidates</Text>
            <Text style={st.headerSub}>{total} {status === 'all' ? 'total' : status}</Text>
          </>
        )}
      </View>

      {!pendingComponent && (
        <>
          <View style={st.filterRow}>
            {FILTERS.map((f) => (
              <AnimatedPressable key={f} style={[st.filterChip, status === f && st.filterChipActive]} onPress={() => setStatus(f)}>
                <Text style={[st.filterChipText, status === f && st.filterChipTextActive]}>{f[0].toUpperCase() + f.slice(1)}</Text>
              </AnimatedPressable>
            ))}
          </View>

          <View style={st.searchWrap}>
            <AppIcon name="search" size={16} color={T.textMuted} />
            <TextInput
              style={st.searchInput}
              placeholder="Search by name"
              placeholderTextColor={T.textMuted}
              value={searchInput}
              onChangeText={setSearchInput}
            />
          </View>
        </>
      )}

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {candidates === null ? (
          <View style={st.centerFill}><ActivityIndicator color={T.accent} /></View>
        ) : candidates.length === 0 ? (
          <View style={st.emptyBlock}>
            <AppIcon name="person-outline" size={20} color={T.textMuted} />
            <Text style={st.emptyText}>
              {pendingComponent ? 'Nothing pending here right now.' : `No ${status === 'all' ? '' : status} candidates found${search ? ` for "${search}"` : ''}.`}
            </Text>
          </View>
        ) : (
          candidates.map((c, i) => (
            <SwipeFadeContainer key={c.id} axis="y" offset={14} duration={DURATION.stagger} delay={Math.min(i, 8) * 40}>
              <CandidateRow
                T={T} st={st} candidate={c}
                pendingComponent={pendingComponent}
                expanded={expandedId === c.id}
                onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
                busy={busyId === c.id}
                onApprove={() => decide(decideType, c.id, 'approved')}
                onReject={() => decide(decideType, c.id, 'rejected')}
              />
            </SwipeFadeContainer>
          ))
        )}

        {candidates && candidates.length > 0 && totalPages > 1 && (
          <View style={st.pagination}>
            <AnimatedPressable style={[st.pageBtn, page <= 1 && st.pageBtnDisabled]} onPress={() => page > 1 && setPage(page - 1)} disabled={page <= 1}>
              <AppIcon name="chevron-forward" size={16} color={T.textSecondary} style={{ transform: [{ rotate: '180deg' }] }} />
            </AnimatedPressable>
            <Text style={st.pageText}>Page {page} of {totalPages}</Text>
            <AnimatedPressable style={[st.pageBtn, page >= totalPages && st.pageBtnDisabled]} onPress={() => page < totalPages && setPage(page + 1)} disabled={page >= totalPages}>
              <AppIcon name="chevron-forward" size={16} color={T.textSecondary} />
            </AnimatedPressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CandidateRow({ T, st, candidate: c, pendingComponent, expanded, onToggle, busy, onApprove, onReject }: {
  T: ThemePalette; st: ReturnType<typeof makeStyles>; candidate: Candidate; pendingComponent: 'skills_assessment' | 'cv_review' | 'video_intro' | null;
  expanded: boolean; onToggle: () => void; busy: boolean; onApprove: () => void; onReject: () => void;
}) {
  const passed = new Set(c.verification.filter((v) => v.status === 'passed').map((v) => v.component));
  const statusColor = c.status === 'approved' ? T.emerald : c.status === 'rejected' ? T.danger : T.amber;
  const statusBg = c.status === 'approved' ? T.emeraldBg : c.status === 'rejected' ? T.dangerBg : T.amberBg;

  return (
    <View style={st.card}>
      <AnimatedPressable style={st.cardHeader} onPress={onToggle}>
        <View style={st.avatarWrap}>
          <Text style={st.avatarText}>{initials(c.full_name)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.cardTitle} numberOfLines={1}>{c.full_name}</Text>
          <Text style={st.cardSub} numberOfLines={1}>
            {[c.experience_level, (c.skill_tags ?? []).slice(0, 3).join(', ')].filter(Boolean).join(' · ') || 'No profile details yet'}
          </Text>
        </View>
        {pendingComponent ? (
          <View style={[st.statusPill, { backgroundColor: T.amberBg }]}>
            <Text style={[st.statusPillText, { color: T.amber }]}>account {c.status}</Text>
          </View>
        ) : (
          <View style={[st.statusPill, { backgroundColor: statusBg }]}>
            <Text style={[st.statusPillText, { color: statusColor }]}>{c.status}</Text>
          </View>
        )}
        <AppIcon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={T.textMuted} />
      </AnimatedPressable>

      {/* In the pending-component lens, the review decision is the primary
          action on every row — always visible, not behind expand. Expand
          still works underneath for the full profile. */}
      {pendingComponent && (
        <View style={st.detailActions}>
          <AnimatedPressable style={[st.actionBtn, st.rejectBtn]} onPress={onReject} disabled={busy} accessibilityRole="button" accessibilityLabel={`Reject ${c.full_name}'s ${COMPONENT_LABEL[pendingComponent]}`}>
            {busy ? <ActivityIndicator size="small" color={T.white} /> : (
              <>
                <AppIcon name="close" size={17} color={T.white} />
                <Text style={st.actionBtnText}>Fail</Text>
              </>
            )}
          </AnimatedPressable>
          <AnimatedPressable style={[st.actionBtn, st.approveBtn]} onPress={onApprove} disabled={busy} accessibilityRole="button" accessibilityLabel={`Approve ${c.full_name}'s ${COMPONENT_LABEL[pendingComponent]}`}>
            {busy ? <ActivityIndicator size="small" color={T.white} /> : (
              <>
                <AppIcon name="checkmark" size={17} color={T.white} />
                <Text style={st.actionBtnText}>Pass</Text>
              </>
            )}
          </AnimatedPressable>
        </View>
      )}

      {expanded && (
        <View style={st.detail}>
          <DetailRow T={T} label="Email" value={c.email} />
          <DetailRow T={T} label="Phone" value={c.phone} />
          <DetailRow T={T} label="Location" value={c.location} />
          <DetailRow T={T} label="Remote preference" value={c.remote_preference} />
          <DetailRow T={T} label="Skills" value={(c.skill_tags ?? []).join(', ') || null} />
          <DetailRow T={T} label="Industry" value={(c.function_tags ?? []).join(', ') || null} />
          <DetailRow T={T} label="Tier preference" value={(c.tier_preferences ?? []).join(', ') || null} />
          <DetailRow
            T={T}
            label="Rate"
            value={c.rate_min || c.rate_preferred || c.rate_max
              ? [c.rate_min && `min ${formatNaira(c.rate_min)}`, c.rate_preferred && `pref ${formatNaira(c.rate_preferred)}`, c.rate_max && `max ${formatNaira(c.rate_max)}`].filter(Boolean).join(' · ')
              : null}
          />
          <DetailRow T={T} label="Availability" value={c.availability_date} />
          <DetailRow T={T} label="Reliability score" value={c.reliability_score != null ? `${c.reliability_score}/100` : null} />
          <DetailRow T={T} label="Signed up" value={new Date(c.created_at).toLocaleDateString()} />
          {c.video_intro_url ? (
            <DetailLinkRow T={T} label="Video Intro" url={c.video_intro_url} display="Watch video" />
          ) : (
            <DetailRow T={T} label="Video Intro" value={null} />
          )}
          {c.cv_url ? (
            <DetailLinkRow T={T} label="CV" url={c.cv_url} display="View PDF" />
          ) : (
            <DetailRow T={T} label="CV" value={null} />
          )}
          {c.portfolio_url ? (
            <DetailLinkRow T={T} label="Portfolio" url={c.portfolio_url} display={c.portfolio_url} />
          ) : (
            <DetailRow T={T} label="Portfolio" value={null} />
          )}

          <Text style={st.detailLabel}>Verification</Text>
          <View style={st.verificationRow}>
            {Object.entries(COMPONENT_LABEL).map(([key, label]) => (
              <View key={key} style={[st.verificationChip, passed.has(key) && st.verificationChipDone]}>
                {passed.has(key) && <AppIcon name="checkmark" size={11} color={T.emerald} />}
                <Text style={[st.verificationChipText, passed.has(key) && st.verificationChipTextDone]}>{label}</Text>
              </View>
            ))}
          </View>

          {!pendingComponent && (
            <View style={st.detailActions}>
              <AnimatedPressable style={[st.actionBtn, st.rejectBtn]} onPress={onReject} disabled={busy} accessibilityRole="button" accessibilityLabel={`Reject ${c.full_name}`}>
                {busy ? <ActivityIndicator size="small" color={T.white} /> : (
                  <>
                    <AppIcon name="close" size={17} color={T.white} />
                    <Text style={st.actionBtnText}>Reject</Text>
                  </>
                )}
              </AnimatedPressable>
              <AnimatedPressable style={[st.actionBtn, st.approveBtn]} onPress={onApprove} disabled={busy} accessibilityRole="button" accessibilityLabel={`Approve ${c.full_name}`}>
                {busy ? <ActivityIndicator size="small" color={T.white} /> : (
                  <>
                    <AppIcon name="checkmark" size={17} color={T.white} />
                    <Text style={st.actionBtnText}>Approve</Text>
                  </>
                )}
              </AnimatedPressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function DetailRow({ T, label, value }: { T: ThemePalette; label: string; value: string | null | undefined }) {
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 5 }}>
      <Text style={{ width: 130, fontSize: 12, fontWeight: '600', color: T.textMuted }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: 12.5, color: T.textSecondary }}>{value || '—'}</Text>
    </View>
  );
}

function DetailLinkRow({ T, label, url, display }: { T: ThemePalette; label: string; url: string; display: string }) {
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 5, alignItems: 'center' }}>
      <Text style={{ width: 130, fontSize: 12, fontWeight: '600', color: T.textMuted }}>{label}</Text>
      <AnimatedPressable onPress={() => openInNewTab(url)} style={{ flex: 1 }}>
        <Text style={{ fontSize: 12.5, color: T.accent, fontWeight: '600' }} numberOfLines={1}>{display}</Text>
      </AnimatedPressable>
    </View>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6, alignSelf: 'flex-start' },
  backLinkText: { fontSize: 12.5, fontWeight: '600', color: T.textSecondary },
  headerTitle: { fontSize: 22, fontWeight: '800', color: T.textPrimary, fontFamily: DISPLAY_FONT_FAMILY },
  headerSub: { fontSize: 13, color: T.textMuted, marginTop: 2 },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  filterChipActive: { backgroundColor: T.accentBg, borderColor: T.accentBg20 },
  filterChipText: { fontSize: 12.5, fontWeight: '600', color: T.textSecondary },
  filterChipTextActive: { color: T.accentDim, fontWeight: '700' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 12, marginBottom: 4,
    backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border,
    paddingHorizontal: 12, height: 40,
  },
  searchInput: { flex: 1, fontSize: 13.5, color: T.textPrimary },

  scroll: { padding: 20, paddingTop: 14 },
  centerFill: { paddingVertical: 60, alignItems: 'center' },
  emptyBlock: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 16 },
  emptyText: { fontSize: 13, color: T.textMuted, flex: 1 },

  card: { backgroundColor: T.card, borderRadius: 14, borderWidth: 1, borderColor: T.border, marginBottom: 10, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  avatarWrap: { width: 38, height: 38, borderRadius: 13, backgroundColor: T.accentBg, borderWidth: 1, borderColor: T.accentBg20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '800', color: T.accentDim },
  cardTitle: { fontSize: 14, fontWeight: '700', color: T.textPrimary },
  cardSub: { fontSize: 12, color: T.textSecondary, marginTop: 2 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  statusPillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },

  detail: { paddingHorizontal: 14, paddingBottom: 16, borderTopWidth: 1, borderTopColor: T.border, paddingTop: 12 },
  detailLabel: { fontSize: 11, fontWeight: '700', color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 10, marginBottom: 8 },
  verificationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  verificationChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  verificationChipDone: { backgroundColor: T.emeraldBg, borderColor: T.emerald },
  verificationChipText: { fontSize: 11, fontWeight: '600', color: T.textMuted },
  verificationChipTextDone: { color: T.emerald },

  detailActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingBottom: 14 },
  // Solid fill, not the old pale tinted-outline — a review decision should
  // read as decisive, and two equally pale buttons sitting side by side
  // looked flat and indecisive rather than like a real verdict.
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 10, ...ELEVATION.card },
  rejectBtn: { backgroundColor: T.danger },
  approveBtn: { backgroundColor: T.emerald },
  actionBtnText: { fontSize: 13.5, fontWeight: '700', color: T.white },

  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 10 },
  pageBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  pageBtnDisabled: { opacity: 0.4 },
  pageText: { fontSize: 12.5, fontWeight: '600', color: T.textSecondary },
});
