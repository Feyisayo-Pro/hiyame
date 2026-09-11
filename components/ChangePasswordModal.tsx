import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Themed';
import { useTheme, ThemePalette } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';

// Real password change — supabase.auth.updateUser() only needs the current
// (already authenticated) session, no separate "current password" re-entry.

export default function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const T = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setPassword('');
    setConfirm('');
  };

  const close = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const save = async () => {
    if (password.length < 8) {
      notify('Password too short', 'Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      notify("Passwords don't match", 'Re-enter the same password in both fields.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      notify('Could not update password', error.message);
      return;
    }
    notify('Password updated', 'Your password has been changed.');
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.headerRow}>
            <Text style={s.title}>Change Password</Text>
            <Pressable onPress={close} hitSlop={8}>
              <Ionicons name="close" size={22} color={T.textMuted} />
            </Pressable>
          </View>

          <Text style={s.label}>New password</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            placeholderTextColor={T.textMuted}
            secureTextEntry
            autoFocus
          />

          <Text style={s.label}>Confirm new password</Text>
          <TextInput
            style={s.input}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Re-enter password"
            placeholderTextColor={T.textMuted}
            secureTextEntry
            onSubmitEditing={save}
          />

          <Pressable style={[s.saveBtn, saving && s.saveBtnDisabled]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color={T.textOnAccent} /> : <Text style={s.saveBtnText}>Update Password</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: T.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, backgroundColor: T.card, borderRadius: 20, padding: 22, gap: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '800', color: T.textPrimary },
  label: { fontSize: 12, fontWeight: '700', color: T.textSecondary, marginTop: 12, marginBottom: 6 },
  input: {
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: T.border,
    backgroundColor: T.inputBg, paddingHorizontal: 14, fontSize: 14, color: T.textPrimary,
  },
  saveBtn: { height: 48, borderRadius: 12, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: T.textOnAccent },
});
