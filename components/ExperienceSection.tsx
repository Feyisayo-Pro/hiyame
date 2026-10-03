import { useEffect, useMemo, useState } from 'react';
import { TextInput, View, StyleSheet, Switch } from 'react-native';
import AppIcon from '@/components/AppIcon';
import { Text } from '@/components/Themed';
import { useTheme, ThemePalette } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';
import AnimatedPressable from '@/components/AnimatedPressable';

// Job Experience — part of the CV-format candidate profile, backed by
// candidate_experience (RLS: candidate manages their own; a company with an
// accepted introduction can view it — same visibility rule as
// portfolio_items). Same list/add/remove shape as PortfolioSection.tsx, plus
// edit-in-place (tap a card to correct it instead of delete-and-recreate).

interface ExperienceItem {
  id: string;
  jobTitle: string;
  companyName: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
}

function monthYear(d: string | null): string {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function ExperienceSection({ candidateId }: { candidateId: string | null }) {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);

  const [items, setItems] = useState<ExperienceItem[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!candidateId) return;
    let alive = true;
    supabase
      .from('candidate_experience')
      .select('id, job_title, company_name, start_date, end_date, is_current, description')
      .eq('candidate_id', candidateId)
      .order('start_date', { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return;
        // Table may not exist yet on a database that hasn't run the pending
        // migration — degrade to "no items" rather than crash the screen.
        setItems(error ? [] : (data ?? []).map((r) => ({
          id: r.id, jobTitle: r.job_title, companyName: r.company_name,
          startDate: r.start_date, endDate: r.end_date, isCurrent: r.is_current,
          description: r.description,
        })));
      });
    return () => { alive = false; };
  }, [candidateId]);

  const reset = () => {
    setJobTitle(''); setCompanyName(''); setStartDate(''); setEndDate(''); setIsCurrent(false); setDescription('');
  };

  const closeForm = () => { setFormOpen(false); setEditingId(null); reset(); };

  const openAdd = () => { reset(); setEditingId(null); setFormOpen(true); };

  const openEdit = (item: ExperienceItem) => {
    setJobTitle(item.jobTitle);
    setCompanyName(item.companyName);
    setStartDate(item.startDate ?? '');
    setEndDate(item.endDate ?? '');
    setIsCurrent(item.isCurrent);
    setDescription(item.description ?? '');
    setEditingId(item.id);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!candidateId || !jobTitle.trim() || !companyName.trim()) return;
    setSaving(true);
    const payload = {
      job_title: jobTitle.trim(),
      company_name: companyName.trim(),
      start_date: startDate.trim() || null,
      end_date: isCurrent ? null : (endDate.trim() || null),
      is_current: isCurrent,
      description: description.trim() || null,
    };
    const query = editingId
      ? supabase.from('candidate_experience').update(payload).eq('id', editingId)
      : supabase.from('candidate_experience').insert({ candidate_id: candidateId, ...payload });
    const { data, error } = await query
      .select('id, job_title, company_name, start_date, end_date, is_current, description')
      .single();
    setSaving(false);
    if (error) {
      notify('Could not save', error.message);
      return;
    }
    const saved: ExperienceItem = {
      id: data.id, jobTitle: data.job_title, companyName: data.company_name,
      startDate: data.start_date, endDate: data.end_date, isCurrent: data.is_current,
      description: data.description,
    };
    setItems((prev) => editingId
      ? (prev ?? []).map((i) => (i.id === editingId ? saved : i))
      : [saved, ...(prev ?? [])]);
    closeForm();
  };

  const handleRemove = async (id: string) => {
    const prev = items ?? [];
    setItems(prev.filter((i) => i.id !== id));
    const { error } = await supabase.from('candidate_experience').delete().eq('id', id);
    if (error) {
      notify('Could not remove', error.message);
      setItems(prev);
    }
  };

  if (items === null) return null;

  return (
    <View style={st.section}>
      <View style={st.sectionRow}>
        <Text style={st.sectionTitle}>Job Experience</Text>
      </View>

      {items.length === 0 && !formOpen ? (
        <View style={st.empty}>
          <AppIcon name="briefcase-outline" size={20} color={T.textMuted} />
          <Text style={st.emptyText}>Add your work history so companies can see your background.</Text>
        </View>
      ) : (
        items.map((item) => (
          <AnimatedPressable key={item.id} style={st.card} onPress={() => openEdit(item)} accessibilityRole="button" accessibilityLabel={`Edit ${item.jobTitle}`}>
            <View style={{ flex: 1 }}>
              <Text style={st.cardTitle}>{item.jobTitle}</Text>
              <Text style={st.cardSub}>{item.companyName}</Text>
              <Text style={st.cardMeta}>
                {monthYear(item.startDate)} — {item.isCurrent ? 'Present' : monthYear(item.endDate) || 'Present'}
              </Text>
              {item.description ? <Text style={st.cardDesc}>{item.description}</Text> : null}
            </View>
            <AnimatedPressable onPress={(e) => { e.stopPropagation(); handleRemove(item.id); }} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${item.jobTitle}`}>
              <AppIcon name="close" size={16} color={T.textMuted} />
            </AnimatedPressable>
          </AnimatedPressable>
        ))
      )}

      {formOpen ? (
        <View style={st.addForm}>
          <TextInput style={st.input} placeholder="Job title" placeholderTextColor={T.textMuted} value={jobTitle} onChangeText={setJobTitle} />
          <TextInput style={st.input} placeholder="Company" placeholderTextColor={T.textMuted} value={companyName} onChangeText={setCompanyName} />
          <View style={st.dateRow}>
            <TextInput style={[st.input, { flex: 1 }]} placeholder="Start (YYYY-MM-DD)" placeholderTextColor={T.textMuted} value={startDate} onChangeText={setStartDate} />
            {!isCurrent && (
              <TextInput style={[st.input, { flex: 1 }]} placeholder="End (YYYY-MM-DD)" placeholderTextColor={T.textMuted} value={endDate} onChangeText={setEndDate} />
            )}
          </View>
          <View style={st.switchRow}>
            <Text style={st.switchLabel}>I currently work here</Text>
            <Switch value={isCurrent} onValueChange={setIsCurrent} trackColor={{ true: T.accent }} />
          </View>
          <TextInput style={[st.input, st.textArea]} placeholder="What you did (optional)" placeholderTextColor={T.textMuted} value={description} onChangeText={setDescription} multiline numberOfLines={3} />
          <View style={st.addFormRow}>
            <AnimatedPressable style={st.cancelBtn} onPress={closeForm}>
              <Text style={st.cancelBtnText}>Cancel</Text>
            </AnimatedPressable>
            <AnimatedPressable style={[st.saveBtn, (!jobTitle.trim() || !companyName.trim() || saving) && st.saveBtnDisabled]} onPress={handleSave} disabled={!jobTitle.trim() || !companyName.trim() || saving}>
              <Text style={st.saveBtnText}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Save'}</Text>
            </AnimatedPressable>
          </View>
        </View>
      ) : (
        <AnimatedPressable style={st.addRow} onPress={openAdd}>
          <AppIcon name="add" size={16} color={T.accent} />
          <Text style={st.addRowText}>Add experience</Text>
        </AnimatedPressable>
      )}
    </View>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: T.textPrimary },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.surface, borderRadius: 14, padding: 14, marginBottom: 10 },
  emptyText: { flex: 1, fontSize: 13, color: T.textSecondary, lineHeight: 18 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: T.card, borderRadius: 14, borderWidth: 1, borderColor: T.border,
    padding: 14, marginBottom: 8,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: T.textPrimary },
  cardSub: { fontSize: 13, fontWeight: '600', color: T.accentDim, marginTop: 2 },
  cardMeta: { fontSize: 12, color: T.textMuted, marginTop: 2 },
  cardDesc: { fontSize: 12, color: T.textSecondary, marginTop: 6, lineHeight: 17 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
  addRowText: { fontSize: 13, fontWeight: '600', color: T.accentDim },
  addForm: { backgroundColor: T.surface, borderRadius: 14, padding: 12, gap: 8, marginTop: 4 },
  input: { backgroundColor: T.card, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: T.textPrimary },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  dateRow: { flexDirection: 'row', gap: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  switchLabel: { fontSize: 13, color: T.textSecondary, fontWeight: '600' },
  addFormRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 2 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: T.textSecondary },
  saveBtn: { backgroundColor: T.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: T.textOnAccent },
});
