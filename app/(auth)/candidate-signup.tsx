import { useState, useMemo} from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCandidateProfile } from '@/lib/candidateProfile';
import { useTheme, ThemePalette } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

const SUGGESTED_SKILLS = [
  'React Native', 'TypeScript', 'Node.js', 'Python', 'PostgreSQL',
  'AWS', 'Figma', 'UI/UX Design', 'Product Management', 'Data Analysis',
  'DevOps', 'Flutter', 'Go', 'Rust', 'Machine Learning',
];

export default function CandidateSignupScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);

  const { setProfile } = useCandidateProfile();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [professionalTitle, setProfessionalTitle] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [coreSkills, setCoreSkills] = useState<string[]>([]);
  const [rateInput, setRateInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !coreSkills.includes(trimmed) && coreSkills.length < 8) {
      setCoreSkills([...coreSkills, trimmed]);
      setSkillInput('');
      setErrors((e) => ({ ...e, skills: '' }));
    }
  };

  const removeSkill = (skill: string) => {
    setCoreSkills(coreSkills.filter((s) => s !== skill));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
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
    if (!fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!professionalTitle.trim()) newErrors.title = 'Professional title is required';
    if (coreSkills.length === 0) newErrors.skills = 'Add at least one core skill';
    if (!rateInput.trim()) {
      newErrors.rate = 'Target rate is required';
    } else if (isNaN(Number(rateInput)) || Number(rateInput) <= 0) {
      newErrors.rate = 'Enter a valid rate amount';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setErrors((e) => ({ ...e, general: '' }));

    // Profile fields are stashed in auth user_metadata rather than inserted into
    // `candidates` directly — this project requires email confirmation, so
    // signUp() often returns no session yet (RLS needs auth.uid(), which doesn't
    // exist until they confirm). lib/useAuth.ts finishes creating the real
    // candidates row the first time a confirmed session shows up.
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          pending_signup: 'candidate',
          full_name: fullName.trim(),
          core_skills: coreSkills,
          target_min_rate: Number(rateInput),
        },
      },
    });

    if (error) {
      setLoading(false);
      setErrors((e) => ({ ...e, general: error.message }));
      return;
    }

    setProfile({
      fullName: fullName.trim(),
      professionalTitle: professionalTitle.trim(),
      coreSkills,
      targetMinRate: Number(rateInput),
      photos: [],
    });

    setLoading(false);
    if (!data.session) {
      // No session yet — confirmation email sent, nothing more to do here until
      // they confirm and sign in for the first time.
      setErrors((e) => ({ ...e, general: 'Check your email to confirm your account, then sign in.' }));
      return;
    }
    router.replace('/(candidate)/verification');
  };

  const availableSuggestions = SUGGESTED_SKILLS.filter((s) => !coreSkills.includes(s));

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={st.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={T.textPrimary} />
        </Pressable>

        <ScrollView
          contentContainerStyle={st.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <SwipeFadeContainer>
            <View style={st.headerSection}>
              <View style={st.stepIndicator}>
                <View style={st.stepDotActive} />
                <View style={st.stepLine} />
                <View style={st.stepDot} />
              </View>
              <Text style={st.title}>Set Up Your Profile</Text>
              <Text style={st.subtitle}>
                This information helps us match you with the right opportunities. You'll complete verification next.
              </Text>
            </View>

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
                  onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: '' })); }}
                />
              </View>
              {errors.email ? <Text style={st.errorText}>{errors.email}</Text> : null}
            </View>

            <View style={st.fieldWrap}>
              <Text style={st.label}>Password</Text>
              <View style={[st.inputWrap, errors.password ? st.inputError : null]}>
                <Ionicons name="lock-closed-outline" size={18} color={errors.password ? T.danger : T.textMuted} />
                <TextInput
                  style={st.input}
                  placeholder="At least 6 characters"
                  placeholderTextColor={T.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: '' })); }}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={T.textMuted} />
                </Pressable>
              </View>
              {errors.password ? <Text style={st.errorText}>{errors.password}</Text> : null}
            </View>

            <View style={st.fieldWrap}>
              <Text style={st.label}>Full Name</Text>
              <View style={[st.inputWrap, errors.fullName ? st.inputError : null]}>
                <Ionicons name="person-outline" size={18} color={errors.fullName ? T.danger : T.textMuted} />
                <TextInput
                  style={st.input}
                  placeholder="Amara Osei"
                  placeholderTextColor={T.textMuted}
                  autoCapitalize="words"
                  value={fullName}
                  onChangeText={(t) => { setFullName(t); setErrors((e) => ({ ...e, fullName: '' })); }}
                />
              </View>
              {errors.fullName ? <Text style={st.errorText}>{errors.fullName}</Text> : null}
            </View>

            <View style={st.fieldWrap}>
              <Text style={st.label}>Professional Title</Text>
              <View style={[st.inputWrap, errors.title ? st.inputError : null]}>
                <Ionicons name="briefcase-outline" size={18} color={errors.title ? T.danger : T.textMuted} />
                <TextInput
                  style={st.input}
                  placeholder="Senior Backend Engineer"
                  placeholderTextColor={T.textMuted}
                  autoCapitalize="words"
                  value={professionalTitle}
                  onChangeText={(t) => { setProfessionalTitle(t); setErrors((e) => ({ ...e, title: '' })); }}
                />
              </View>
              {errors.title ? <Text style={st.errorText}>{errors.title}</Text> : null}
            </View>

            <View style={st.fieldWrap}>
              <Text style={st.label}>Core Skills</Text>
              <View style={[st.inputWrap, errors.skills ? st.inputError : null]}>
                <Ionicons name="code-slash-outline" size={18} color={errors.skills ? T.danger : T.textMuted} />
                <TextInput
                  style={st.input}
                  placeholder="Type a skill and press add"
                  placeholderTextColor={T.textMuted}
                  value={skillInput}
                  onChangeText={setSkillInput}
                  onSubmitEditing={() => addSkill(skillInput)}
                  returnKeyType="done"
                />
                {skillInput.trim().length > 0 && (
                  <Pressable style={st.addSkillBtn} onPress={() => addSkill(skillInput)} hitSlop={8}>
                    <Ionicons name="add" size={18} color={T.textOnAccent} />
                  </Pressable>
                )}
              </View>
              {errors.skills ? <Text style={st.errorText}>{errors.skills}</Text> : null}

              {coreSkills.length > 0 && (
                <View style={st.skillsRow}>
                  {coreSkills.map((skill) => (
                    <View key={skill} style={st.skillChip}>
                      <Text style={st.skillChipText}>{skill}</Text>
                      <Pressable onPress={() => removeSkill(skill)} hitSlop={6}>
                        <Ionicons name="close" size={14} color={T.accent} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {coreSkills.length < 8 && (
                <View style={st.suggestionsWrap}>
                  <Text style={st.suggestionsLabel}>Suggestions:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={st.suggestionsRow}>
                      {availableSuggestions.slice(0, 6).map((skill) => (
                        <Pressable key={skill} style={st.suggestionChip} onPress={() => addSkill(skill)}>
                          <Ionicons name="add" size={12} color={T.textSecondary} />
                          <Text style={st.suggestionText}>{skill}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={st.fieldWrap}>
              <Text style={st.label}>Target Minimum Rate ($/month)</Text>
              <View style={[st.inputWrap, errors.rate ? st.inputError : null]}>
                <Text style={[st.currencyPrefix, errors.rate ? { color: T.danger } : null]}>$</Text>
                <TextInput
                  style={st.input}
                  placeholder="5000"
                  placeholderTextColor={T.textMuted}
                  keyboardType="numeric"
                  value={rateInput}
                  onChangeText={(t) => { setRateInput(t.replace(/[^0-9]/g, '')); setErrors((e) => ({ ...e, rate: '' })); }}
                />
                <Text style={st.rateSuffix}>/mo</Text>
              </View>
              {errors.rate ? <Text style={st.errorText}>{errors.rate}</Text> : null}
            </View>

            <View style={st.infoCard}>
              <Ionicons name="shield-checkmark-outline" size={18} color={T.accent} />
              <Text style={st.infoText}>
                After setting up your profile, you'll be taken to the Verification Center to complete your 4-step verification (Identity, Video Intro, Skills Assessment, Employer Review).
              </Text>
            </View>

            {errors.general ? (
              <View style={st.generalErrorBanner}>
                <Ionicons name="alert-circle" size={16} color={T.danger} />
                <Text style={st.generalErrorText}>{errors.general}</Text>
              </View>
            ) : null}

            <Pressable
              style={[st.submitButton, loading && st.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <Text style={st.submitText}>Saving profile...</Text>
              ) : (
                <>
                  <Text style={st.submitText}>Continue to Verification</Text>
                  <Ionicons name="arrow-forward" size={18} color={T.textOnAccent} />
                </>
              )}
            </Pressable>
          </SwipeFadeContainer>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 40 },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: T.card, borderWidth: 1, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 8, marginBottom: 16,
  },
  headerSection: { marginBottom: 28 },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', gap: 0, marginBottom: 20 },
  stepDotActive: { width: 10, height: 10, borderRadius: 5, backgroundColor: T.accent },
  stepLine: { width: 40, height: 2, backgroundColor: T.border },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: T.border },
  title: { fontSize: 24, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.3, marginBottom: 6 },
  subtitle: { fontSize: 14, color: T.textSecondary, lineHeight: 20 },
  fieldWrap: { marginBottom: 22 },
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
  currencyPrefix: { fontSize: 18, fontWeight: '700', color: T.textPrimary },
  rateSuffix: { fontSize: 14, color: T.textMuted, fontWeight: '500' },
  addSkillBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: T.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  skillChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: T.accentBg, borderWidth: 1, borderColor: T.accentBg20,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  skillChipText: { fontSize: 13, fontWeight: '600', color: T.accent },
  suggestionsWrap: { marginTop: 10 },
  suggestionsLabel: { fontSize: 11, color: T.textMuted, fontWeight: '600', marginBottom: 6 },
  suggestionsRow: { flexDirection: 'row', gap: 6 },
  suggestionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  suggestionText: { fontSize: 12, color: T.textSecondary, fontWeight: '500' },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: T.accentBg, borderRadius: 14,
    padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: T.accentBg20,
  },
  infoText: { flex: 1, fontSize: 13, color: T.accent, lineHeight: 18, fontWeight: '500' },
  generalErrorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.dangerBg, borderRadius: 12, borderWidth: 1, borderColor: T.danger,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
  },
  generalErrorText: { flex: 1, fontSize: 13, fontWeight: '600', color: T.danger, lineHeight: 18 },
  submitButton: {
    backgroundColor: T.accent, borderRadius: 50,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
    shadowColor: T.accent, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 4,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitText: { fontSize: 17, fontWeight: '700', color: T.textOnAccent },
});
