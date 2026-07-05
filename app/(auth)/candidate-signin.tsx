import { useState, useRef, useEffect, useMemo} from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, TextInput, View, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette } from '@/lib/theme';

export default function CandidateSignInScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = () => {
    if (!validate()) return;
    setLoading(true);

    // Simulated auth delay — Supabase Auth integration in Milestone 2
    setTimeout(() => {
      setLoading(false);
      router.replace('/(candidate)/');
    }, 1200);
  };

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Back */}
          <Pressable style={st.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={T.textPrimary} />
          </Pressable>

          <Animated.View style={[st.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {/* Header */}
            <View style={st.iconRow}>
              <View style={st.iconWrap}>
                <Ionicons name="person" size={24} color={T.accent} />
              </View>
            </View>
            <Text style={st.title}>Career Professional</Text>
            <Text style={st.subtitle}>Sign in to access your matched opportunities</Text>

            {/* Email */}
            <View style={st.fieldWrap}>
              <Text style={st.label}>Email Address</Text>
              <View style={[st.inputWrap, errors.email ? st.inputError : null]}>
                <Ionicons name="mail-outline" size={18} color={errors.email ? T.danger : T.textMuted} />
                <TextInput
                  style={st.input}
                  placeholder="you@example.com"
                  placeholderTextColor={T.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  value={email}
                  onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: undefined })); }}
                />
              </View>
              {errors.email && <Text style={st.errorText}>{errors.email}</Text>}
            </View>

            {/* Password */}
            <View style={st.fieldWrap}>
              <Text style={st.label}>Password</Text>
              <View style={[st.inputWrap, errors.password ? st.inputError : null]}>
                <Ionicons name="lock-closed-outline" size={18} color={errors.password ? T.danger : T.textMuted} />
                <TextInput
                  style={st.input}
                  placeholder="Enter your password"
                  placeholderTextColor={T.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: undefined })); }}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={T.textMuted} />
                </Pressable>
              </View>
              {errors.password && <Text style={st.errorText}>{errors.password}</Text>}
            </View>

            {/* Forgot Password */}
            <Pressable style={st.forgotRow}>
              <Text style={st.forgotText}>Forgot password?</Text>
            </Pressable>

            {/* Spacer between forgot link and sign-in button */}
            <View style={st.spacer} />

            {/* Sign In Button */}
            <Pressable
              style={[st.signInButton, loading && st.signInButtonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
            >
              {loading ? (
                <Text style={st.signInText}>Signing in...</Text>
              ) : (
                <>
                  <Text style={st.signInText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color={T.textOnAccent} />
                </>
              )}
            </Pressable>
          </Animated.View>

          {/* Footer */}
          <View style={st.footer}>
            <Pressable style={st.registerRow} onPress={() => router.push('/(auth)/register')}>
              <Text style={st.registerLabel}>Don't have an account? </Text>
              <Text style={st.registerLink}>Create one</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg, paddingHorizontal: 20 },

  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: T.card, borderWidth: 1, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 8, marginBottom: 24,
  },

  content: { flex: 1 },

  iconRow: { marginBottom: 16 },
  iconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: T.accentBg, borderWidth: 1, borderColor: T.accentBg20,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.3, marginBottom: 4 },
  subtitle: { fontSize: 14, color: T.textSecondary, marginBottom: 32 },

  /* Form Fields */
  fieldWrap: { marginBottom: 20 },
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

  /* Forgot */
  forgotRow: { alignSelf: 'flex-end', marginTop: 4, marginBottom: 8 },
  forgotText: { fontSize: 13, fontWeight: '600', color: T.accent },

  /* Spacer */
  spacer: { height: 16 },

  /* Button */
  signInButton: {
    backgroundColor: T.accent, borderRadius: 50,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
    shadowColor: T.accent, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 4,
  },
  signInButtonDisabled: { opacity: 0.7 },
  signInText: { fontSize: 17, fontWeight: '700', color: T.textOnAccent },

  /* Footer */
  footer: { paddingBottom: 16 },
  registerRow: { flexDirection: 'row', justifyContent: 'center' },
  registerLabel: { fontSize: 14, color: T.textSecondary },
  registerLink: { fontSize: 14, fontWeight: '700', color: T.accent },
});
