import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import AnimatedPressable from '@/components/AnimatedPressable';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import { useTheme, ThemePalette, DISPLAY_FONT_FAMILY, ELEVATION, RADIUS } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';
import { initials } from '@/lib/format';
import { DURATION } from '@/lib/motion';
import PageHead from '@/components/PageHead';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';
const FILTERS: StatusFilter[] = ['pending', 'approved', 'rejected', 'all'];

interface TeamMember { full_name: string | null; email: string; role: string }
interface Company {
  id: string; legal_name: string; trading_name: string | null; industry: string | null;
  size_range: string | null; hq_location: string | null; website_url: string | null;
  description: string | null; plan_tier: string; status: 'pending' | 'approved' | 'rejected';
  created_at: string; logo_url: string | null; team: TeamMember[];
}

async function authedFetch(path: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(path, { ...init, headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` } });
}

export default function AdminCompaniesScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const params = useLocalSearchParams<{ status?: string }>();

  const [status, setStatus] = useState<StatusFilter>((params.status as StatusFilter) ?? 'pending');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ view: 'companies', status, search, page: String(page) });
    const resp = await authedFetch(`/api/admin-review?${q.toString()}`);
    if (resp.ok) {
      const body = await resp.json();
      setCompanies(body.companies ?? []);
      setTotal(body.total ?? 0);
    }
  }, [status, search, page]);

  useEffect(() => { setCompanies(null); load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, search]);

  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    setBusyId(id);
    const resp = await authedFetch('/api/admin-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'company', id, decision }),
    });
    setBusyId(null);
    if (!resp.ok) {
      const body = await resp.json().catch(() => null);
      notify('Could not update', body?.error ?? 'Something went wrong.');
      return;
    }
    notify(decision === 'approved' ? 'Approved' : 'Rejected', 'The company status has been updated.');
    load();
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <PageHead title="Companies" />
      <View style={st.header}>
        <Text style={st.headerTitle}>Companies</Text>
        <Text style={st.headerSub}>{total} {status === 'all' ? 'total' : status}</Text>
      </View>

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

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {companies === null ? (
          <View style={st.centerFill}><ActivityIndicator color={T.accent} /></View>
        ) : companies.length === 0 ? (
          <View style={st.emptyBlock}>
            <AppIcon name="business-outline" size={20} color={T.textMuted} />
            <Text style={st.emptyText}>No {status === 'all' ? '' : status} companies found{search ? ` for "${search}"` : ''}.</Text>
          </View>
        ) : (
          companies.map((c, i) => (
            <SwipeFadeContainer key={c.id} axis="y" offset={14} duration={DURATION.stagger} delay={Math.min(i, 8) * 40}>
              <CompanyRow
                T={T} st={st} company={c}
                expanded={expandedId === c.id}
                onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
                busy={busyId === c.id}
                onApprove={() => decide(c.id, 'approved')}
                onReject={() => decide(c.id, 'rejected')}
              />
            </SwipeFadeContainer>
          ))
        )}

        {companies && companies.length > 0 && totalPages > 1 && (
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

function CompanyRow({ T, st, company: c, expanded, onToggle, busy, onApprove, onReject }: {
  T: ThemePalette; st: ReturnType<typeof makeStyles>; company: Company;
  expanded: boolean; onToggle: () => void; busy: boolean; onApprove: () => void; onReject: () => void;
}) {
  const statusColor = c.status === 'approved' ? T.emerald : c.status === 'rejected' ? T.danger : T.amber;
  const statusBg = c.status === 'approved' ? T.emeraldBg : c.status === 'rejected' ? T.dangerBg : T.amberBg;
  const name = c.trading_name || c.legal_name;

  return (
    <View style={st.card}>
      <AnimatedPressable style={st.cardHeader} onPress={onToggle}>
        <View style={st.avatarWrap}>
          <Text style={st.avatarText}>{initials(name)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.cardTitle} numberOfLines={1}>{name}</Text>
          <Text style={st.cardSub} numberOfLines={1}>
            {[c.industry, c.size_range].filter(Boolean).join(' · ') || 'No details yet'}
          </Text>
        </View>
        <View style={[st.statusPill, { backgroundColor: statusBg }]}>
          <Text style={[st.statusPillText, { color: statusColor }]}>{c.status}</Text>
        </View>
        <AppIcon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={T.textMuted} />
      </AnimatedPressable>

      {expanded && (
        <View style={st.detail}>
          <DetailRow T={T} label="Legal name" value={c.legal_name} />
          <DetailRow T={T} label="Trading name" value={c.trading_name} />
          <DetailRow T={T} label="Industry" value={c.industry} />
          <DetailRow T={T} label="Company size" value={c.size_range} />
          <DetailRow T={T} label="HQ location" value={c.hq_location} />
          <DetailRow T={T} label="Website" value={c.website_url} />
          <DetailRow T={T} label="Plan" value={c.plan_tier} />
          <DetailRow T={T} label="Description" value={c.description} />
          <DetailRow T={T} label="Signed up" value={new Date(c.created_at).toLocaleDateString()} />

          <Text style={st.detailLabel}>Team ({c.team.length})</Text>
          {c.team.length === 0 ? (
            <Text style={st.noTeamText}>No team members yet.</Text>
          ) : (
            <View style={{ gap: 6, marginBottom: 14 }}>
              {c.team.map((m, i) => (
                <View key={i} style={st.teamRow}>
                  <Text style={st.teamName}>{m.full_name || m.email}</Text>
                  <Text style={st.teamRole}>{m.role}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={st.detailActions}>
            <AnimatedPressable style={[st.actionBtn, st.rejectBtn]} onPress={onReject} disabled={busy} accessibilityRole="button" accessibilityLabel={`Reject ${name}`}>
              {busy ? <ActivityIndicator size="small" color={T.white} /> : (
                <>
                  <AppIcon name="close" size={17} color={T.white} />
                  <Text style={st.actionBtnText}>Reject</Text>
                </>
              )}
            </AnimatedPressable>
            <AnimatedPressable style={[st.actionBtn, st.approveBtn]} onPress={onApprove} disabled={busy} accessibilityRole="button" accessibilityLabel={`Approve ${name}`}>
              {busy ? <ActivityIndicator size="small" color={T.white} /> : (
                <>
                  <AppIcon name="checkmark" size={17} color={T.white} />
                  <Text style={st.actionBtnText}>Approve</Text>
                </>
              )}
            </AnimatedPressable>
          </View>
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

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: T.textPrimary, fontFamily: DISPLAY_FONT_FAMILY },
  headerSub: { fontSize: 13, color: T.textMuted, marginTop: 2 },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.chip, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  filterChipActive: { backgroundColor: T.accentBg, borderColor: T.accentBg20 },
  filterChipText: { fontSize: 12.5, fontWeight: '600', color: T.textSecondary },
  filterChipTextActive: { color: T.accentDim, fontWeight: '700' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 12, marginBottom: 4,
    backgroundColor: T.surface, borderRadius: RADIUS.control, borderWidth: 1, borderColor: T.border,
    paddingHorizontal: 12, height: 40,
  },
  searchInput: { flex: 1, fontSize: 13.5, color: T.textPrimary },

  scroll: { padding: 20, paddingTop: 14 },
  centerFill: { paddingVertical: 60, alignItems: 'center' },
  emptyBlock: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.surface, borderRadius: RADIUS.card, borderWidth: 1, borderColor: T.border, padding: 16 },
  emptyText: { fontSize: 13, color: T.textMuted, flex: 1 },

  card: { backgroundColor: T.card, borderRadius: RADIUS.card, borderWidth: 1, borderColor: T.border, marginBottom: 10, overflow: 'hidden', ...ELEVATION.card },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  avatarWrap: { width: 38, height: 38, borderRadius: RADIUS.control, backgroundColor: T.accentBg, borderWidth: 1, borderColor: T.accentBg20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '800', color: T.accentDim },
  cardTitle: { fontSize: 14, fontWeight: '700', color: T.textPrimary },
  cardSub: { fontSize: 12, color: T.textSecondary, marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.chip },
  statusPillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },

  detail: { paddingHorizontal: 14, paddingBottom: 16, borderTopWidth: 1, borderTopColor: T.border, paddingTop: 12 },
  detailLabel: { fontSize: 11, fontWeight: '700', color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 10, marginBottom: 8 },
  noTeamText: { fontSize: 12.5, color: T.textMuted, marginBottom: 14 },
  teamRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: T.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  teamName: { fontSize: 12.5, fontWeight: '600', color: T.textPrimary },
  teamRole: { fontSize: 11, color: T.textMuted, textTransform: 'capitalize' },

  detailActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: RADIUS.control, ...ELEVATION.card },
  rejectBtn: { backgroundColor: T.danger },
  approveBtn: { backgroundColor: T.emerald },
  actionBtnText: { fontSize: 13.5, fontWeight: '700', color: T.white },

  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 10 },
  pageBtn: { width: 32, height: 32, borderRadius: RADIUS.control, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  pageBtnDisabled: { opacity: 0.4 },
  pageText: { fontSize: 12.5, fontWeight: '600', color: T.textSecondary },
});
