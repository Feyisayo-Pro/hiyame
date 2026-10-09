import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette, DISPLAY_FONT_FAMILY, RADIUS } from '@/lib/theme';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
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

// Scheduling itself is still a company action (app/(company)/interviews.tsx)
// — a candidate can't book a brand-new interview — but can reschedule an
// existing one (up to MAX_RESCHEDULES times, tracked independently from
// the company's own count) via the reschedule_interview RPC, same "company
// drives, candidate responds" shape introductions already have, just with
// one more action than pure read-only.

interface Interview {
  id: string;
  companyName: string;
  roleTitle: string | null;
  scheduledAt: string;
  durationMinutes: number;
  meetingType: 'link' | 'google_meet';
  meetingUrl: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';
  candidateRescheduleCount: number;
}

export default function CandidateInterviewsScreen() {
  usePersonaGuard('candidate');
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const { candidateId } = useAuth();
  const candidateStatus = useAccountStatus('candidates', candidateId);
  const [interviews, setInterviews] = useState<Interview[] | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Interview | null>(null);

  const load = useCallback(async () => {
    if (!candidateId) { setInterviews([]); return; }
    const { data, error } = await supabase
      .from('interviews')
      .select('id, scheduled_at, duration_minutes, meeting_type, meeting_url, status, candidate_reschedule_count, companies(trading_name, legal_name), roles(title)')
      .eq('candidate_id', candidateId)
      .order('scheduled_at', { ascending: true });
    if (error) {
      console.warn('Failed to load interviews:', error.message);
      setInterviews([]);
      return;
    }
    setInterviews((data ?? []).map((r: any) => ({
      id: r.id,
      companyName: r.companies?.trading_name || r.companies?.legal_name || 'A company',
      roleTitle: r.roles?.title ?? null,
      scheduledAt: r.scheduled_at,
      durationMinutes: r.duration_minutes,
      meetingType: r.meeting_type,
      meetingUrl: r.meeting_url,
      status: r.status,
      candidateRescheduleCount: r.candidate_reschedule_count ?? 0,
    })));
  }, [candidateId]);

  useEffect(() => { load(); }, [load]);

  const upcoming = (interviews ?? []).filter((i) => i.status === 'scheduled');
  const past = (interviews ?? []).filter((i) => i.status !== 'scheduled');

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <PageHead title="Interviews" />
      <ScreenFrame>
        <View style={st.header}>
          <Text style={st.headerTitle}>Interviews</Text>
          <Text style={st.headerSub}>{upcoming.length} upcoming</Text>
        </View>

        {candidateStatus === 'pending' || candidateStatus === 'rejected' ? (
          <PendingAccountBlock status={candidateStatus} action="see scheduled interviews" />
        ) : (
        <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
          <SwipeFadeContainer>
            {interviews === null ? (
              <><SkeletonRow /><SkeletonRow /></>
            ) : interviews.length === 0 ? (
              <View style={st.emptyBlock}>
                <AppIcon name="calendar-outline" size={28} color={T.textMuted} />
                <Text style={st.emptyTitle}>No interviews yet</Text>
                <Text style={st.emptySub}>When a company schedules an interview with you, it shows up here.</Text>
              </View>
            ) : (
              <>
                {upcoming.map((i) => (
                  <View key={i.id} style={[st.row, st.rowUpcoming]}>
                    <View style={st.rowIconWrap}>
                      <AppIcon name={i.meetingType === 'google_meet' ? 'videocam-outline' : 'link'} size={18} color={T.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.rowName}>{i.companyName}</Text>
                      <Text style={st.rowMeta}>
                        {i.roleTitle ? `${i.roleTitle} · ` : ''}{formatInterviewTime(i.scheduledAt)} · {i.durationMinutes}min
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {i.candidateRescheduleCount < MAX_RESCHEDULES && (
                        <AnimatedPressable style={st.rescheduleBtn} onPress={() => setRescheduleTarget(i)} hitSlop={4} accessibilityRole="button" accessibilityLabel="Reschedule interview">
                          <AppIcon name="time-outline" size={14} color={T.amber} />
                          <Text style={st.rescheduleBtnText}>Reschedule</Text>
                        </AnimatedPressable>
                      )}
                      {i.meetingUrl && (
                        <AnimatedPressable style={st.joinBtn} onPress={() => openInNewTab(i.meetingUrl!)} accessibilityRole="button" accessibilityLabel="Open meeting link in a new tab">
                          <Text style={st.joinBtnText}>View Link</Text>
                        </AnimatedPressable>
                      )}
                    </View>
                  </View>
                ))}
                {past.length > 0 && (
                  <>
                    <Text style={st.sectionLabel}>PAST</Text>
                    {past.map((i) => (
                      <View key={i.id} style={st.row}>
                        <View style={st.rowIconWrap}>
                          <AppIcon name="calendar-outline" size={18} color={T.textMuted} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={st.rowName}>{i.companyName}</Text>
                          <Text style={st.rowMeta}>{formatInterviewTime(i.scheduledAt)}</Text>
                        </View>
                        <View style={st.statusPill}>
                          <Text style={st.statusPillText}>{i.status}</Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </>
            )}
          </SwipeFadeContainer>
        </ScrollView>
        )}
      </ScreenFrame>

      <RescheduleInterviewModal
        visible={rescheduleTarget != null}
        interviewId={rescheduleTarget?.id ?? null}
        remaining={MAX_RESCHEDULES - (rescheduleTarget?.candidateRescheduleCount ?? 0)}
        onClose={() => setRescheduleTarget(null)}
        onRescheduled={() => { setRescheduleTarget(null); load(); }}
      />
    </SafeAreaView>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: T.textPrimary, fontFamily: DISPLAY_FONT_FAMILY },
  headerSub: { fontSize: 13, color: T.textMuted, marginTop: 2 },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  emptyBlock: { alignItems: 'center', gap: 10, paddingVertical: 48 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: T.textSecondary },
  emptySub: { fontSize: 13, color: T.textMuted, textAlign: 'center', maxWidth: 280 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: T.textMuted, marginTop: 8, marginBottom: 10, letterSpacing: 0.3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.card, borderRadius: RADIUS.card, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
  rowUpcoming: { borderColor: T.accent },
  rowIconWrap: { width: 36, height: 36, borderRadius: RADIUS.control, backgroundColor: T.accentBg, alignItems: 'center', justifyContent: 'center' },
  rowName: { fontSize: 14, fontWeight: '700', color: T.textPrimary },
  rowMeta: { fontSize: 12, color: T.textMuted, marginTop: 2 },
  rescheduleBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 34, paddingHorizontal: 10, borderRadius: RADIUS.pill, backgroundColor: T.amberBg },
  rescheduleBtnText: { fontSize: 12, fontWeight: '700', color: T.amber },
  joinBtn: { backgroundColor: T.accentSolid, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.pill },
  joinBtnText: { color: T.textOnAccent, fontWeight: '700', fontSize: 12 },
  statusPill: { backgroundColor: T.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusPillText: { fontSize: 11, fontWeight: '700', color: T.textMuted, textTransform: 'capitalize' },
});
