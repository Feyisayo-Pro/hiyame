import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View, StyleSheet } from 'react-native';
import AppIcon from '@/components/AppIcon';
import { Text } from '@/components/Themed';
import { useTheme, ThemePalette } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';

// Certifications — part of the CV-format candidate profile, backed by
// candidate_certifications (RLS: candidate manages their own; a company with
// an accepted introduction can view it — same visibility rule as
// portfolio_items). Same list/add/remove shape as PortfolioSection.tsx, plus
// edit-in-place (tap a card to correct it instead of delete-and-recreate).

interface CertificationItem {
  id: string;
  name: string;
  issuingOrganization: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  credentialUrl: string | null;
}

function year(d: string | null): string {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '' : String(date.getFullYear());
}

export default function CertificationsSection({ candidateId }: { candidateId: string | null }) {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);

  const [items, setItems] = useState<CertificationItem[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [issuingOrganization, setIssuingOrganization] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [credentialUrl, setCredentialUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!candidateId) return;
    let alive = true;
    supabase
      .from('candidate_certifications')
      .select('id, name, issuing_organization, issue_date, expiry_date, credential_url')
      .eq('candidate_id', candidateId)
      .order('issue_date', { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return;
        setItems(error ? [] : (data ?? []).map((r) => ({
          id: r.id, name: r.name, issuingOrganization: r.issuing_organization,
          issueDate: r.issue_date, expiryDate: r.expiry_date, credentialUrl: r.credential_url,
        })));
      });
    return () => { alive = false; };
  }, [candidateId]);

  const reset = () => {
    setName(''); setIssuingOrganization(''); setIssueDate(''); setCredentialUrl('');
  };

  const closeForm = () => { setFormOpen(false); setEditingId(null); reset(); };

  const openAdd = () => { reset(); setEditingId(null); setFormOpen(true); };

  const openEdit = (item: CertificationItem) => {
    setName(item.name);
    setIssuingOrganization(item.issuingOrganization ?? '');
    setIssueDate(item.issueDate ?? '');
    setCredentialUrl(item.credentialUrl ?? '');
    setEditingId(item.id);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!candidateId || !name.trim()) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      issuing_organization: issuingOrganization.trim() || null,
      issue_date: issueDate.trim() || null,
      credential_url: credentialUrl.trim() || null,
    };
    const query = editingId
      ? supabase.from('candidate_certifications').update(payload).eq('id', editingId)
      : supabase.from('candidate_certifications').insert({ candidate_id: candidateId, ...payload });
    const { data, error } = await query
      .select('id, name, issuing_organization, issue_date, expiry_date, credential_url')
      .single();
    setSaving(false);
    if (error) {
      notify('Could not save', error.message);
      return;
    }
    const saved: CertificationItem = {
      id: data.id, name: data.name, issuingOrganization: data.issuing_organization,
      issueDate: data.issue_date, expiryDate: data.expiry_date, credentialUrl: data.credential_url,
    };
    setItems((prev) => editingId
      ? (prev ?? []).map((i) => (i.id === editingId ? saved : i))
      : [saved, ...(prev ?? [])]);
    closeForm();
  };

  const handleRemove = async (id: string) => {
    const prev = items ?? [];
    setItems(prev.filter((i) => i.id !== id));
    const { error } = await supabase.from('candidate_certifications').delete().eq('id', id);
    if (error) {
      notify('Could not remove', error.message);
      setItems(prev);
    }
  };

  if (items === null) return null;

  return (
    <View style={st.section}>
      <View style={st.sectionRow}>
        <Text style={st.sectionTitle}>Certifications</Text>
      </View>

      {items.length === 0 && !formOpen ? (
        <View style={st.empty}>
          <AppIcon name="checkmark-circle-outline" size={20} color={T.textMuted} />
          <Text style={st.emptyText}>Add certifications that back up your skills.</Text>
        </View>
      ) : (
        items.map((item) => (
          <Pressable key={item.id} style={st.card} onPress={() => openEdit(item)} accessibilityRole="button" accessibilityLabel={`Edit ${item.name}`}>
            <View style={{ flex: 1 }}>
              <Text style={st.cardTitle}>{item.name}</Text>
              {item.issuingOrganization ? <Text style={st.cardSub}>{item.issuingOrganization}</Text> : null}
              {item.issueDate ? <Text style={st.cardMeta}>Issued {year(item.issueDate)}</Text> : null}
            </View>
            <Pressable onPress={(e) => { e.stopPropagation(); handleRemove(item.id); }} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${item.name}`}>
              <AppIcon name="close" size={16} color={T.textMuted} />
            </Pressable>
          </Pressable>
        ))
      )}

      {formOpen ? (
        <View style={st.addForm}>
          <TextInput style={st.input} placeholder="Certification name" placeholderTextColor={T.textMuted} value={name} onChangeText={setName} />
          <TextInput style={st.input} placeholder="Issuing organization (optional)" placeholderTextColor={T.textMuted} value={issuingOrganization} onChangeText={setIssuingOrganization} />
          <TextInput style={st.input} placeholder="Issue date (YYYY-MM-DD)" placeholderTextColor={T.textMuted} value={issueDate} onChangeText={setIssueDate} />
          <TextInput style={st.input} placeholder="Credential URL (optional)" placeholderTextColor={T.textMuted} value={credentialUrl} onChangeText={setCredentialUrl} autoCapitalize="none" />
          <View style={st.addFormRow}>
            <Pressable style={st.cancelBtn} onPress={closeForm}>
              <Text style={st.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={[st.saveBtn, (!name.trim() || saving) && st.saveBtnDisabled]} onPress={handleSave} disabled={!name.trim() || saving}>
              <Text style={st.saveBtnText}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Save'}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={st.addRow} onPress={openAdd}>
          <AppIcon name="add" size={16} color={T.accent} />
          <Text style={st.addRowText}>Add certification</Text>
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
  addFormRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 2 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: T.textSecondary },
  saveBtn: { backgroundColor: T.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: T.textOnAccent },
});
