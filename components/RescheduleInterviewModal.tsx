import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import { useTheme, ThemePalette } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';
import { formatInterviewTime } from '@/lib/format';
import AnimatedPressable from '@/components/AnimatedPressable';

// Shared by app/(company)/interviews.tsx and app/(candidate)/interviews.tsx
// — same date/time picker shape as ScheduleInterviewModal (company
// interviews.tsx), but submitting through the reschedule_interview RPC
// (supabase/migrations/20261007120000_interview_reschedule.sql) instead of
// a direct update. The RPC enforces the 2-per-side cap and figures out
// which side the caller is (company_user vs candidate) itself — this
// component doesn't need to know or pass that.
interface Props {
  visible: boolean;
  interviewId: string | null;
  remaining: number; // reschedules left for the current viewer's side — 0 hides the submit affordance upstream, this just displays it
  onClose: () => void;
  onRescheduled: () => void;
}

export default function RescheduleInterviewModal({ visible, interviewId, remaining, onClose, onRescheduled }: Props) {
  const T = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) { setDate(''); setTime(''); }
  }, [visible]);

  const close = () => { if (saving) return; onClose(); };

  const submit = async () => {
    if (!interviewId) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) { notify('Invalid date', 'Enter the date as YYYY-MM-DD.'); return; }
    if (!/^\d{1,2}:\d{2}$/.test(time.trim())) { notify('Invalid time', 'Enter the time as HH:MM (24-hour).'); return; }
    const scheduledAt = new Date(`${date.trim()}T${time.trim().padStart(5, '0')}`);
    if (isNaN(scheduledAt.getTime())) { notify('Invalid date & time', 'Enter a real date and time.'); return; }

    setSaving(true);
    const { error } = await supabase.rpc('reschedule_interview', {
      p_interview_id: interviewId,
      p_new_scheduled_at: scheduledAt.toISOString(),
    });
    setSaving(false);
    if (error) { notify('Could not reschedule', error.message); return; }
    notify('Interview rescheduled', formatInterviewTime(scheduledAt));
    setDate(''); setTime('');
    onRescheduled();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.headerRow}>
            <Text style={s.title}>Reschedule Interview</Text>
            <AnimatedPressable onPress={close} hitSlop={11} accessibilityRole="button" accessibilityLabel="Close">
              <AppIcon name="close" size={22} color={T.textMuted} />
            </AnimatedPressable>
          </View>

          <Text style={s.hint}>
            {remaining} reschedule{remaining === 1 ? '' : 's'} left on your side for this interview.
          </Text>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>New Date</Text>
              <TextInput style={s.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={T.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>New Time</Text>
              <TextInput style={s.input} value={time} onChangeText={setTime} placeholder="HH:MM" placeholderTextColor={T.textMuted} />
            </View>
          </View>

          <AnimatedPressable style={[s.submitBtn, saving && { opacity: 0.7 }]} onPress={submit} disabled={saving}>
            {saving ? <ActivityIndicator color={T.textOnAccent} /> : <Text style={s.submitBtnText}>Confirm New Time</Text>}
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: T.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, backgroundColor: T.card, borderRadius: 20, padding: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 17, fontWeight: '800', color: T.textPrimary },
  hint: { fontSize: 12.5, color: T.textMuted, marginTop: 10 },
  label: { fontSize: 12, fontWeight: '700', color: T.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: { borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: T.textPrimary },
  submitBtn: { backgroundColor: T.accentSolid, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  submitBtnText: { color: T.textOnAccent, fontWeight: '700', fontSize: 15 },
});
