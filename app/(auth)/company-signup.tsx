import { useState, useMemo, useCallback } from 'react';
import {
  Animated,
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
import AppIcon from '@/components/AppIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette, DISPLAY_FONT_FAMILY } from '@/lib/theme';
import ScreenFrame from '@/components/ScreenFrame';
import { SubscriptionTier } from '@/lib/subscriptionStore';
import { supabase } from '@/lib/supabase';
import { friendlyAuthError, isAlreadyRegistered } from '@/lib/authErrors';
import FormField, { NO_NATIVE_OUTLINE } from '@/components/FormField';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';
import VerifyEmailModal from '@/components/VerifyEmailModal';
import { useShake } from '@/lib/useShake';
import { DURATION } from '@/lib/motion';
import PageHead from '@/components/PageHead';

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
    name: 'Pilot / Starter',
    price: '₦0',
    period: '/month',
    // Matches TIER_CONFIGS.pilot's real numbers (lib/subscriptionStore.ts)
    // — selecting this card sets selectedTier to 'pilot' below, so
    // advertising starter's actual higher numbers here (10/day, 3 matches)
    // would promise more than a new signup actually gets.
    tagline: 'Free, get started with up to 3 candidate reviews/day',
    features: ['3 candidate reviews/day', 'Basic filters', '1 active match', 'Email support'],
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

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const { shake, shakeStyle } = useShake();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showVerify, setShowVerify] = useState(false);

  // Step 0 — Account
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 1 — Corporate Identity
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [website, setWebsite] = useState('');

  // Step 2 — Industry & Scale
  const [industry, setIndustry] = useState('');
  const [industryOther, setIndustryOther] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [hqLocation, setHqLocation] = useState('');

  // Step 3 — Bio & Branding
  const [bio, setBio] = useState('');
  const [logoUploaded, setLogoUploaded] = useState(false);

  // Step 4 — Tier Selection
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('pilot');

  const clearError = useCallback((key: string) => {
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  }, []);

  // Real-time (on-blur) validation for step 0's account fields — Continue
  // already blocks advancing past a bad field, but that's still only
  // feedback on submit-of-the-step; this surfaces it the moment you leave
  // the field instead.
  const validateAccountField = useCallback((field: 'contactName' | 'email' | 'password') => {
    setErrors((e) => {
      const next = { ...e };
      if (field === 'contactName') {
        next.contactName = contactName.trim() ? '' : 'Your name is required';
      } else if (field === 'email') {
        if (!email.trim()) next.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Enter a valid email address';
        else next.email = '';
      } else if (field === 'password') {
        if (!password) next.password = 'Password is required';
        else if (password.length < 6) next.password = 'Password must be at least 6 characters';
        else next.password = '';
      }
      return next;
    });
  }, [contactName, email, password]);

  const validateStep = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!contactName.trim()) {
        newErrors.contactName = 'Your name is required';
      }
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
      else if (industry === 'Other' && !industryOther.trim()) newErrors.industryOther = 'Tell us what industry you\'re in';
      if (!companySize) newErrors.companySize = 'Select company size';
    } else if (step === 3) {
      if (!bio.trim()) newErrors.bio = 'A brief description is required';
    }
    // Step 4 (tier) always valid — has a default

    const hasErrors = Object.keys(newErrors).length > 0;
    // A summary alongside the per-field messages so there's something
    // visible near the Continue button (and something for the shake
    // animation to actually shake) even when the failing field is the
    // first one on the step, out of view above the fold.
    if (hasErrors) newErrors.general = 'Please fix the highlighted fields above.';
    setErrors(newErrors);
    return !hasErrors;
  }, [step, contactName, email, password, companyName, industry, industryOther, companySize, bio]);

  const handleNext = useCallback(async () => {
    if (!validateStep()) { shake(); return; }

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
          contact_name: contactName.trim(),
          legal_name: companyName.trim(),
          trading_name: companyName.trim(),
          industry: industry === 'Other' ? industryOther.trim() : industry,
          size_range: companySize,
          hq_location: hqLocation.trim(),
          website_url: website.trim(),
          description: bio.trim(),
          plan_tier: selectedTier,
        },
      },
    });

    if (error) {
      setLoading(false);
      setErrors((e) => ({ ...e, general: friendlyAuthError(error.message) }));
      shake();
      return;
    }

    setLoading(false);

    if (!data.session) {
      setShowVerify(true);
      return;
    }
    router.replace('/(company)');
  }, [step, validateStep, shake, selectedTier, contactName, email, password, companyName, industry, industryOther, companySize, hqLocation, website, bio]);

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

      <FormField label="Your Full Name *" error={errors.contactName}>
        {({ onFocus, onBlur, focused }) => (
          <>
            <AppIcon name="person-outline" size={18} color={errors.contactName ? T.danger : focused ? T.accent : T.textMuted} />
            <TextInput
              style={[st.input, NO_NATIVE_OUTLINE]}
              placeholder="e.g. Amara Osei"
              placeholderTextColor={T.textMuted}
              autoCapitalize="words"
              value={contactName}
              onChangeText={(t) => { setContactName(t); clearError('contactName'); }}
              onFocus={onFocus}
              onBlur={() => { onBlur(); validateAccountField('contactName'); }}
            />
          </>
        )}
      </FormField>

      <FormField label="Work Email *" error={errors.email}>
        {({ onFocus, onBlur, focused }) => (
          <>
            <AppIcon name="mail-outline" size={18} color={errors.email ? T.danger : focused ? T.accent : T.textMuted} />
            <TextInput
              style={[st.input, NO_NATIVE_OUTLINE]}
              placeholder="hiring@company.com"
              placeholderTextColor={T.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={(t) => { setEmail(t); clearError('email'); }}
              onFocus={onFocus}
              onBlur={() => { onBlur(); validateAccountField('email'); }}
            />
          </>
        )}
      </FormField>

      <FormField label="Password *" error={errors.password}>
        {({ onFocus, onBlur, focused }) => (
          <>
            <AppIcon name="lock-closed-outline" size={18} color={errors.password ? T.danger : focused ? T.accent : T.textMuted} />
            <TextInput
              style={[st.input, NO_NATIVE_OUTLINE]}
              placeholder="At least 6 characters"
              placeholderTextColor={T.textMuted}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              value={password}
              onChangeText={(t) => { setPassword(t); clearError('password'); }}
              onFocus={onFocus}
              onBlur={() => { onBlur(); validateAccountField('password'); }}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
              <AppIcon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={T.textMuted} />
            </Pressable>
          </>
        )}
      </FormField>
      <PasswordStrengthMeter password={password} />
    </>
  );

  const renderStep0 = () => (
    <>
      <Text style={st.stepTitle}>Corporate Identity</Text>
      <Text style={st.stepSubtitle}>Basic information about your organization</Text>

      <FormField label="Company Name *" error={errors.companyName}>
        {({ onFocus, onBlur, focused }) => (
          <>
            <AppIcon name="business-outline" size={18} color={errors.companyName ? T.danger : focused ? T.accent : T.textMuted} />
            <TextInput
              style={[st.input, NO_NATIVE_OUTLINE]}
              placeholder="e.g. Acme Corp"
              placeholderTextColor={T.textMuted}
              value={companyName}
              onChangeText={(t) => { setCompanyName(t); clearError('companyName'); }}
              autoCapitalize="words"
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </>
        )}
      </FormField>

      <FormField label="Registration / Tax ID" hint="Used for employer verification. Can be added later.">
        {({ onFocus, onBlur, focused }) => (
          <>
            <AppIcon name="document-text-outline" size={18} color={focused ? T.accent : T.textMuted} />
            <TextInput
              style={[st.input, NO_NATIVE_OUTLINE]}
              placeholder="Optional, e.g. RC12345678"
              placeholderTextColor={T.textMuted}
              value={taxId}
              onChangeText={setTaxId}
              autoCapitalize="characters"
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </>
        )}
      </FormField>

      <FormField label="Corporate Website">
        {({ onFocus, onBlur, focused }) => (
          <>
            <AppIcon name="globe-outline" size={18} color={focused ? T.accent : T.textMuted} />
            <TextInput
              style={[st.input, NO_NATIVE_OUTLINE]}
              placeholder="e.g. https://acmecorp.com"
              placeholderTextColor={T.textMuted}
              value={website}
              onChangeText={setWebsite}
              autoCapitalize="none"
              keyboardType="url"
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </>
        )}
      </FormField>
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
        {industry === 'Other' ? (
          <FormField style={st.fieldWrapMarginTop} error={errors.industryOther}>
            {({ onFocus, onBlur }) => (
              <TextInput
                style={[st.input, NO_NATIVE_OUTLINE]}
                placeholder="Tell us your industry"
                placeholderTextColor={T.textMuted}
                value={industryOther}
                onChangeText={(t) => { setIndustryOther(t); clearError('industryOther'); }}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            )}
          </FormField>
        ) : null}
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

      <FormField label="Headquarters Location">
        {({ onFocus, onBlur, focused }) => (
          <>
            <AppIcon name="location-outline" size={18} color={focused ? T.accent : T.textMuted} />
            <TextInput
              style={[st.input, NO_NATIVE_OUTLINE]}
              placeholder="e.g. Lagos, Nigeria"
              placeholderTextColor={T.textMuted}
              value={hqLocation}
              onChangeText={setHqLocation}
              autoCapitalize="words"
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </>
        )}
      </FormField>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={st.stepTitle}>Company Bio & Branding</Text>
      <Text style={st.stepSubtitle}>Stand out to top African talent</Text>

      <View style={st.fieldWrap}>
        <Text style={st.label}>Company Description *</Text>
        <FormField style={st.fieldWrapNoMargin} innerStyle={st.textAreaInner} error={errors.bio} hideErrorText>
          {({ onFocus, onBlur }) => (
            <TextInput
              style={[st.textArea, NO_NATIVE_OUTLINE]}
              placeholder="Tell candidates what makes your company a great place to work..."
              placeholderTextColor={T.textMuted}
              value={bio}
              onChangeText={(t) => { setBio(t); clearError('bio'); }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              onFocus={onFocus}
              onBlur={onBlur}
            />
          )}
        </FormField>
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
                <AppIcon name="checkmark-circle" size={28} color={T.emerald} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: T.emerald }}>Logo uploaded</Text>
              <Text style={{ fontSize: 12, color: T.textSecondary, marginTop: 2 }}>Tap to remove</Text>
            </>
          ) : (
            <>
              <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: T.accentBg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <AppIcon name="cloud-upload-outline" size={28} color={T.accent} />
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
                    <AppIcon name="checkmark-circle" size={14} color={isSelected ? T.accent : T.emerald} />
                    <Text style={{ fontSize: 12, color: T.textSecondary }}>{f}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={st.infoCard}>
        <AppIcon name="information-circle-outline" size={18} color={T.accent} />
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
      <PageHead title="Create Your Company Account" />
      <ScreenFrame maxWidth={560}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
          <Pressable style={st.backButton} onPress={handleBack}>
            <AppIcon name="arrow-back" size={20} color={T.textPrimary} />
          </Pressable>
          <Text style={{ fontSize: 12, fontWeight: '600', color: T.textMuted }}>Step {step + 1} of {TOTAL_STEPS}</Text>
        </View>

        <ScrollView
          contentContainerStyle={st.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <SwipeFadeContainer triggerKey={step} duration={DURATION.stagger} offset={40}>
            <Animated.View style={[{ paddingHorizontal: 20 }, shakeStyle]}>
              <StepProgress current={step} total={TOTAL_STEPS} T={T} />

              {/* Logo */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <AppIcon name="business" size={18} color={T.textOnAccent} />
                </View>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: T.textMuted }}>COMPANY REGISTRATION</Text>
                  <Text style={{ fontSize: 11, color: T.textMuted }}>{stepLabels[step]}</Text>
                </View>
              </View>

              {stepRenderers[step]()}

              {errors.general ? (
                <View style={st.generalErrorBanner}>
                  <AppIcon name="alert-circle" size={16} color={T.danger} />
                  <Text style={st.generalErrorText}>{errors.general}</Text>
                  {isAlreadyRegistered(errors.general) && (
                    <Pressable onPress={() => router.push('/(auth)/company-signin')}>
                      <Text style={st.generalErrorLink}>Sign in →</Text>
                    </Pressable>
                  )}
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
                      <AppIcon name="arrow-forward" size={18} color={T.textOnAccent} />
                    </>
                  ) : (
                    <>
                      <Text style={st.continueText}>Launch Dashboard</Text>
                      <AppIcon name="rocket-outline" size={18} color={T.textOnAccent} />
                    </>
                  )}
                </Pressable>
              </View>
            </Animated.View>
          </SwipeFadeContainer>
        </ScrollView>
      </KeyboardAvoidingView>
      </ScreenFrame>

      <VerifyEmailModal
        visible={showVerify}
        email={email.trim()}
        onClose={() => setShowVerify(false)}
        onVerified={() => {
          setShowVerify(false);
          router.replace('/(company)');
        }}
      />
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
  stepTitle: { fontSize: 24, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.3, marginBottom: 6, fontFamily: DISPLAY_FONT_FAMILY },
  stepSubtitle: { fontSize: 14, color: T.textSecondary, lineHeight: 20, marginBottom: 24 },
  fieldWrap: { marginBottom: 22 },
  fieldWrapNoMargin: { marginBottom: 0 },
  fieldWrapMarginTop: { marginTop: 8, marginBottom: 0 },
  label: { fontSize: 13, fontWeight: '700', color: T.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: { flex: 1, fontSize: 15, color: T.textPrimary, fontWeight: '500' },
  textAreaInner: { height: undefined, minHeight: 112, alignItems: 'flex-start', paddingVertical: 12 },
  textArea: { flex: 1, fontSize: 15, color: T.textPrimary, fontWeight: '500', minHeight: 88 },
  errorText: { fontSize: 12, color: T.danger, fontWeight: '500', marginTop: 4, marginLeft: 4 },
  hintText: { fontSize: 11, color: T.textMuted, marginTop: 4, marginLeft: 4 },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: T.accentBg, borderRadius: 14,
    padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: T.accentBg20,
  },
  infoText: { flex: 1, fontSize: 13, color: T.accentDim, lineHeight: 18, fontWeight: '500' },
  generalErrorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.dangerBg, borderRadius: 12, borderWidth: 1, borderColor: T.danger,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
  },
  generalErrorText: { flex: 1, fontSize: 13, fontWeight: '600', color: T.danger, lineHeight: 18 },
  generalErrorLink: { fontSize: 13, fontWeight: '800', color: T.danger, textDecorationLine: 'underline' },
  continueButton: {
    backgroundColor: T.accentSolid, borderRadius: 50,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
    shadowColor: T.accent, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 4,
  },
  continueDisabled: { opacity: 0.7 },
  continueText: { fontSize: 17, fontWeight: '700', color: T.textOnAccent },
});
