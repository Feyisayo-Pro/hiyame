import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import AppIcon from '@/components/AppIcon';
import { Text } from '@/components/Themed';
import { useTheme, ThemePalette } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

// "Forgot password?" on both sign-in screens was a dead link (no onPress at
// all) — this closes that gap. Same visual language as VerifyEmailModal:
// a popup, not a separate screen, consistent with how this app already
// handles email-driven auth steps.
interface Props {
  visible: boolean;
  initialEmail?: string;
  onClose: () => void;
}

export default function ForgotPasswordModal({ visible, initialEmail = '', onClose }: Props) {
  const T = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setEmail(initialEmail);
      setSent(false);
      setError('');
    }
  }, [visible, initialEmail]);

  const send = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setSending(true);
    setError('');
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim());
    setSending(false);
    // Supabase's own resetPasswordForEmail already returns success for an
    // email with no account (doesn't leak which addresses are registered) —
    // an error here is a real one (rate limit, etc.), safe to just show.
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>
          {sent ? (
            <>
              <View style={s.iconWrap}>
                <AppIcon name="checkmark-circle" size={26} color={T.emerald} />
              </View>
              <Text style={s.title}>Check your email</Text>
              <Text style={s.subtitle}>
                If an account exists for{'\n'}
                <Text style={s.email}>{email.trim()}</Text>, a reset link is on its way.
              </Text>
              <Pressable style={s.verifyBtn} onPress={onClose}>
                <Text style={s.verifyBtnText}>Done</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={s.iconWrap}>
                <AppIcon name="key-outline" size={26} color={T.accent} />
              </View>
              <Text style={s.title}>Reset your password</Text>
              <Text style={s.subtitle}>We'll email you a link to set a new one.</Text>

              <TextInput
                style={s.emailInput}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(''); }}
                placeholder="you@example.com"
                placeholderTextColor={T.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
                onSubmitEditing={send}
              />
              {error ? <Text style={s.error}>{error}</Text> : null}

              <Pressable style={[s.verifyBtn, sending && s.verifyBtnDisabled]} onPress={send} disabled={sending}>
                {sending ? <ActivityIndicator color={T.textOnAccent} /> : <Text style={s.verifyBtnText}>Send reset link</Text>}
              </Pressable>
            </>
          )}

          <Pressable onPress={onClose} hitSlop={8} style={{ marginTop: 14 }}>
            <Text style={s.closeText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: T.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, backgroundColor: T.card, borderRadius: 20, padding: 26, alignItems: 'center' },
  iconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: T.accentBg, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 19, fontWeight: '800', color: T.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 13, color: T.textSecondary, textAlign: 'center', lineHeight: 19, marginBottom: 22 },
  email: { fontWeight: '700', color: T.textPrimary },
  emailInput: {
    width: '100%', height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: T.border,
    backgroundColor: T.inputBg, fontSize: 15, fontWeight: '600', color: T.textPrimary,
    paddingHorizontal: 16, marginBottom: 8,
  },
  error: { fontSize: 12.5, color: T.danger, textAlign: 'center', marginBottom: 8 },
  verifyBtn: { width: '100%', height: 50, borderRadius: 14, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  verifyBtnDisabled: { opacity: 0.7 },
  verifyBtnText: { fontSize: 15, fontWeight: '700', color: T.textOnAccent },
  closeText: { fontSize: 12.5, color: T.textMuted, marginTop: 4 },
});
