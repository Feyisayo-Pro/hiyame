import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import AppIcon from '@/components/AppIcon';
import { Text } from '@/components/Themed';
import { useTheme, ThemePalette } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

// Real OTP-code email verification, in-page — no leaving the site to click a
// link. Supabase's "Confirm signup" email carries a 6-digit code (via
// {{ .Token }} in the email template — see the Hiyame-branded template
// handed off for the Supabase Dashboard, since this environment can't push
// template changes to the hosted project itself) alongside the usual
// confirmation link, so the link still works as a fallback for anyone who
// taps it on their phone instead of typing the code back in here.
//
// supabase.auth.verifyOtp() establishes a real session client-side exactly
// like clicking the link does — lib/useAuth.ts's onAuthStateChange listener
// picks it up the same way and finishes creating the candidates/companies
// row via completePendingSignup(), so no separate wiring is needed here
// beyond calling onVerified() once a session exists.

interface Props {
  visible: boolean;
  email: string;
  onClose: () => void;
  onVerified: () => void;
}

const RESEND_COOLDOWN = 30;

export default function VerifyEmailModal({ visible, email, onClose, onVerified }: Props) {
  const T = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      setCode('');
      setError('');
      setCooldown(RESEND_COOLDOWN);
    } else if (timer.current) {
      clearInterval(timer.current);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    timer.current = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [visible]);

  const verify = async () => {
    if (code.trim().length < 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setVerifying(true);
    setError('');
    const { data, error: err } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'signup',
    });
    setVerifying(false);
    if (err) {
      setError(err.message || 'That code is incorrect or has expired.');
      return;
    }
    if (data.session) {
      onVerified();
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    const { error: err } = await supabase.auth.resend({ type: 'signup', email });
    setResending(false);
    setCooldown(RESEND_COOLDOWN);
    if (err) setError(err.message);
    else setError('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.iconWrap}>
            <AppIcon name="mail-outline" size={26} color={T.accent} />
          </View>
          <Text style={s.title}>Check your email</Text>
          <Text style={s.subtitle}>
            We sent a 6-digit code to{'\n'}
            <Text style={s.email}>{email}</Text>
          </Text>

          <TextInput
            style={s.codeInput}
            value={code}
            onChangeText={(t) => { setCode(t.replace(/[^0-9]/g, '').slice(0, 6)); setError(''); }}
            placeholder="000000"
            placeholderTextColor={T.textMuted}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            textAlign="center"
            onSubmitEditing={verify}
          />
          {error ? <Text style={s.error}>{error}</Text> : null}

          <Pressable style={[s.verifyBtn, verifying && s.verifyBtnDisabled]} onPress={verify} disabled={verifying}>
            {verifying ? <ActivityIndicator color={T.textOnAccent} /> : <Text style={s.verifyBtnText}>Verify Email</Text>}
          </Pressable>

          <Pressable onPress={resend} disabled={cooldown > 0 || resending} hitSlop={8} style={s.resendRow}>
            <Text style={[s.resendText, cooldown > 0 && s.resendTextDisabled]}>
              {resending ? 'Sending…' : cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't get it? Resend code"}
            </Text>
          </Pressable>

          <Pressable onPress={onClose} hitSlop={8} style={{ marginTop: 4 }}>
            <Text style={s.closeText}>Use a different email</Text>
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
  codeInput: {
    width: '100%', height: 56, borderRadius: 14, borderWidth: 1.5, borderColor: T.border,
    backgroundColor: T.inputBg, fontSize: 24, fontWeight: '700', color: T.textPrimary,
    letterSpacing: 8, marginBottom: 8,
  },
  error: { fontSize: 12.5, color: T.danger, textAlign: 'center', marginBottom: 8 },
  verifyBtn: { width: '100%', height: 50, borderRadius: 14, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  verifyBtnDisabled: { opacity: 0.7 },
  verifyBtnText: { fontSize: 15, fontWeight: '700', color: T.textOnAccent },
  resendRow: { marginTop: 18 },
  resendText: { fontSize: 13, fontWeight: '600', color: T.accent },
  resendTextDisabled: { color: T.textMuted },
  closeText: { fontSize: 12.5, color: T.textMuted, marginTop: 14 },
});
