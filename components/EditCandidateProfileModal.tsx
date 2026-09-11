import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Themed';
import { useTheme, ThemePalette } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';

export interface CandidateEditable {
  fullName: string;
  skillTags: string[];
  ratePreferred: number | null;
}

interface Props {
  visible: boolean;
  candidateId: string | null;
  initial: CandidateEditable;
  onClose: () => void;
  onSaved: (updated: CandidateEditable) => void;
}

export default function EditCandidateProfileModal({ visible, candidateId, initial, onClose, onSaved }: Props) {
  const T = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);

  const [fullName, setFullName] = useState(initial.fullName);
  const [skills, setSkills] = useState<string[]>(initial.skillTags);
  const [skillInput, setSkillInput] = useState('');
  const [rate, setRate] = useState(initial.ratePreferred ? String(initial.ratePreferred) : '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setFullName(initial.fullName);
      setSkills(initial.skillTags);
      setSkillInput('');
      setRate(initial.ratePreferred ? String(initial.ratePreferred) : '');
    }
  }, [visible, initial]);

  const addSkill = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed && !skills.includes(trimmed) && skills.length < 12) {
      setSkills([...skills, trimmed]);
    }
    setSkillInput('');
  };
  const removeSkill = (skill: string) => setSkills(skills.filter((sk) => sk !== skill));

  const close = () => { if (!saving) onClose(); };

  const save = async () => {
    if (!candidateId) return;
    const name = fullName.trim();
    if (!name) {
      notify('Name required', 'Enter your full name.');
      return;
    }
    const parsedRate = rate.trim() ? Number(rate.trim().replace(/[^0-9.]/g, '')) : null;
    if (rate.trim() && (parsedRate === null || Number.isNaN(parsedRate) || parsedRate < 0)) {
      notify('Invalid rate', 'Enter a plain number, e.g. 5000.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('candidates')
      .update({ full_name: name, skill_tags: skills, rate_preferred: parsedRate })
      .eq('id', candidateId);
    setSaving(false);

    if (error) {
      notify('Could not save', error.message);
      return;
    }
    onSaved({ fullName: name, skillTags: skills, ratePreferred: parsedRate });
    notify('Profile updated', 'Your changes are live.');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.headerRow}>
            <Text style={s.title}>Edit Profile</Text>
            <Pressable onPress={close} hitSlop={8}>
              <Ionicons name="close" size={22} color={T.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={s.label}>Full name</Text>
            <TextInput style={s.input} value={fullName} onChangeText={setFullName} placeholder="Your name" placeholderTextColor={T.textMuted} />

            <Text style={s.label}>Target rate ($/month)</Text>
            <TextInput
              style={s.input}
              value={rate}
              onChangeText={setRate}
              placeholder="e.g. 5000"
              placeholderTextColor={T.textMuted}
              keyboardType="numeric"
            />

            <Text style={s.label}>Skills</Text>
            <View style={s.skillInputRow}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={skillInput}
                onChangeText={setSkillInput}
                placeholder="Type a skill and press add"
                placeholderTextColor={T.textMuted}
                onSubmitEditing={() => addSkill(skillInput)}
                returnKeyType="done"
              />
              {skillInput.trim().length > 0 && (
                <Pressable style={s.addBtn} onPress={() => addSkill(skillInput)} hitSlop={8}>
                  <Ionicons name="add" size={18} color={T.textOnAccent} />
                </Pressable>
              )}
            </View>
            {skills.length > 0 && (
              <View style={s.chipsWrap}>
                {skills.map((skill) => (
                  <View key={skill} style={s.chip}>
                    <Text style={s.chipText}>{skill}</Text>
                    <Pressable onPress={() => removeSkill(skill)} hitSlop={6}>
                      <Ionicons name="close" size={13} color={T.accent} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <Pressable style={[s.saveBtn, saving && s.saveBtnDisabled]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color={T.textOnAccent} /> : <Text style={s.saveBtnText}>Save Changes</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: T.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 440, maxHeight: '85%', backgroundColor: T.card, borderRadius: 20, padding: 22 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '800', color: T.textPrimary },
  label: { fontSize: 12, fontWeight: '700', color: T.textSecondary, marginTop: 12, marginBottom: 6 },
  input: {
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: T.border,
    backgroundColor: T.inputBg, paddingHorizontal: 14, fontSize: 14, color: T.textPrimary,
  },
  skillInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: T.accentBg, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: T.accentBg20,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: T.accent },
  saveBtn: { height: 48, borderRadius: 12, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: T.textOnAccent },
});
