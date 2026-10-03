import { useState, useCallback, useEffect, useMemo} from 'react';
import { ActivityIndicator, StyleSheet, View, ScrollView, TextInput, TouchableOpacity, Pressable } from 'react-native';
import { Text } from '@/components/Themed';
import AppIcon, { AppIconName } from '@/components/AppIcon';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCandidateProfile } from '@/lib/candidateProfile';
import { useVerification } from '@/lib/useVerification';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import ScreenFrame from '@/components/ScreenFrame';
import PageHead from '@/components/PageHead';
import SmileIdVerificationModal from '@/components/SmileIdVerificationModal';
import VideoIntroRecorderModal from '@/components/VideoIntroRecorderModal';
import { uploadCandidateCV } from '@/lib/uploadCandidateCV';
import { notify } from '@/lib/notify';
import { useTheme, ThemePalette, DISPLAY_FONT_FAMILY } from '@/lib/theme';
import { FULL_VERIFICATION_THRESHOLD, TOTAL_VERIFICATION_COMPONENTS } from '@/lib/verification';

// Real component keys in verification_records — the same table
// app/(candidate)/index.tsx, profile.tsx and Insights already read. This
// screen used to be the only one of the four still reading purely from
// lib/useVerification.ts's local mock, which is why it could show "0/4
// Pending" for an account every other screen agreed was "4/4 Verified".
const REAL_COMPONENT_KEY: Record<string, string> = {
  identity: 'identity',
  video: 'video_intro',
  assessment: 'skills_assessment',
  cv: 'cv_review',
};

// ==========================================
// VERIFICATION STEP DEFINITIONS
// ==========================================
interface VerificationStep {
  key: string;
  title: string;
  subtitle: string;
  icon: AppIconName;
  description: string;
}

const STEPS: VerificationStep[] = [
  {
    key: 'identity',
    title: 'Identity Check',
    subtitle: 'Government ID + Selfie Match',
    icon: 'id-card-outline',
    description: 'Upload a valid government-issued ID and take a live selfie for facial match verification. This confirms you are who you say you are.',
  },
  {
    key: 'video',
    title: 'Video Introduction',
    subtitle: '60-Second Professional Pitch',
    icon: 'videocam-outline',
    description: 'Record a short video introducing yourself, your expertise, and what you bring to the table. Companies use this to assess communication skills.',
  },
  {
    key: 'assessment',
    title: 'Skills Assessment',
    subtitle: 'Reviewed by the Hiyame Team',
    icon: 'shield-checkmark-outline',
    description: "Request a skills assessment in your primary domain. Hiyame's internal team runs it directly with you and marks it as a verified badge on your profile once complete.",
  },
  {
    key: 'cv',
    title: 'CV / Portfolio',
    subtitle: 'CV required, portfolio link optional',
    icon: 'document-text-outline',
    description: "Upload your CV as a PDF — required. You can also add a portfolio link. Hiyame's internal team reviews your CV before it counts toward verification.",
  },
];

