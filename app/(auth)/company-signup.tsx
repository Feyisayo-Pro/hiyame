import { useState, useMemo, useCallback } from 'react';
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette } from '@/lib/theme';
import { useSubscription, SubscriptionTier } from '@/lib/subscriptionStore';
import { supabase } from '@/lib/supabase';

/* ── Constants ── */

const TOTAL_STEPS = 5;

const INDUSTRIES = [
  'Technology', 'Financial Services', 'Healthcare', 'Education',
  'Manufacturing', 'Retail & E-Commerce', 'Energy', 'Agriculture',
  'Media & Entertainment', 'Logistics & Supply Chain', 'Consulting', 'Other',
];

const COMPANY_SIZES = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '500+ employees',
];

interface PlanCard {
  key: SubscriptionTier;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  popular?: boolean;
}

const PLANS: PlanCard[] = [
  {
    key: 'pilot',
    name: 'Pilot',
    price: '₦0',
    period: '/month',
    tagline: 'Try Hiyame with one active role',
    features: ['3 candidate reviews/day', 'Basic filters', '1 active match', 'Email support'],
  },
  {
    key: 'starter',
    name: 'Starter',
    price: '₦0',
    period: '/month',
    tagline: 'Get started for free',
    features: ['10 candidate reviews/day', 'Basic filters', '3 active matches', 'Email support'],
  },
  {
    key: 'growth',
    name: 'Growth',
    price: '₦250,000',
    period: '/month',
    tagline: 'For growing teams',
    features: ['50 candidate reviews/day', 'Advanced filters', '15 active matches', 'Priority support', 'Analytics dashboard'],
    popular: true,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: '₦650,000',
    period: '/month',
    tagline: 'Enterprise-grade hiring',
    features: ['Unlimited candidate reviews', 'All filters', 'Unlimited matches', 'Dedicated manager', 'API access', 'Custom branding'],
  },
];

/* ── Step Progress Bar ── */

function StepProgress({ current, total, T }: { current: number; total: number; T: ThemePalette }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0, marginBottom: 20 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            width: 10, height: 10, borderRadius: 5,
            backgroundColor: i <= current ? T.accent : T.border,
          }} />
          {i < total - 1 && (
            <View style={{
              width: 28, height: 2,
              backgroundColor: i < current ? T.accent : T.border,
            }} />
          )}
        </View>
      ))}
    </View>
  );
}

/* ── Selectable Chip ── */

