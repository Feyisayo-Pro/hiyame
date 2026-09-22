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
import SkillsAssessmentModal from '@/components/SkillsAssessmentModal';
import { notify } from '@/lib/notify';
import { useTheme, ThemePalette, DISPLAY_FONT_FAMILY } from '@/lib/theme';
import { FULL_VERIFICATION_THRESHOLD, TOTAL_VERIFICATION_COMPONENTS } from '@/lib/verification';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Real component keys in verification_records — the same table
// app/(candidate)/index.tsx, profile.tsx and Insights already read. This
// screen used to be the only one of the four still reading purely from
// lib/useVerification.ts's local mock, which is why it could show "0/4
// Pending" for an account every other screen agreed was "4/4 Verified".
const REAL_COMPONENT_KEY: Record<string, string> = {
  identity: 'identity',
  video: 'video_intro',
  assessment: 'skills_assessment',
  review: 'employer_review',
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
    subtitle: 'Domain-Specific Evaluation',
    icon: 'shield-checkmark-outline',
    description: 'Complete a timed skills assessment in your primary domain. Results are scored and displayed as a verified badge on your profile.',
  },
  {
    key: 'review',
    title: 'Employer Review',
    subtitle: 'Reference from Past Employer',
    icon: 'star-outline',
    description: 'Request a verified review from a previous employer or client. Corporate-tier roles require this for matching eligibility.',
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
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [passedComponents, setPassedComponents] = useState<Set<string>>(new Set());

  const refetchRecords = useCallback(() => {
    if (!candidateId) return;
    supabase.from('verification_records').select('component, status').eq('candidate_id', candidateId).then(({ data }) => {
      setPassedComponents(new Set((data ?? []).filter((v) => v.status === 'passed').map((v) => v.component)));
    });
  }, [candidateId]);

  useEffect(() => {
    refetchRecords();
  }, [refetchRecords]);

  // Employer review's own request state — not a pass/fail like the other
  // two, so it needs a little more than "is it in passedComponents": once a
  // request is sent, the step shows "awaiting response" rather than the
  // generic "Begin Verification" button until it either resolves or expires.
  const [pendingReviewRequest, setPendingReviewRequest] = useState<{ employer_email: string } | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [employerName, setEmployerName] = useState('');
  const [employerEmail, setEmployerEmail] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  const refetchReviewRequest = useCallback(() => {
    if (!candidateId) return;
    supabase
      .from('employer_review_requests')
      .select('employer_email')
      .eq('candidate_id', candidateId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setPendingReviewRequest(data));
  }, [candidateId]);

  useEffect(() => {
    refetchReviewRequest();
  }, [refetchReviewRequest]);

  const toggleStep = useCallback((key: string) => {
    if (key === 'identity') {
      setShowSmileId(true);
    } else if (key === 'video') {
      setShowVideoModal(true);
    } else if (key === 'assessment') {
      setShowAssessmentModal(true);
    } else if (key === 'review') {
      setShowReviewForm(true);
    }
  }, []);

  const sendReviewRequest = useCallback(async () => {
    if (!employerName.trim()) {
      notify('Name required', "Enter the employer's name.");
      return;
    }
    if (!EMAIL_RE.test(employerEmail.trim())) {
      notify('Invalid email', 'Enter a valid email address.');
      return;
    }
    setSendingRequest(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('You need to be signed in.');
      const res = await fetch('/api/employer-review', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', employerName: employerName.trim(), employerEmail: employerEmail.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Could not send the request.');
      notify('Request sent', `We emailed ${employerEmail.trim()} a link to leave a review.`);
      setShowReviewForm(false);
      setEmployerName('');
      setEmployerEmail('');
      refetchReviewRequest();
    } catch (e: any) {
      notify('Could not send request', e?.message || 'Something went wrong. Please try again.');
    } finally {
      setSendingRequest(false);
    }
  }, [employerName, employerEmail, refetchReviewRequest]);

  const allCompleted: Record<string, boolean> = {
    identity: identityVerified || passedComponents.has(REAL_COMPONENT_KEY.identity),
    video: passedComponents.has(REAL_COMPONENT_KEY.video),
    assessment: passedComponents.has(REAL_COMPONENT_KEY.assessment),
    review: passedComponents.has(REAL_COMPONENT_KEY.review),
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

        {/* Step Cards */}
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

              {/* Action area — differs per step now that 3 of the 4 are
                  real: identity re-verifies, video can always be re-recorded,
                  a passed assessment/review just shows Verified with nothing
                  to press, and review's own request state (sent/awaiting)
                  replaces the button entirely while one is outstanding. */}
              {step.key === 'review' && showReviewForm ? (
                <View style={st.reviewForm}>
                  <TextInput
                    style={st.reviewInput}
                    value={employerName}
                    onChangeText={setEmployerName}
                    placeholder="Employer or client name"
                    placeholderTextColor={T.textMuted}
                  />
                  <TextInput
                    style={st.reviewInput}
                    value={employerEmail}
                    onChangeText={setEmployerEmail}
                    placeholder="Their email address"
                    placeholderTextColor={T.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <View style={st.reviewFormRow}>
                    <TouchableOpacity style={st.reviewCancelBtn} onPress={() => setShowReviewForm(false)} disabled={sendingRequest}>
                      <Text style={st.reviewCancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[st.stepButton, st.reviewSendBtn]} onPress={sendReviewRequest} disabled={sendingRequest}>
                      {sendingRequest ? <ActivityIndicator color={T.textOnAccent} size="small" /> : (
                        <>
                          <AppIcon name="paper-plane-outline" size={16} color={T.textOnAccent} />
                          <Text style={st.stepButtonText}>Send Request</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : step.key === 'review' && !isDone && pendingReviewRequest ? (
                <View style={[st.stepButton, st.stepButtonDone]}>
                  <AppIcon name="time-outline" size={18} color={T.textMuted} />
                  <Text style={[st.stepButtonText, st.stepButtonTextDone]} numberOfLines={1}>
                    Awaiting response from {pendingReviewRequest.employer_email}
                  </Text>
                </View>
              ) : isDone && (step.key === 'assessment' || step.key === 'review') ? null : (
                <TouchableOpacity
                  style={[st.stepButton, isDone && st.stepButtonDone]}
                  onPress={() => toggleStep(step.key)}
                  activeOpacity={0.7}
                >
                  <AppIcon
                    name={isDone ? 'refresh' : 'arrow-forward-circle-outline'}
                    size={18}
                    color={isDone ? T.textMuted : T.textOnAccent}
                  />
                  <Text style={[st.stepButtonText, isDone && st.stepButtonTextDone]}>
                    {step.key === 'identity'
                      ? (isDone ? 'Re-verify' : 'Begin Verification')
                      : step.key === 'video'
                      ? (isDone ? 'Re-record' : 'Record Introduction')
                      : step.key === 'assessment'
                      ? 'Begin Assessment'
                      : 'Request a Review'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

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

      <SkillsAssessmentModal
        visible={showAssessmentModal}
        onClose={() => setShowAssessmentModal(false)}
        onPassed={() => refetchRecords()}
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

  /* Step Card */
  stepCard: {
    marginHorizontal: 20, marginBottom: 14,
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

  /* Employer review inline request form */
  reviewForm: { gap: 10 },
  reviewInput: {
    borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: T.textPrimary,
  },
  reviewFormRow: { flexDirection: 'row', gap: 10 },
  reviewCancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingVertical: 12 },
  reviewCancelBtnText: { fontSize: 13, fontWeight: '700', color: T.textSecondary },
  reviewSendBtn: { flex: 1 },
});
