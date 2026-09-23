import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette, DISPLAY_FONT_FAMILY } from '@/lib/theme';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';
import ScreenFrame from '@/components/ScreenFrame';
import PageHead from '@/components/PageHead';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import { SkeletonRow } from '@/components/Skeleton';
import { usePersonaGuard } from '@/lib/usePersonaGuard';

// Real interview scheduling — a company picks from candidates they already
// have a real relationship with (any introduction), sets a time and a
// meeting link. "Google Meet" is a label on the same URL field, not a real
// Calendar API integration (no OAuth/credentials for that exist in this
// app) — the company pastes their own generated Meet link, same as most
// lightly-scoped ATS tools actually do this.

interface Interview {
  id: string;
  candidateId: string;
  candidateName: string;
  roleTitle: string | null;
  scheduledAt: string;
  durationMinutes: number;
  meetingType: 'link' | 'google_meet';
  meetingUrl: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';
}

interface CandidateOption {
  id: string;
  name: string;
  roleId: string | null;
  roleTitle: string | null;
}

const TABS = ['Upcoming', 'Completed', 'Cancelled', 'All'] as const;
type Tab = typeof TABS[number];

export default function CompanyInterviewsScreen() {
  usePersonaGuard('company');
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const { companyId } = useAuth();

  const [tab, setTab] = useState<Tab>('Upcoming');
  const [interviews, setInterviews] = useState<Interview[] | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) { setInterviews([]); return; }
    const { data, error } = await supabase
      .from('interviews')
      .select('id, candidate_id, scheduled_at, duration_minutes, meeting_type, meeting_url, status, candidates(full_name), roles(title)')
      .eq('company_id', companyId)
      .order('scheduled_at', { ascending: true });
    if (error) {
      console.warn('Failed to load interviews:', error.message);
      setInterviews([]);
      return;
    }
    setInterviews((data ?? []).map((r: any) => ({
      id: r.id,
      candidateId: r.candidate_id,
      candidateName: r.candidates?.full_name ?? 'Candidate',
      roleTitle: r.roles?.title ?? null,
      scheduledAt: r.scheduled_at,
      durationMinutes: r.duration_minutes,
      meetingType: r.meeting_type,
      meetingUrl: r.meeting_url,
      status: r.status,
    })));
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const filtered = (interviews ?? []).filter((i) => {
    if (tab === 'All') return true;
    if (tab === 'Upcoming') return i.status === 'scheduled' && new Date(i.scheduledAt).getTime() >= Date.now();
    if (tab === 'Completed') return i.status === 'completed';
    if (tab === 'Cancelled') return i.status === 'cancelled';
    return true;
  });

  const setStatus = async (id: string, status: Interview['status']) => {
    const { error } = await supabase.from('interviews').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { notify('Could not update', error.message); return; }
    load();
  };

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <PageHead title="Interviews" />
      <ScreenFrame>
        <View style={st.header}>
          <View style={{ flex: 1 }}>
            <Text style={st.headerTitle}>Interviews</Text>
            <Text style={st.headerSub}>{filtered.length} {tab.toLowerCase()}</Text>
          </View>
          <Pressable style={st.scheduleBtn} onPress={() => setShowSchedule(true)}>
            <AppIcon name="add-circle-outline" size={18} color={T.textOnAccent} />
            <Text style={st.scheduleBtnText}>Schedule</Text>
          </Pressable>
        </View>

        <View style={st.tabRow}>
          {TABS.map((t) => (
            <Pressable key={t} style={[st.tab, tab === t && st.tabActive]} onPress={() => setTab(t)}>
              <Text style={[st.tabText, tab === t && st.tabTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
          <SwipeFadeContainer>
            {interviews === null ? (
              <>
                <SkeletonRow /><SkeletonRow /><SkeletonRow />
              </>
            ) : filtered.length === 0 ? (
              <View style={st.emptyBlock}>
                <AppIcon name="calendar-outline" size={28} color={T.textMuted} />
                <Text style={st.emptyTitle}>No {tab.toLowerCase()} interviews</Text>
                <Pressable style={st.scheduleBtn} onPress={() => setShowSchedule(true)}>
                  <AppIcon name="add-circle-outline" size={18} color={T.textOnAccent} />
                  <Text style={st.scheduleBtnText}>Schedule One</Text>
                </Pressable>
              </View>
            ) : (
              filtered.map((i) => (
                <View key={i.id} style={st.row}>
                  <View style={st.rowIconWrap}>
                    <AppIcon name={i.meetingType === 'google_meet' ? 'videocam-outline' : 'link'} size={18} color={T.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.rowName}>{i.candidateName}</Text>
                    <Text style={st.rowMeta}>
                      {i.roleTitle ? `${i.roleTitle} · ` : ''}{new Date(i.scheduledAt).toLocaleString()} · {i.durationMinutes}min
                    </Text>
                  </View>
                  {i.status === 'scheduled' ? (
                    <View style={st.rowActions}>
                      {i.meetingUrl && (
                        <Pressable style={st.rowActionBtn} onPress={() => notify('Meeting link', i.meetingUrl!)}>
                          <AppIcon name="link" size={16} color={T.accent} />
                        </Pressable>
                      )}
                      <Pressable style={st.rowActionBtn} onPress={() => setStatus(i.id, 'completed')}>
                        <AppIcon name="checkmark-circle-outline" size={16} color={T.emerald} />
                      </Pressable>
                      <Pressable style={st.rowActionBtn} onPress={() => setStatus(i.id, 'cancelled')}>
                        <AppIcon name="close-circle-outline" size={16} color={T.danger} />
                      </Pressable>
                    </View>
                  ) : (
                    <View style={[st.statusPill, { backgroundColor: i.status === 'completed' ? T.emeraldBg : T.surface }]}>
                      <Text style={[st.statusPillText, { color: i.status === 'completed' ? T.emerald : T.textMuted }]}>{i.status}</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </SwipeFadeContainer>
        </ScrollView>
      </ScreenFrame>

      <ScheduleInterviewModal
        visible={showSchedule}
        companyId={companyId}
        onClose={() => setShowSchedule(false)}
        onScheduled={() => { setShowSchedule(false); load(); }}
      />
    </SafeAreaView>
  );
}

function ScheduleInterviewModal({ visible, companyId, onClose, onScheduled }: {
  visible: boolean; companyId: string | null; onClose: () => void; onScheduled: () => void;
}) {
  const T = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CandidateOption | null>(null);
  const [meetingType, setMeetingType] = useState<'link' | 'google_meet'>('link');
  const [dateTime, setDateTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !companyId) return;
    // Scoped to candidates this company already has a real relationship
    // with (any introduction) — not a free search across every candidate
    // on the platform.
    supabase
      .from('introductions')
      .select('candidate_id, role_id, candidates(full_name), roles(title)')
      .eq('roles.company_id', companyId)
      .then(({ data }) => {
        const seen = new Set<string>();
        const opts: CandidateOption[] = [];
        for (const row of (data ?? []) as any[]) {
          if (!row.candidates || seen.has(row.candidate_id)) continue;
          seen.add(row.candidate_id);
          opts.push({ id: row.candidate_id, name: row.candidates.full_name, roleId: row.role_id, roleTitle: row.roles?.title ?? null });
        }
        setCandidates(opts);
      });
  }, [visible, companyId]);

  const reset = () => {
    setSearch(''); setSelected(null); setMeetingType('link'); setDateTime(''); setDuration('60'); setMeetingUrl('');
  };
  const close = () => { if (saving) return; reset(); onClose(); };

  const filteredCandidates = candidates.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const submit = async () => {
    if (!selected) { notify('Pick a candidate', 'Search and select who this interview is with.'); return; }
    const scheduledAt = new Date(dateTime);
    if (!dateTime || isNaN(scheduledAt.getTime())) { notify('Invalid date & time', 'Enter a real date and time.'); return; }
    if (!companyId) return;
    setSaving(true);
    const { error } = await supabase.from('interviews').insert({
      company_id: companyId,
      candidate_id: selected.id,
      role_id: selected.roleId,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: Number(duration) || 60,
      meeting_type: meetingType,
      meeting_url: meetingUrl.trim() || null,
    });
    setSaving(false);
    if (error) { notify('Could not schedule', error.message); return; }
    notify('Interview scheduled', `${selected.name} — ${scheduledAt.toLocaleString()}`);
    reset();
    onScheduled();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.headerRow}>
            <Text style={s.title}>Schedule Interview</Text>
            <Pressable onPress={close} hitSlop={8}><AppIcon name="close" size={22} color={T.textMuted} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={s.label}>Candidate</Text>
            {selected ? (
              <View style={s.selectedCandidate}>
                <Text style={s.selectedCandidateText}>{selected.name}{selected.roleTitle ? ` · ${selected.roleTitle}` : ''}</Text>
                <Pressable onPress={() => setSelected(null)}><AppIcon name="close" size={16} color={T.textMuted} /></Pressable>
              </View>
            ) : (
              <>
                <TextInput style={s.input} value={search} onChangeText={setSearch} placeholder="Search by name..." placeholderTextColor={T.textMuted} />
                {search.length > 0 && filteredCandidates.slice(0, 6).map((c) => (
                  <Pressable key={c.id} style={s.candidateOption} onPress={() => setSelected(c)}>
                    <Text style={s.candidateOptionText}>{c.name}{c.roleTitle ? ` · ${c.roleTitle}` : ''}</Text>
                  </Pressable>
                ))}
              </>
            )}

            <Text style={s.label}>Meeting Type</Text>
            <View style={s.typeRow}>
              <Pressable style={[s.typeBtn, meetingType === 'link' && s.typeBtnActive]} onPress={() => setMeetingType('link')}>
                <AppIcon name="link" size={16} color={meetingType === 'link' ? T.textOnAccent : T.textSecondary} />
                <Text style={[s.typeBtnText, meetingType === 'link' && s.typeBtnTextActive]}>Meeting Link</Text>
              </Pressable>
              <Pressable style={[s.typeBtn, meetingType === 'google_meet' && s.typeBtnActive]} onPress={() => setMeetingType('google_meet')}>
                <AppIcon name="videocam-outline" size={16} color={meetingType === 'google_meet' ? T.textOnAccent : T.textSecondary} />
                <Text style={[s.typeBtnText, meetingType === 'google_meet' && s.typeBtnTextActive]}>Google Meet</Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 2 }}>
                <Text style={s.label}>Date & Time</Text>
                <TextInput style={s.input} value={dateTime} onChangeText={setDateTime} placeholder="YYYY-MM-DD HH:MM" placeholderTextColor={T.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Duration (min)</Text>
                <TextInput style={s.input} value={duration} onChangeText={setDuration} keyboardType="numeric" placeholder="60" placeholderTextColor={T.textMuted} />
              </View>
            </View>

            <Text style={s.label}>{meetingType === 'google_meet' ? 'Google Meet URL' : 'Meeting URL'}</Text>
            <TextInput
              style={s.input}
              value={meetingUrl}
              onChangeText={setMeetingUrl}
              placeholder={meetingType === 'google_meet' ? 'https://meet.google.com/...' : 'https://...'}
              placeholderTextColor={T.textMuted}
              autoCapitalize="none"
            />

            <Pressable style={[s.submitBtn, saving && { opacity: 0.7 }]} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator color={T.textOnAccent} /> : <Text style={s.submitBtnText}>Schedule Interview</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: T.textPrimary, fontFamily: DISPLAY_FONT_FAMILY },
  headerSub: { fontSize: 13, color: T.textMuted, marginTop: 2 },
  scheduleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.accentSolid, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  scheduleBtnText: { color: T.textOnAccent, fontWeight: '700', fontSize: 13 },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 16, flexWrap: 'wrap' },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  tabActive: { backgroundColor: T.accentBg, borderColor: T.accent },
  tabText: { fontSize: 13, fontWeight: '700', color: T.textSecondary },
  tabTextActive: { color: T.accentDim },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  emptyBlock: { alignItems: 'center', gap: 14, paddingVertical: 48 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: T.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.card, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
  rowIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: T.accentBg, alignItems: 'center', justifyContent: 'center' },
  rowName: { fontSize: 14, fontWeight: '700', color: T.textPrimary },
  rowMeta: { fontSize: 12, color: T.textMuted, marginTop: 2 },
  rowActions: { flexDirection: 'row', gap: 6 },
  rowActionBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusPillText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  overlay: { flex: 1, backgroundColor: T.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 440, maxHeight: '90%', backgroundColor: T.card, borderRadius: 20, padding: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '800', color: T.textPrimary },
  label: { fontSize: 12, fontWeight: '700', color: T.textSecondary, marginBottom: 8, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: { borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: T.textPrimary },
  selectedCandidate: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.accentBg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: T.accent },
  selectedCandidateText: { fontSize: 14, fontWeight: '600', color: T.accentDim },
  candidateOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: T.border },
  candidateOptionText: { fontSize: 14, color: T.textPrimary },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  typeBtnActive: { backgroundColor: T.accentSolid, borderColor: T.accentSolid },
  typeBtnText: { fontSize: 13, fontWeight: '700', color: T.textSecondary },
  typeBtnTextActive: { color: T.textOnAccent },
  submitBtn: { backgroundColor: T.accentSolid, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 22, marginBottom: 6 },
  submitBtnText: { color: T.textOnAccent, fontWeight: '700', fontSize: 15 },
});
