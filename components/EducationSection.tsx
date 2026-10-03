import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View, StyleSheet } from 'react-native';
import AppIcon from '@/components/AppIcon';
import { Text } from '@/components/Themed';
import { useTheme, ThemePalette } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';

// Education — part of the CV-format candidate profile, backed by
// candidate_education (RLS: candidate manages their own; a company with an
// accepted introduction can view it — same visibility rule as
// portfolio_items). Same list/add/remove shape as PortfolioSection.tsx, plus
// edit-in-place (tap a card to correct it instead of delete-and-recreate).

interface EducationItem {
  id: string;
  institution: string;
  qualification: string;
  fieldOfStudy: string | null;
  startDate: string | null;
  endDate: string | null;
}

function year(d: string | null): string {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '' : String(date.getFullYear());
}

export default function EducationSection({ candidateId }: { candidateId: string | null }) {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);

  const [items, setItems] = useState<EducationItem[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [institution, setInstitution] = useState('');
  const [qualification, setQualification] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!candidateId) return;
    let alive = true;
    supabase
      .from('candidate_education')
      .select('id, institution, qualification, field_of_study, start_date, end_date')
      .eq('candidate_id', candidateId)
      .order('start_date', { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return;
        setItems(error ? [] : (data ?? []).map((r) => ({
          id: r.id, institution: r.institution, qualification: r.qualification,
          fieldOfStudy: r.field_of_study, startDate: r.start_date, endDate: r.end_date,
        })));
      });
    return () => { alive = false; };
  }, [candidateId]);

  const reset = () => {
    setInstitution(''); setQualification(''); setFieldOfStudy(''); setStartDate(''); setEndDate('');
  };

  const closeForm = () => { setFormOpen(false); setEditingId(null); reset(); };

  const openAdd = () => { reset(); setEditingId(null); setFormOpen(true); };

  const openEdit = (item: EducationItem) => {
    setInstitution(item.institution);
    setQualification(item.qualification);
    setFieldOfStudy(item.fieldOfStudy ?? '');
    setStartDate(item.startDate ?? '');
    setEndDate(item.endDate ?? '');
    setEditingId(item.id);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!candidateId || !institution.trim() || !qualification.trim()) return;
    setSaving(true);
    const payload = {
      institution: institution.trim(),
      qualification: qualification.trim(),
      field_of_study: fieldOfStudy.trim() || null,
      start_date: startDate.trim() || null,
      end_date: endDate.trim() || null,
    };
    const query = editingId
      ? supabase.from('candidate_education').update(payload).eq('id', editingId)
      : supabase.from('candidate_education').insert({ candidate_id: candidateId, ...payload });
    const { data, error } = await query
      .select('id, institution, qualification, field_of_study, start_date, end_date')
      .single();
    setSaving(false);
    if (error) {
      notify('Could not save', error.message);
      return;
    }
    const saved: EducationItem = {
      id: data.id, institution: data.institution, qualification: data.qualification,
      fieldOfStudy: data.field_of_study, startDate: data.start_date, endDate: data.end_date,
    };
    setItems((prev) => editingId
      ? (prev ?? []).map((i) => (i.id === editingId ? saved : i))
      : [saved, ...(prev ?? [])]);
    closeForm();
  };

  const handleRemove = async (id: string) => {
    const prev = items ?? [];
    setItems(prev.filter((i) => i.id !== id));
    const { error } = await supabase.from('candidate_education').delete().eq('id', id);
    if (error) {
      notify('Could not remove', error.message);
      setItems(prev);
    }
  };

  if (items === null) return null;

  return (
    <View style={st.section}>
      <View style={st.sectionRow}>
        <Text style={st.sectionTitle}>Education</Text>
      </View>

      {items.length === 0 && !formOpen ? (
        <View style={st.empty}>
          <AppIcon name="document-text-outline" size={20} color={T.textMuted} />
          <Text style={st.emptyText}>Add your education history.</Text>
        </View>
      ) : (
        items.map((item) => (
          <Pressable key={item.id} style={st.card} onPress={() => openEdit(item)} accessibilityRole="button" accessibilityLabel={`Edit ${item.qualification}`}>
            <View style={{ flex: 1 }}>
              <Text style={st.cardTitle}>{item.qualification}</Text>
              <Text style={st.cardSub}>{item.institution}{item.fieldOfStudy ? ` · ${item.fieldOfStudy}` : ''}</Text>
              {(item.startDate || item.endDate) && (
                <Text style={st.cardMeta}>{year(item.startDate)} — {year(item.endDate) || 'Present'}</Text>
              )}
            </View>
            <Pressable onPress={(e) => { e.stopPropagation(); handleRemove(item.id); }} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${item.qualification}`}>
              <AppIcon name="close" size={16} color={T.textMuted} />
            </Pressable>
          </Pressable>
        ))
      )}

      {formOpen ? (
        <View style={st.addForm}>
          <TextInput style={st.input} placeholder="Institution" placeholderTextColor={T.textMuted} value={institution} onChangeText={setInstitution} />
          <TextInput style={st.input} placeholder="Qualification (BSc Computer Science)" placeholderTextColor={T.textMuted} value={qualification} onChangeText={setQualification} />
          <TextInput style={st.input} placeholder="Field of study (optional)" placeholderTextColor={T.textMuted} value={fieldOfStudy} onChangeText={setFieldOfStudy} />
          <View style={st.dateRow}>
            <TextInput style={[st.input, { flex: 1 }]} placeholder="Start (YYYY-MM-DD)" placeholderTextColor={T.textMuted} value={startDate} onChangeText={setStartDate} />
            <TextInput style={[st.input, { flex: 1 }]} placeholder="End (YYYY-MM-DD)" placeholderTextColor={T.textMuted} value={endDate} onChangeText={setEndDate} />
          </View>
          <View style={st.addFormRow}>
            <Pressable style={st.cancelBtn} onPress={closeForm}>
              <Text style={st.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={[st.saveBtn, (!institution.trim() || !qualification.trim() || saving) && st.saveBtnDisabled]} onPress={handleSave} disabled={!institution.trim() || !qualification.trim() || saving}>
              <Text style={st.saveBtnText}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Save'}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={st.addRow} onPress={openAdd}>
          <AppIcon name="add" size={16} color={T.accent} />
          <Text style={st.addRowText}>Add education</Text>
        </Pressable>
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
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
  addRowText: { fontSize: 13, fontWeight: '600', color: T.accentDim },
  addForm: { backgroundColor: T.surface, borderRadius: 14, padding: 12, gap: 8, marginTop: 4 },
  input: { backgroundColor: T.card, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: T.textPrimary },
  dateRow: { flexDirection: 'row', gap: 8 },
  addFormRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 2 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: T.textSecondary },
  saveBtn: { backgroundColor: T.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: T.textOnAccent },
});
