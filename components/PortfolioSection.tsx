import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View, StyleSheet } from 'react-native';
import AppIcon from '@/components/AppIcon';
import { Text } from '@/components/Themed';
import { useTheme, ThemePalette } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';

// Candidate portfolio — architecture doc §5.1 ("up to 5 [items] per
// candidate"), backed by the real portfolio_items table (RLS: a candidate
// manages their own; a company with an accepted introduction can view them —
// same visibility rule as contact details).
const MAX_ITEMS = 5;

interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
}

export default function PortfolioSection({ candidateId }: { candidateId: string | null }) {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);

  const [items, setItems] = useState<PortfolioItem[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!candidateId) return;
    let alive = true;
    supabase.from('portfolio_items').select('id, title, description').eq('candidate_id', candidateId).order('created_at').then(({ data, error }) => {
      if (!alive) return;
      // Table may not exist yet on a database that hasn't run the pending
      // migration — degrade to "no items" rather than crash the screen.
      setItems(error ? [] : (data ?? []));
    });
    return () => { alive = false; };
  }, [candidateId]);

  const handleAdd = async () => {
    if (!candidateId || !title.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('portfolio_items')
      .insert({ candidate_id: candidateId, title: title.trim(), description: description.trim() || null })
      .select('id, title, description')
      .single();
    setSaving(false);
    if (error) {
      notify('Could not add item', error.message);
      return;
    }
    setItems((prev) => [...(prev ?? []), data]);
    setTitle('');
    setDescription('');
    setAdding(false);
  };

  const handleRemove = async (id: string) => {
    const prev = items ?? [];
    setItems(prev.filter((i) => i.id !== id));
    const { error } = await supabase.from('portfolio_items').delete().eq('id', id);
    if (error) {
      notify('Could not remove item', error.message);
      setItems(prev); // revert
    }
  };

  if (items === null) return null;

  return (
    <View style={st.section}>
      <View style={st.sectionRow}>
        <Text style={st.sectionTitle}>Portfolio</Text>
        <View style={st.count}><Text style={st.countText}>{items.length}/{MAX_ITEMS}</Text></View>
      </View>

      {items.length === 0 && !adding ? (
        <View style={st.empty}>
          <AppIcon name="briefcase-outline" size={20} color={T.textMuted} />
          <Text style={st.emptyText}>Add work samples companies can see once they connect with you.</Text>
        </View>
      ) : (
        items.map((item) => (
          <View key={item.id} style={st.card}>
            <View style={{ flex: 1 }}>
              <Text style={st.cardTitle}>{item.title}</Text>
              {item.description ? <Text style={st.cardDesc}>{item.description}</Text> : null}
            </View>
            <Pressable onPress={() => handleRemove(item.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${item.title}`}>
              <AppIcon name="close" size={16} color={T.textMuted} />
            </Pressable>
          </View>
        ))
      )}

      {adding ? (
        <View style={st.addForm}>
          <TextInput style={st.input} placeholder="Title (e.g. Payroll dashboard rebuild)" placeholderTextColor={T.textMuted} value={title} onChangeText={setTitle} />
          <TextInput style={[st.input, st.textArea]} placeholder="Short description (optional)" placeholderTextColor={T.textMuted} value={description} onChangeText={setDescription} multiline numberOfLines={3} />
          <View style={st.addFormRow}>
            <Pressable style={st.cancelBtn} onPress={() => { setAdding(false); setTitle(''); setDescription(''); }}>
              <Text style={st.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={[st.saveBtn, (!title.trim() || saving) && st.saveBtnDisabled]} onPress={handleAdd} disabled={!title.trim() || saving}>
              <Text style={st.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
            </Pressable>
          </View>
        </View>
      ) : items.length < MAX_ITEMS ? (
        <Pressable style={st.addRow} onPress={() => setAdding(true)}>
          <AppIcon name="add" size={16} color={T.accent} />
          <Text style={st.addRowText}>Add portfolio item</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: T.textPrimary },
  count: { backgroundColor: T.accentBg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { fontSize: 12, fontWeight: '700', color: T.accentDim },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.surface, borderRadius: 14, padding: 14, marginBottom: 10 },
  emptyText: { flex: 1, fontSize: 13, color: T.textSecondary, lineHeight: 18 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: T.card, borderRadius: 14, borderWidth: 1, borderColor: T.border,
    padding: 14, marginBottom: 8,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: T.textPrimary },
  cardDesc: { fontSize: 12, color: T.textSecondary, marginTop: 2, lineHeight: 17 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
  addRowText: { fontSize: 13, fontWeight: '600', color: T.accentDim },
  addForm: { backgroundColor: T.surface, borderRadius: 14, padding: 12, gap: 8, marginTop: 4 },
  input: { backgroundColor: T.card, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: T.textPrimary },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  addFormRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 2 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: T.textSecondary },
  saveBtn: { backgroundColor: T.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: T.textOnAccent },
});