// ==========================================
// COMPONENT
// ==========================================
export default function VerificationScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);

  const insets = useSafeAreaInsets();
  const { fullName, professionalTitle, profileCompleted } = useCandidateProfile();
  const { identityVerified, setIdentityVerified } = useVerification();
  const { candidateId } = useAuth();
  const [showSmileId, setShowSmileId] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [passedComponents, setPassedComponents] = useState<Set<string>>(new Set());
  // Skills assessment is no longer self-serve/auto-graded (2026-10-03) —
  // Hiyame's internal team runs it. A candidate request just upserts this
  // component's row to 'pending' (api/skills-assessment.ts); an admin flips
  // it to passed/failed once the team has actually assessed them.
  const [assessmentPending, setAssessmentPending] = useState(false);
  const [requestingAssessment, setRequestingAssessment] = useState(false);

  const refetchRecords = useCallback(() => {
    if (!candidateId) return;
    supabase.from('verification_records').select('component, status').eq('candidate_id', candidateId).then(({ data }) => {
      setPassedComponents(new Set((data ?? []).filter((v) => v.status === 'passed').map((v) => v.component)));
      setAssessmentPending((data ?? []).some((v) => v.component === 'skills_assessment' && v.status === 'pending'));
      setCvPending((data ?? []).some((v) => v.component === 'cv_review' && v.status === 'pending'));
    });
  }, [candidateId]);

  useEffect(() => {
    refetchRecords();
  }, [refetchRecords]);

  // CV upload (required) + portfolio link (optional) — replaces Employer
  // Review's slot in the checklist (2026-10-03). CV goes through
  // lib/uploadCandidateCV.ts's signed-URL flow, same shape as the video
  // intro; portfolio_url is just a text field the candidate can set
  // directly (grant update (portfolio_url) on candidates — see the
  // cv_portfolio_verification migration), no review attached to it.
  const [cvPending, setCvPending] = useState(false);
  const [uploadingCV, setUploadingCV] = useState(false);
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [portfolioInput, setPortfolioInput] = useState('');
  const [savingPortfolio, setSavingPortfolio] = useState(false);

  const refetchCandidateLinks = useCallback(() => {
    if (!candidateId) return;
    supabase.from('candidates').select('portfolio_url').eq('id', candidateId).maybeSingle().then(({ data }) => {
      setPortfolioUrl(data?.portfolio_url ?? '');
      setPortfolioInput(data?.portfolio_url ?? '');
    });
  }, [candidateId]);

  useEffect(() => {
    refetchCandidateLinks();
  }, [refetchCandidateLinks]);

  const requestAssessment = useCallback(async () => {
    setRequestingAssessment(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('You need to be signed in.');
      const res = await fetch('/api/skills-assessment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Could not send the request.');
      notify('Request sent', "Hiyame's team will reach out to schedule your skills assessment.");
      refetchRecords();
    } catch (e: any) {
      notify('Could not send request', e?.message || 'Something went wrong. Please try again.');
    } finally {
      setRequestingAssessment(false);
    }
  }, [refetchRecords]);

  const uploadCV = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.type !== 'application/pdf') {
        notify('Invalid file', 'Please upload your CV as a PDF.');
        return;
      }
      setUploadingCV(true);
      try {
        await uploadCandidateCV(file);
        notify('CV submitted', "Hiyame's team will review your CV.");
        refetchRecords();
      } catch (e: any) {
        notify('Could not upload CV', e?.message || 'Something went wrong. Please try again.');
      } finally {
        setUploadingCV(false);
      }
    };
    input.click();
  }, [refetchRecords]);

  const toggleStep = useCallback((key: string) => {
    if (key === 'identity') {
      setShowSmileId(true);
    } else if (key === 'video') {
      setShowVideoModal(true);
    } else if (key === 'assessment') {
      requestAssessment();
    } else if (key === 'cv') {
      uploadCV();
    }
  }, [requestAssessment, uploadCV]);

  const savePortfolioLink = useCallback(async () => {
    if (!candidateId) return;
    const trimmed = portfolioInput.trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      notify('Invalid link', 'Portfolio link must start with http:// or https://');
      return;
    }
    setSavingPortfolio(true);
    const { error } = await supabase.from('candidates').update({ portfolio_url: trimmed || null }).eq('id', candidateId);
    setSavingPortfolio(false);
    if (error) {
      notify('Could not save link', error.message);
      return;
    }
    setPortfolioUrl(trimmed);
    notify(trimmed ? 'Portfolio link saved' : 'Portfolio link removed', '');
  }, [candidateId, portfolioInput]);

  const allCompleted: Record<string, boolean> = {
    identity: identityVerified || passedComponents.has(REAL_COMPONENT_KEY.identity),
    video: passedComponents.has(REAL_COMPONENT_KEY.video),
    assessment: passedComponents.has(REAL_COMPONENT_KEY.assessment),
    cv: passedComponents.has(REAL_COMPONENT_KEY.cv),
  };
  const completedCount = Object.values(allCompleted).filter(Boolean).length;
  const isFullyVerified = completedCount >= FULL_VERIFICATION_THRESHOLD;
  const progressPercent = (completedCount / TOTAL_VERIFICATION_COMPONENTS) * 100;

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <PageHead title="Verification" />
      <ScreenFrame>
      <ScrollView
        contentContainerStyle={st.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SwipeFadeContainer>
        {/* Header with dynamic profile data */}
        <View style={st.header}>
          {profileCompleted && fullName ? (
            <>
              <Text style={st.headerGreeting}>Welcome, {fullName.split(' ')[0]}</Text>
              <Text style={st.headerTitle}>Verification Center</Text>
              {professionalTitle ? (
                <Text style={st.headerRole}>{professionalTitle}</Text>
              ) : null}
              <Text style={st.headerSub}>Complete all 4 steps to unlock full matching</Text>
            </>
          ) : (
            <>
              <Text style={st.headerTitle}>Verification Center</Text>
              <Text style={st.headerSub}>Complete all 4 steps to unlock full matching</Text>
            </>
          )}
        </View>

        {/* Progress Card */}
        <View style={st.progressCard}>
          <View style={st.progressHeader}>
            <View style={st.progressLeft}>
              <View style={[st.progressRing, isFullyVerified && st.progressRingComplete]}>
                <Text style={[st.progressRingText, isFullyVerified && st.progressRingTextComplete]}>
                  {completedCount}/4
                </Text>
              </View>
              <View>
                <Text style={st.progressTitle}>
                  {isFullyVerified ? 'Fully Verified' : 'Verification In Progress'}
                </Text>
                <Text style={st.progressSub}>
                  {isFullyVerified
                    ? (completedCount === TOTAL_VERIFICATION_COMPONENTS
                      ? 'You are eligible for all tier matches'
                      : 'Eligible for Short-Term matches, identity check is paused for now')
                    : `${TOTAL_VERIFICATION_COMPONENTS - completedCount} step${TOTAL_VERIFICATION_COMPONENTS - completedCount !== 1 ? 's' : ''} remaining`}
                </Text>
              </View>
            </View>
            {isFullyVerified && (
              <AppIcon name="decagram" size={28} color={T.emerald} />
            )}
          </View>

          {/* Progress Bar */}
          <View style={st.progressBarBg}>
            <View
              style={[
                st.progressBarFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: isFullyVerified ? T.emerald : T.accent,
                },
              ]}
            />
          </View>
        </View>

        {/* Fully Verified Banner */}
        {isFullyVerified && (
          <View style={st.verifiedBanner}>
            <View style={st.verifiedBannerIcon}>
              <AppIcon name="checkmark-circle" size={24} color={T.emerald} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.verifiedBannerTitle}>Profile Fully Verified</Text>
              <Text style={st.verifiedBannerSub}>
                {completedCount === TOTAL_VERIFICATION_COMPONENTS
                  ? 'You now qualify for Corporate, Short-Term, and Gig tier matching. Companies can see your verified badge.'
                  : 'You now qualify for Short-Term tier matching. Companies can see your verified badge.'}
              </Text>
            </View>
          </View>
        )}

        {/* Gating Notice — Corporate genuinely still needs all 4, identity
            included, regardless of the relaxed "fully verified" badge above. */}
        {completedCount < TOTAL_VERIFICATION_COMPONENTS && (
          <View style={st.gatingNotice}>
            <AppIcon name="information-circle-outline" size={18} color={T.amber} />
            <Text style={st.gatingNoticeText}>
              The Phase 3 matching engine requires all 4 verification components to be fulfilled before you can be matched with Corporate-tier roles.
            </Text>
          </View>
        )}

        {/* Tier Eligibility Summary */}
        <View style={st.tierSummary}>
          <Text style={st.tierSummaryTitle}>Tier Eligibility</Text>
          <View style={st.tierRow}>
            <View style={[st.tierChip, completedCount >= 4 ? st.tierChipActive : st.tierChipInactive]}>
              <View style={[st.tierDot, { backgroundColor: T.emerald }]} />
              <Text style={[st.tierChipText, completedCount >= 4 && st.tierChipTextActive]}>Corporate (4/4)</Text>
            </View>
            <View style={[st.tierChip, completedCount >= 3 ? st.tierChipActive : st.tierChipInactive]}>
              <View style={[st.tierDot, { backgroundColor: T.indigo }]} />
              <Text style={[st.tierChipText, completedCount >= 3 && st.tierChipTextActive]}>Short-Term (3/4)</Text>
            </View>
            <View style={[st.tierChip, st.tierChipActive]}>
              <View style={[st.tierDot, { backgroundColor: T.textMuted }]} />
              <Text style={[st.tierChipText, st.tierChipTextActive]}>Gig (0/4)</Text>
            </View>
          </View>
        </View>

        {/* Section Header */}
        <View style={st.sectionHeader}>
          <Text style={st.sectionTitle}>Verification Steps</Text>
          <Text style={st.sectionCount}>{completedCount} of 4 complete</Text>
        </View>

        {/* Step Cards — 2 per row, per the demo-prep design pass */}
        <View style={st.stepsGrid}>
        {STEPS.map((step, index) => {
          const isDone = allCompleted[step.key];
          return (
            <View key={step.key} style={[st.stepCard, isDone && st.stepCardDone]}>
              {/* Step Number + Status */}
              <View style={st.stepTopRow}>
                <View style={st.stepNumberRow}>
                  <View style={[st.stepNumber, isDone && st.stepNumberDone]}>
                    {isDone ? (
                      <AppIcon name="checkmark" size={14} color={T.textOnAccent} />
                    ) : (
                      <Text style={st.stepNumberText}>{index + 1}</Text>
                    )}
                  </View>
                  <View>
                    <Text style={[st.stepTitle, isDone && st.stepTitleDone]}>{step.title}</Text>
                    <Text style={st.stepSubtitle}>{step.subtitle}</Text>
                  </View>
                </View>
                <View style={[st.statusPill, isDone ? st.statusPillDone : st.statusPillPending]}>
                  <Text style={[st.statusPillText, isDone ? st.statusPillTextDone : st.statusPillTextPending]}>
                    {isDone ? 'Verified' : 'Pending'}
                  </Text>
                </View>
              </View>

              {/* Icon + Description */}
              <View style={st.stepBody}>
                <View style={[st.stepIconWrap, isDone && st.stepIconWrapDone]}>
                  <AppIcon name={step.icon} size={22} color={isDone ? T.emerald : T.accent} />
                </View>
                <Text style={st.stepDescription}>{step.description}</Text>
              </View>

              {/* Action area — differs per step now that all 4 are real:
                  identity re-verifies, video can always be re-recorded, a
                  passed assessment/cv just shows Verified with nothing to
                  press, and each one's own pending-review state replaces
                  the button entirely while a decision is outstanding. */}
              {step.key === 'assessment' && !isDone && assessmentPending ? (
                <View style={[st.stepButton, st.stepButtonDone]}>
                  <AppIcon name="time-outline" size={18} color={T.textMuted} />
                  <Text style={[st.stepButtonText, st.stepButtonTextDone]} numberOfLines={1}>
                    Awaiting review from the Hiyame team
                  </Text>
                </View>
              ) : step.key === 'cv' && !isDone && cvPending ? (
                <View style={[st.stepButton, st.stepButtonDone]}>
                  <AppIcon name="time-outline" size={18} color={T.textMuted} />
                  <Text style={[st.stepButtonText, st.stepButtonTextDone]} numberOfLines={1}>
                    CV submitted — awaiting review from the Hiyame team
                  </Text>
                </View>
              ) : isDone && (step.key === 'assessment' || step.key === 'cv') ? null : (
                <TouchableOpacity
                  style={[st.stepButton, isDone && st.stepButtonDone]}
                  onPress={() => toggleStep(step.key)}
                  activeOpacity={0.7}
                  disabled={(step.key === 'assessment' && requestingAssessment) || (step.key === 'cv' && uploadingCV)}
                >
                  {(step.key === 'assessment' && requestingAssessment) || (step.key === 'cv' && uploadingCV) ? (
                    <ActivityIndicator color={T.textOnAccent} size="small" />
                  ) : (
                    <AppIcon
                      name={isDone ? 'refresh' : 'arrow-forward-circle-outline'}
                      size={18}
                      color={isDone ? T.textMuted : T.textOnAccent}
                    />
                  )}
                  <Text style={[st.stepButtonText, isDone && st.stepButtonTextDone]}>
                    {step.key === 'identity'
                      ? (isDone ? 'Re-verify' : 'Begin Verification')
                      : step.key === 'video'
                      ? (isDone ? 'Re-record' : 'Record Introduction')
                      : step.key === 'assessment'
                      ? 'Request Assessment'
                      : (isDone ? 'Replace CV' : 'Upload CV (required)')}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Portfolio link — optional, independent of CV review, so it
                  always shows for this step regardless of CV status. */}
              {step.key === 'cv' && (
                <View style={st.portfolioRow}>
                  <TextInput
                    style={st.portfolioInput}
                    value={portfolioInput}
                    onChangeText={setPortfolioInput}
                    placeholder="Portfolio link (optional)"
                    placeholderTextColor={T.textMuted}
                    autoCapitalize="none"
                    keyboardType="url"
                    spellCheck={false}
                  />
                  {portfolioInput.trim() !== portfolioUrl && (
                    <TouchableOpacity style={st.portfolioSaveBtn} onPress={savePortfolioLink} disabled={savingPortfolio}>
                      {savingPortfolio ? <ActivityIndicator color={T.textOnAccent} size="small" /> : <Text style={st.portfolioSaveBtnText}>Save</Text>}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}
        </View>

        {/* Bottom Spacer */}
        <View style={{ height: 32 }} />
        </SwipeFadeContainer>
      </ScrollView>
      </ScreenFrame>

      <SmileIdVerificationModal
        visible={showSmileId}
        onClose={() => setShowSmileId(false)}
        onVerified={() => setIdentityVerified(true)}
        userId={fullName || 'candidate-demo'}
      />

      <VideoIntroRecorderModal
        visible={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        onSubmitted={() => refetchRecords()}
      />
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================
const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scrollContent: { paddingBottom: 24 },

  /* Header */
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerGreeting: { fontSize: 14, fontWeight: '600', color: T.accentDim, marginBottom: 2 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.3, fontFamily: DISPLAY_FONT_FAMILY },
  headerRole: { fontSize: 13, fontWeight: '600', color: T.textSecondary, marginTop: 2 },
  headerSub: { fontSize: 13, color: T.textMuted, marginTop: 4 },

  /* Progress Card */
  progressCard: {
    margin: 20, marginTop: 16,
    backgroundColor: T.card,
    borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: T.border,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  progressLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  progressRing: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 3, borderColor: T.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  progressRingComplete: { borderColor: T.emerald, backgroundColor: T.emeraldBg },
  progressRingText: { fontSize: 14, fontWeight: '800', color: T.accentDim },
  progressRingTextComplete: { color: T.emerald },
  progressTitle: { fontSize: 16, fontWeight: '700', color: T.textPrimary },
  progressSub: { fontSize: 12, color: T.textMuted, marginTop: 2 },
  progressBarBg: {
    height: 6, backgroundColor: T.surface, borderRadius: 3, overflow: 'hidden',
  },
  progressBarFill: { height: 6, borderRadius: 3 },

  /* Verified Banner */
  verifiedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: T.emeraldBg, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: T.emerald,
  },
  verifiedBannerIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: T.emeraldBg, alignItems: 'center', justifyContent: 'center',
  },
  verifiedBannerTitle: { fontSize: 15, fontWeight: '700', color: T.emerald },
  verifiedBannerSub: { fontSize: 12, color: T.textSecondary, marginTop: 2, lineHeight: 16 },

  /* Gating Notice */
  gatingNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: T.amberBg, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: T.amber,
  },
  gatingNoticeText: { flex: 1, fontSize: 12, color: T.textSecondary, lineHeight: 17, fontWeight: '500' },

  /* Tier Summary */
  tierSummary: { marginHorizontal: 20, marginBottom: 20 },
  tierSummaryTitle: { fontSize: 13, fontWeight: '700', color: T.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  tierRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tierChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
  },
  tierChipActive: { backgroundColor: T.accentBg, borderColor: T.accentBg20 },
  tierChipInactive: { backgroundColor: T.surface, borderColor: T.border },
  tierDot: { width: 6, height: 6, borderRadius: 3 },
  tierChipText: { fontSize: 12, fontWeight: '600', color: T.textMuted },
  tierChipTextActive: { color: T.accentDim },

  /* Section Header */
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: T.textPrimary },
  sectionCount: { fontSize: 13, color: T.textMuted, fontWeight: '600' },

  /* Step Cards grid — two per row on wide-enough screens, wrapping to one
     per row below ~560px (two 260px cards + the row gap). */
  stepsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 20, marginBottom: 14 },
  stepCard: {
    flexGrow: 1, flexBasis: 260, minWidth: 260,
    backgroundColor: T.card, borderRadius: 16,
    padding: 18, borderWidth: 1, borderColor: T.border,
  },
  stepCardDone: { borderColor: T.emerald },
  stepTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  stepNumberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  stepNumber: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumberDone: { backgroundColor: T.emerald, borderColor: T.emerald },
  stepNumberText: { fontSize: 12, fontWeight: '800', color: T.accentDim },
  stepTitle: { fontSize: 15, fontWeight: '700', color: T.textPrimary },
  stepTitleDone: { color: T.emerald },
  stepSubtitle: { fontSize: 11, color: T.textMuted, marginTop: 2 },

  /* Status Pill */
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusPillDone: { backgroundColor: T.emeraldBg },
  statusPillPending: { backgroundColor: T.amberBg },
  statusPillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  statusPillTextDone: { color: T.emerald },
  statusPillTextPending: { color: T.amber },

  /* Step Body */
  stepBody: { flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'flex-start' },
  stepIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepIconWrapDone: { backgroundColor: T.emeraldBg, borderColor: T.emerald },
  stepDescription: { flex: 1, fontSize: 13, color: T.textSecondary, lineHeight: 18 },

  /* Step Button */
  stepButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 10,
    backgroundColor: T.accentSolid,
  },
  stepButtonDone: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  stepButtonText: { fontSize: 13, fontWeight: '700', color: T.textOnAccent },
  stepButtonTextDone: { color: T.textMuted, flexShrink: 1 },

  /* Portfolio link — optional, inline under the CV step's own action */
  portfolioRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  portfolioInput: {
    flex: 1,
    borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 13.5, color: T.textPrimary,
  },
  portfolioSaveBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingHorizontal: 16, backgroundColor: T.accentSolid },
  portfolioSaveBtnText: { fontSize: 13, fontWeight: '700', color: T.textOnAccent },
});