function SelectChip({ label, selected, onPress, T }: {
  label: string; selected: boolean; onPress: () => void; T: ThemePalette;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
        borderWidth: 1.5,
        borderColor: selected ? T.accent : T.border,
        backgroundColor: selected ? T.accentBg : T.surface,
        marginRight: 8, marginBottom: 8,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: selected ? '700' : '500', color: selected ? T.accent : T.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ── Main Screen ── */

export default function CompanySignupScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const { setTier } = useSubscription();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 0 — Account
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 1 — Corporate Identity
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [website, setWebsite] = useState('');

  // Step 2 — Industry & Scale
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [hqLocation, setHqLocation] = useState('');

  // Step 3 — Bio & Branding
  const [bio, setBio] = useState('');
  const [logoUploaded, setLogoUploaded] = useState(false);

  // Step 4 — Tier Selection
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('starter');

  const clearError = useCallback((key: string) => {
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  }, []);

  const validateStep = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
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
    } else if (step === 1) {
      if (!companyName.trim()) newErrors.companyName = 'Company name is required';
    } else if (step === 2) {
      if (!industry) newErrors.industry = 'Select your industry';
      if (!companySize) newErrors.companySize = 'Select company size';
    } else if (step === 3) {
      if (!bio.trim()) newErrors.bio = 'A brief description is required';
    }
    // Step 4 (tier) always valid — has a default

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [step, email, password, companyName, industry, companySize, bio]);

  const handleNext = useCallback(async () => {
    if (!validateStep()) return;

    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
      return;
    }

    // Final submit. Company profile fields are stashed in auth user_metadata
    // rather than created directly — this project requires email confirmation,
    // so signUp() often returns no session yet (the create_company_and_claim
    // RPC needs auth.uid(), which doesn't exist until they confirm).
    // lib/useAuth.ts finishes the RPC call the first time a confirmed session
    // shows up.
    setLoading(true);
    setErrors((e) => ({ ...e, general: '' }));

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          pending_signup: 'company',
          legal_name: companyName.trim(),
          trading_name: companyName.trim(),
          industry,
          size_range: companySize,
          hq_location: hqLocation.trim(),
          website_url: website.trim(),
          description: bio.trim(),
        },
      },
    });

    if (error) {
      setLoading(false);
      setErrors((e) => ({ ...e, general: error.message }));
      return;
    }

    setTier(selectedTier);
    setLoading(false);

    if (!data.session) {
      setErrors((e) => ({ ...e, general: 'Check your email to confirm your account, then sign in.' }));
      return;
    }
    router.replace('/(company)');
  }, [step, validateStep, selectedTier, setTier, email, password, companyName, industry, companySize, hqLocation, website, bio]);

  const handleBack = useCallback(() => {
    if (step > 0) {
      setStep(step - 1);
      setErrors({});
    } else {
      router.back();
    }
  }, [step]);

  /* ── Step Renderers ── */

  const renderAccountStep = () => (
    <>
      <Text style={st.stepTitle}>Create Your Account</Text>
      <Text style={st.stepSubtitle}>You'll use this to sign in to your hiring workspace</Text>

      <View style={st.fieldWrap}>
        <Text style={st.label}>Work Email *</Text>
        <View style={[st.inputWrap, errors.email ? st.inputError : null]}>
          <Ionicons name="mail-outline" size={18} color={errors.email ? T.danger : T.textMuted} />
          <TextInput
            style={st.input}
            placeholder="hiring@company.com"
            placeholderTextColor={T.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={(t) => { setEmail(t); clearError('email'); }}
          />
        </View>
        {errors.email ? <Text style={st.errorText}>{errors.email}</Text> : null}
      </View>

      <View style={st.fieldWrap}>
        <Text style={st.label}>Password *</Text>
        <View style={[st.inputWrap, errors.password ? st.inputError : null]}>
          <Ionicons name="lock-closed-outline" size={18} color={errors.password ? T.danger : T.textMuted} />
          <TextInput
            style={st.input}
            placeholder="At least 6 characters"
            placeholderTextColor={T.textMuted}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            value={password}
            onChangeText={(t) => { setPassword(t); clearError('password'); }}
          />
          <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={T.textMuted} />
          </Pressable>
        </View>
        {errors.password ? <Text style={st.errorText}>{errors.password}</Text> : null}
      </View>
    </>
  );

  const renderStep0 = () => (
    <>
      <Text style={st.stepTitle}>Corporate Identity</Text>
      <Text style={st.stepSubtitle}>Basic information about your organization</Text>

      <View style={st.fieldWrap}>
        <Text style={st.label}>Company Name *</Text>
        <View style={[st.inputWrap, errors.companyName ? st.inputError : null]}>
          <Ionicons name="business-outline" size={18} color={errors.companyName ? T.danger : T.textMuted} />
          <TextInput
            style={st.input}
            placeholder="Acme Corp"
            placeholderTextColor={T.textMuted}
            value={companyName}
            onChangeText={(t) => { setCompanyName(t); clearError('companyName'); }}
            autoCapitalize="words"
          />
        </View>
        {errors.companyName ? <Text style={st.errorText}>{errors.companyName}</Text> : null}
      </View>

      <View style={st.fieldWrap}>
        <Text style={st.label}>Registration / Tax ID</Text>
        <View style={st.inputWrap}>
          <Ionicons name="document-text-outline" size={18} color={T.textMuted} />
          <TextInput
            style={st.input}
            placeholder="Optional - RC12345678"
            placeholderTextColor={T.textMuted}
            value={taxId}
            onChangeText={setTaxId}
            autoCapitalize="characters"
          />
        </View>
        <Text style={st.hintText}>Used for employer verification. Can be added later.</Text>
      </View>

      <View style={st.fieldWrap}>
        <Text style={st.label}>Corporate Website</Text>
        <View style={st.inputWrap}>
          <Ionicons name="globe-outline" size={18} color={T.textMuted} />
          <TextInput
            style={st.input}
            placeholder="https://acmecorp.com"
            placeholderTextColor={T.textMuted}
            value={website}
            onChangeText={setWebsite}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>
      </View>
    </>
  );

  const renderStep1 = () => (
    <>
      <Text style={st.stepTitle}>Industry & Scale</Text>
      <Text style={st.stepSubtitle}>Help us match you with the right talent pool</Text>

      <View style={st.fieldWrap}>
        <Text style={st.label}>Industry *</Text>
        {errors.industry ? <Text style={st.errorText}>{errors.industry}</Text> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
          {INDUSTRIES.map((ind) => (
            <SelectChip
              key={ind}
              label={ind}
              selected={industry === ind}
              onPress={() => { setIndustry(ind); clearError('industry'); }}
              T={T}
            />
          ))}
        </View>
      </View>

      <View style={st.fieldWrap}>
        <Text style={st.label}>Company Size *</Text>
        {errors.companySize ? <Text style={st.errorText}>{errors.companySize}</Text> : null}
        <View style={{ gap: 8, marginTop: 4 }}>
          {COMPANY_SIZES.map((size) => (
            <Pressable
              key={size}
              onPress={() => { setCompanySize(size); clearError('companySize'); }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                backgroundColor: companySize === size ? T.accentBg : T.surface,
                borderWidth: 1.5,
                borderColor: companySize === size ? T.accent : T.border,
                borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
              }}
            >
              <View style={{
                width: 20, height: 20, borderRadius: 10,
                borderWidth: 2,
                borderColor: companySize === size ? T.accent : T.border,
                alignItems: 'center', justifyContent: 'center',
              }}>
                {companySize === size && (
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: T.accent }} />
                )}
              </View>
              <Text style={{ fontSize: 14, fontWeight: companySize === size ? '700' : '500', color: companySize === size ? T.accent : T.textPrimary }}>
                {size}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={st.fieldWrap}>
        <Text style={st.label}>Headquarters Location</Text>
        <View style={st.inputWrap}>
          <Ionicons name="location-outline" size={18} color={T.textMuted} />
          <TextInput
            style={st.input}
            placeholder="Lagos, Nigeria"
            placeholderTextColor={T.textMuted}
            value={hqLocation}
            onChangeText={setHqLocation}
            autoCapitalize="words"
          />
        </View>
      </View>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={st.stepTitle}>Company Bio & Branding</Text>
      <Text style={st.stepSubtitle}>Stand out to top African talent</Text>

      <View style={st.fieldWrap}>
        <Text style={st.label}>Company Description *</Text>
        <View style={[st.textAreaWrap, errors.bio ? st.inputError : null]}>
          <TextInput
            style={st.textArea}
            placeholder="Tell candidates what makes your company a great place to work..."
            placeholderTextColor={T.textMuted}
            value={bio}
            onChangeText={(t) => { setBio(t); clearError('bio'); }}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          {errors.bio ? <Text style={st.errorText}>{errors.bio}</Text> : <View />}
          <Text style={st.hintText}>{bio.length}/300</Text>
        </View>
      </View>

      <View style={st.fieldWrap}>
        <Text style={st.label}>Company Logo</Text>
        <Pressable
          onPress={() => setLogoUploaded(!logoUploaded)}
          style={{
            borderWidth: 2, borderStyle: 'dashed',
            borderColor: logoUploaded ? T.emerald : T.border,
            borderRadius: 16, paddingVertical: 28,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: logoUploaded ? T.emeraldBg : T.surface,
          }}
        >
          {logoUploaded ? (
            <>
              <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: T.emerald + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Ionicons name="checkmark-circle" size={28} color={T.emerald} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: T.emerald }}>Logo uploaded</Text>
              <Text style={{ fontSize: 12, color: T.textSecondary, marginTop: 2 }}>Tap to remove</Text>
            </>
          ) : (
            <>
              <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: T.accentBg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Ionicons name="cloud-upload-outline" size={28} color={T.accent} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: T.textPrimary }}>Upload Logo</Text>
              <Text style={{ fontSize: 12, color: T.textSecondary, marginTop: 2 }}>PNG, JPG, or SVG (max 2MB)</Text>
            </>
          )}
        </Pressable>
        <Text style={[st.hintText, { marginTop: 6 }]}>Mock upload. In production this opens the device gallery.</Text>
      </View>
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={st.stepTitle}>Choose Your Plan</Text>
      <Text style={st.stepSubtitle}>Start free and upgrade anytime as you grow</Text>

      <View style={{ gap: 12, marginBottom: 8 }}>
        {PLANS.map((plan) => {
          const isSelected = selectedTier === plan.key;
          return (
            <Pressable
              key={plan.key}
              onPress={() => setSelectedTier(plan.key)}
              style={{
                backgroundColor: T.card, borderRadius: 16, padding: 16,
                borderWidth: isSelected ? 2 : 1,
                borderColor: isSelected ? T.accent : T.border,
              }}
            >
              {plan.popular && (
                <View style={{ position: 'absolute', top: -10, right: 16, backgroundColor: T.accent, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: T.textOnAccent }}>POPULAR</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: T.textPrimary }}>{plan.name}</Text>
                  <Text style={{ fontSize: 12, color: T.textSecondary }}>{plan.tagline}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: isSelected ? T.accent : T.textPrimary }}>{plan.price}</Text>
                    <Text style={{ fontSize: 11, color: T.textSecondary }}>{plan.period}</Text>
                  </View>
                  <View style={{
                    width: 22, height: 22, borderRadius: 11,
                    borderWidth: 2, borderColor: isSelected ? T.accent : T.border,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSelected && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: T.accent }} />}
                  </View>
                </View>
              </View>
              <View style={{ height: 1, backgroundColor: T.border, marginVertical: 10 }} />
              <View style={{ gap: 6 }}>
                {plan.features.map((f) => (
                  <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={14} color={isSelected ? T.accent : T.emerald} />
                    <Text style={{ fontSize: 12, color: T.textSecondary }}>{f}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={st.infoCard}>
        <Ionicons name="information-circle-outline" size={18} color={T.accent} />
        <Text style={st.infoText}>
          All plans include a 14-day free trial of premium features. You can change your plan anytime from Settings.
        </Text>
      </View>
    </>
  );

  const stepRenderers = [renderAccountStep, renderStep0, renderStep1, renderStep2, renderStep3];
  const stepLabels = ['Create Account', 'Corporate Identity', 'Industry & Scale', 'Bio & Branding', 'Choose Plan'];

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
          <Pressable style={st.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={20} color={T.textPrimary} />
          </Pressable>
          <Text style={{ fontSize: 12, fontWeight: '600', color: T.textMuted }}>Step {step + 1} of {TOTAL_STEPS}</Text>
        </View>

        <ScrollView
          contentContainerStyle={st.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <SwipeFadeContainer>
            <View style={{ paddingHorizontal: 20 }}>
              <StepProgress current={step} total={TOTAL_STEPS} T={T} />

              {/* Logo */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="business" size={18} color={T.textOnAccent} />
                </View>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: T.textMuted }}>COMPANY REGISTRATION</Text>
                  <Text style={{ fontSize: 11, color: T.textMuted }}>{stepLabels[step]}</Text>
                </View>
              </View>

              {stepRenderers[step]()}

              {errors.general ? (
                <View style={st.generalErrorBanner}>
                  <Ionicons name="alert-circle" size={16} color={T.danger} />
                  <Text style={st.generalErrorText}>{errors.general}</Text>
                </View>
              ) : null}

              {/* Continue / Submit Button */}
              <View style={{ marginTop: 8 }}>
                <Pressable
                  style={[st.continueButton, loading && st.continueDisabled]}
                  onPress={handleNext}
                  disabled={loading}
                >
                  {loading ? (
                    <Text style={st.continueText}>Creating account...</Text>
                  ) : step < TOTAL_STEPS - 1 ? (
                    <>
                      <Text style={st.continueText}>Continue</Text>
                      <Ionicons name="arrow-forward" size={18} color={T.textOnAccent} />
                    </>
                  ) : (
                    <>
                      <Text style={st.continueText}>Launch Dashboard</Text>
                      <Ionicons name="rocket-outline" size={18} color={T.textOnAccent} />
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </SwipeFadeContainer>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ── Styles ── */

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scrollContent: { paddingBottom: 40 },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: T.card, borderWidth: 1, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepTitle: { fontSize: 24, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.3, marginBottom: 6 },
  stepSubtitle: { fontSize: 14, color: T.textSecondary, lineHeight: 20, marginBottom: 24 },
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
  textAreaWrap: {
    backgroundColor: T.surface, borderRadius: 14,
    borderWidth: 1.5, borderColor: T.border,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  textArea: { fontSize: 15, color: T.textPrimary, fontWeight: '500', minHeight: 100 },
  errorText: { fontSize: 12, color: T.danger, fontWeight: '500', marginTop: 4, marginLeft: 4 },
  hintText: { fontSize: 11, color: T.textMuted, marginTop: 4, marginLeft: 4 },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: T.accentBg, borderRadius: 14,
    padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: T.accentBg20,
  },
  infoText: { flex: 1, fontSize: 13, color: T.accent, lineHeight: 18, fontWeight: '500' },
  generalErrorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.dangerBg, borderRadius: 12, borderWidth: 1, borderColor: T.danger,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
  },
  generalErrorText: { flex: 1, fontSize: 13, fontWeight: '600', color: T.danger, lineHeight: 18 },
  continueButton: {
    backgroundColor: T.accent, borderRadius: 50,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
    shadowColor: T.accent, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 4,
  },
  continueDisabled: { opacity: 0.7 },
  continueText: { fontSize: 17, fontWeight: '700', color: T.textOnAccent },
});
