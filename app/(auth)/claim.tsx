import { useState, useMemo } from 'react';
import { Pressable, StyleSheet, TextInput, View, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

// Lands here from a Supabase invite email's magic link — the user is already
// authenticated (in a "needs a password" state) via that link. Sets a real
// password, then calls whichever claim RPC matches the invite's claim_type
// metadata (set at invite-send time by scripts/invite-strivo-users.ts) to link
// their new account to the existing migrated candidates/companies row.
export default function ClaimAccountScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClaim = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const claimType = userData.user?.user_metadata?.claim_type as string | undefined;
    const intendedCompanyId = userData.user?.user_metadata?.intended_company_id as string | undefined;

    try {
      if (claimType === 'candidate') {
        const { error: rpcError } = await supabase.rpc('claim_candidate_profile');
        if (rpcError) throw rpcError;
        setLoading(false);
        router.replace('/(candidate)');
      } else if (claimType === 'company' && intendedCompanyId) {
        const { error: rpcError } = await supabase.rpc('claim_company_profile', {
          target_company_id: intendedCompanyId,
        });
        if (rpcError) throw rpcError;
        setLoading(false);
        router.replace('/(company)');
      } else {
        setLoading(false);
        setError('This invite link is missing its claim details. Contact support.');
      }
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Could not link your account. Contact support.');
    }
  };

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.content}>
          <View style={st.iconWrap}>
            <Ionicons name="shield-checkmark" size={28} color={T.accent} />
          </View>
          <Text style={st.title}>Set Your Password</Text>
          <Text style={st.subtitle}>
            You're claiming an existing Hiyame profile. Set a password to finish signing in.
          </Text>

          <View style={st.fieldWrap}>
            <Text style={st.label}>New Password</Text>
            <View style={[st.inputWrap, error ? st.inputError : null]}>
              <Ionicons name="lock-closed-outline" size={18} color={error ? T.danger : T.textMuted} />
              <TextInput
                style={st.input}
                placeholder="At least 6 characters"
                placeholderTextColor={T.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={T.textMuted} />
              </Pressable>
            </View>
            {error ? <Text style={st.errorText}>{error}</Text> : null}
          </View>

          <Pressable style={[st.button, loading && st.buttonDisabled]} onPress={handleClaim} disabled={loading}>
            {loading ? (
              <Text style={st.buttonText}>Finishing up...</Text>
            ) : (
              <>
                <Text style={st.buttonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color={T.textOnAccent} />
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg, paddingHorizontal: 20 },
  content: { flex: 1, justifyContent: 'center' },
  iconWrap: {
    width: 64, height: 64, borderRadius: 20, alignSelf: 'center',
    backgroundColor: T.accentBg, borderWidth: 1, borderColor: T.accentBg20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '800', color: T.textPrimary, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: T.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 32 },
  fieldWrap: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '700', color: T.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: T.surface, borderRadius: 14,
    borderWidth: 1.5, borderColor: T.border,
    paddingHorizontal: 16, height: 52,
  },
  inputError: { borderColor: T.danger, backgroundColor: T.dangerBg },
  input: { flex: 1, fontSize: 15, color: T.textPrimary, fontWeight: '500' },
  errorText: { fontSize: 12, color: T.danger, fontWeight: '500', marginTop: 6, marginLeft: 4 },
  button: {
    backgroundColor: T.accent, borderRadius: 50,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
    shadowColor: T.accent, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontSize: 17, fontWeight: '700', color: T.textOnAccent },
});
