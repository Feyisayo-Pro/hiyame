import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette, DISPLAY_FONT_FAMILY } from '@/lib/theme';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';
import { notifyInterviewScheduled } from '@/lib/requestNotify';
import { formatInterviewTime } from '@/lib/format';
import { openInNewTab } from '@/lib/openLink';
import ScreenFrame from '@/components/ScreenFrame';
import PageHead from '@/components/PageHead';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import { SkeletonRow } from '@/components/Skeleton';
import { usePersonaGuard } from '@/lib/usePersonaGuard';
import { useAccountStatus } from '@/lib/useAccountStatus';
import PendingAccountBlock from '@/components/PendingAccountBlock';
import AnimatedPressable from '@/components/AnimatedPressable';
import RescheduleInterviewModal from '@/components/RescheduleInterviewModal';

const MAX_RESCHEDULES = 2;

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
  companyRescheduleCount: number;
}

interface CandidateOption {
  id: string;
  name: string;
  roleId: string | null;
  roleTitle: string | null;
}

interface RoleOption {
  id: string;
  title: string;
}

const TABS = ['Upcoming', 'Completed', 'Cancelled', 'All'] as const;
type Tab = typeof TABS[number];

export default function CompanyInterviewsScreen() {
  usePersonaGuard('company');
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const { companyId } = useAuth();
  const companyStatus = useAccountStatus('companies', companyId);
  const companyBlocked = companyStatus === 'pending' || companyStatus === 'rejected';

  const [tab, setTab] = useState<Tab>('Upcoming');
  const [interviews, setInterviews] = useState<Interview[] | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Interview | null>(null);

  const load = useCallback(async () => {
    if (!companyId) { setInterviews([]); return; }
    const { data, error } = await supabase
      .from('interviews')
      .select('id, candidate_id, scheduled_at, duration_minutes, meeting_type, meeting_url, status, company_reschedule_count, candidates(full_name), roles(title)')
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
      companyRescheduleCount: r.company_reschedule_count ?? 0,
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
          {!companyBlocked && (
            <AnimatedPressable style={st.scheduleBtn} onPress={() => setShowSchedule(true)}>
              <AppIcon name="add-circle-outline" size={18} color={T.textOnAccent} />
              <Text style={st.scheduleBtnText}>Schedule</Text>
            </AnimatedPressable>
          )}
        </View>

        {companyBlocked ? (
          <PendingAccountBlock status={companyStatus as 'pending' | 'rejected'} action="schedule interviews" />
        ) : (
        <>
        <View style={st.tabRow}>
          {TABS.map((t) => (
            <AnimatedPressable key={t} style={[st.tab, tab === t && st.tabActive]} onPress={() => setTab(t)}>
              <Text style={[st.tabText, tab === t && st.tabTextActive]}>{t}</Text>
            </AnimatedPressable>
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
                <AnimatedPressable style={st.scheduleBtn} onPress={() => setShowSchedule(true)}>
                  <AppIcon name="add-circle-outline" size={18} color={T.textOnAccent} />
                  <Text style={st.scheduleBtnText}>Schedule One</Text>
                </AnimatedPressable>
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
                      {i.roleTitle ? `${i.roleTitle} · ` : ''}{formatInterviewTime(i.scheduledAt)} · {i.durationMinutes}min
                    </Text>
                  </View>
                  {i.status === 'scheduled' ? (
                    <View style={st.rowActions}>
                      {i.meetingUrl && (
                        <AnimatedPressable style={st.rowActionBtn} onPress={() => openInNewTab(i.meetingUrl!)} hitSlop={7} accessibilityRole="button" accessibilityLabel="Open meeting link in a new tab">
                          <AppIcon name="link" size={16} color={T.accent} />
                        </AnimatedPressable>
                      )}
                      {i.companyRescheduleCount < MAX_RESCHEDULES && (
                        <AnimatedPressable style={st.rowActionBtn} onPress={() => setRescheduleTarget(i)} hitSlop={7} accessibilityRole="button" accessibilityLabel="Reschedule interview">
                          <AppIcon name="time-outline" size={16} color={T.amber} />
                        </AnimatedPressable>
                      )}
                      <AnimatedPressable style={st.rowActionBtn} onPress={() => setStatus(i.id, 'completed')} hitSlop={7} accessibilityRole="button" accessibilityLabel="Mark interview completed">
                        <AppIcon name="checkmark-circle-outline" size={16} color={T.emerald} />
                      </AnimatedPressable>
                      <AnimatedPressable style={st.rowActionBtn} onPress={() => setStatus(i.id, 'cancelled')} hitSlop={7} accessibilityRole="button" accessibilityLabel="Cancel interview">
                        <AppIcon name="close-circle-outline" size={16} color={T.danger} />
                      </AnimatedPressable>
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
        </>
        )}
      </ScreenFrame>

      <ScheduleInterviewModal
        visible={showSchedule}
        companyId={companyId}
        onClose={() => setShowSchedule(false)}
        onScheduled={() => { setShowSchedule(false); load(); }}
      />

      <RescheduleInterviewModal
        visible={rescheduleTarget != null}
        interviewId={rescheduleTarget?.id ?? null}
        remaining={MAX_RESCHEDULES - (rescheduleTarget?.companyRescheduleCount ?? 0)}
        onClose={() => setRescheduleTarget(null)}
        onRescheduled={() => { setRescheduleTarget(null); load(); }}
      />
    </SafeAreaView>
  );
}

function ScheduleInterviewModal({ visible, companyId, onClose, onScheduled }: {
  visible: boolean; companyId: string | null; onClose: () => void; onScheduled: () => void;
}) {
  const T = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [candidatesLoaded, setCandidatesLoaded] = useState(false);
  const [selected, setSelected] = useState<CandidateOption | null>(null);
  const [meetingType, setMeetingType] = useState<'link' | 'google_meet'>('link');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Role dropdown — this company's own posted roles, newest first.
  useEffect(() => {
    if (!visible || !companyId) return;
    supabase
      .from('roles')
      .select('id, title')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setRoles((data ?? []) as RoleOption[]));
  }, [visible, companyId]);

  // Candidate dropdown — only candidates with an *accepted* introduction for
  // the selected role. Scoping by role_id (already known to belong to this
  // company, since it came from the roles query above) makes this simpler
  // and safer than the old flat "any introduction across any role" search:
  // no join-based company filter needed, and it can't surface a candidate
  // who accepted a different role or hasn't accepted at all.
  useEffect(() => {
    setSelected(null);
    setCandidates([]);
    setCandidatesLoaded(false);
    if (!selectedRoleId) return;
    supabase
      .from('introductions')
      .select('candidate_id, candidates(full_name)')
      .eq('role_id', selectedRoleId)
      .eq('status', 'accepted')
      .then(({ data }) => {
        const roleTitle = roles.find((r) => r.id === selectedRoleId)?.title ?? null;
        const opts: CandidateOption[] = ((data ?? []) as any[])
          .filter((row) => row.candidates)
          .map((row) => ({ id: row.candidate_id, name: row.candidates.full_name, roleId: selectedRoleId, roleTitle }));
        setCandidates(opts);
        setCandidatesLoaded(true);
      });
  }, [selectedRoleId, roles]);

  const reset = () => {
    setSelectedRoleId(null); setSelected(null); setMeetingType('link'); setDate(''); setTime(''); setMeetingUrl('');
  };
  const close = () => { if (saving) return; reset(); onClose(); };

  const submit = async () => {
    if (!selected) { notify('Pick a candidate', 'Select who this interview is with.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) { notify('Invalid date', 'Enter the date as YYYY-MM-DD.'); return; }
    if (!/^\d{1,2}:\d{2}$/.test(time.trim())) { notify('Invalid time', 'Enter the time as HH:MM (24-hour).'); return; }
    const scheduledAt = new Date(`${date.trim()}T${time.trim().padStart(5, '0')}`);
    if (isNaN(scheduledAt.getTime())) { notify('Invalid date & time', 'Enter a real date and time.'); return; }
    if (!companyId) return;
    setSaving(true);
    // Duration isn't a field the company fills in — every interview defaults
    // to a standard 60 minutes rather than asking for a number nobody varies
    // in practice; interviews.duration_minutes still exists for the rare
    // case someone wants to adjust it directly later.
    const { data, error } = await supabase.from('interviews').insert({
      company_id: companyId,
      candidate_id: selected.id,
      role_id: selected.roleId,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: 60,
      meeting_type: meetingType,
      meeting_url: meetingUrl.trim() || null,
    }).select('id').single();
    setSaving(false);
    if (error) { notify('Could not schedule', error.message); return; }
    notify('Interview scheduled', `${selected.name} — ${formatInterviewTime(scheduledAt)}`);
    if (data?.id) void notifyInterviewScheduled(data.id);
    reset();
    onScheduled();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.headerRow}>
            <Text style={s.title}>Schedule Interview</Text>
            <AnimatedPressable onPress={close} hitSlop={11} accessibilityRole="button" accessibilityLabel="Close"><AppIcon name="close" size={22} color={T.textMuted} /></AnimatedPressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={s.label}>Role</Text>
            {roles.length === 0 ? (
              <Text style={s.emptyHint}>Post a role first — interviews are scheduled against a specific role.</Text>
            ) : (
              <View style={s.roleRow}>
                {roles.map((r) => (
                  <AnimatedPressable
                    key={r.id}
                    style={[s.roleBtn, selectedRoleId === r.id && s.roleBtnActive]}
                    onPress={() => setSelectedRoleId(r.id)}
                  >
                    <Text style={[s.roleBtnText, selectedRoleId === r.id && s.roleBtnTextActive]} numberOfLines={1}>{r.title}</Text>
                  </AnimatedPressable>
                ))}
              </View>
            )}

            <Text style={s.label}>Candidate</Text>
            {!selectedRoleId ? (
              <Text style={s.emptyHint}>Pick a role above to see who's accepted an introduction for it.</Text>
            ) : selected ? (
              <View style={s.selectedCandidate}>
                <Text style={s.selectedCandidateText}>{selected.name}{selected.roleTitle ? ` · ${selected.roleTitle}` : ''}</Text>
                <AnimatedPressable onPress={() => setSelected(null)} accessibilityRole="button" accessibilityLabel="Clear selected candidate"><AppIcon name="close" size={16} color={T.textMuted} /></AnimatedPressable>
              </View>
            ) : candidatesLoaded && candidates.length === 0 ? (
              <Text style={s.emptyHint}>No one has accepted an introduction for this role yet.</Text>
            ) : (
              candidates.map((c) => (
                <AnimatedPressable key={c.id} style={s.candidateOption} onPress={() => setSelected(c)}>
                  <Text style={s.candidateOptionText}>{c.name}</Text>
                </AnimatedPressable>
              ))
            )}

            <Text style={s.label}>Meeting Type</Text>
            <View style={s.typeRow}>
              <AnimatedPressable style={[s.typeBtn, meetingType === 'link' && s.typeBtnActive]} onPress={() => setMeetingType('link')}>
                <AppIcon name="link" size={16} color={meetingType === 'link' ? T.textOnAccent : T.textSecondary} />
                <Text style={[s.typeBtnText, meetingType === 'link' && s.typeBtnTextActive]}>Meeting Link</Text>
              </AnimatedPressable>
              <AnimatedPressable style={[s.typeBtn, meetingType === 'google_meet' && s.typeBtnActive]} onPress={() => setMeetingType('google_meet')}>
                <AppIcon name="videocam-outline" size={16} color={meetingType === 'google_meet' ? T.textOnAccent : T.textSecondary} />
                <Text style={[s.typeBtnText, meetingType === 'google_meet' && s.typeBtnTextActive]}>Google Meet</Text>
              </AnimatedPressable>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Date</Text>
                <TextInput style={s.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={T.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Time</Text>
                <TextInput style={s.input} value={time} onChangeText={setTime} placeholder="HH:MM" placeholderTextColor={T.textMuted} />
              </View>
            </View>

            <Text style={s.label}>{meetingType === 'google_meet' ? 'Google Meet URL' : 'Meeting URL'}</Text>
            <TextInput
              style={s.input}
              value={meetingUrl}
              onChangeText={setMeetingUrl}
              placeholder={meetingType === 'google_meet' ? 'https://meet.google.com/…' : 'https://…'}
              placeholderTextColor={T.textMuted}
              autoCapitalize="none"
            />

            <AnimatedPressable style={[s.submitBtn, saving && { opacity: 0.7 }]} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator color={T.textOnAccent} /> : <Text style={s.submitBtnText}>Schedule Interview</Text>}
            </AnimatedPressable>
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
  emptyHint: { fontSize: 13, color: T.textMuted, lineHeight: 18, paddingVertical: 4 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, maxWidth: '100%' },
  roleBtnActive: { backgroundColor: T.accentSolid, borderColor: T.accentSolid },
  roleBtnText: { fontSize: 13, fontWeight: '700', color: T.textSecondary },
  roleBtnTextActive: { color: T.textOnAccent },
  submitBtn: { backgroundColor: T.accentSolid, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 22, marginBottom: 6 },
  submitBtnText: { color: T.textOnAccent, fontWeight: '700', fontSize: 15 },
});
