import { useState, useCallback, useMemo} from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/Themed';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCandidateProfile } from '@/lib/candidateProfile';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import { useTheme, ThemePalette } from '@/lib/theme';

// ==========================================
// VERIFICATION STEP DEFINITIONS
// ==========================================
interface VerificationStep {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
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

  // Local state for dev simulation (will be replaced by useVerification context in production)
  const [completed, setCompleted] = useState<Record<string, boolean>>({
    identity: false,
    video: false,
    assessment: false,
    review: false,
  });

  const toggleStep = useCallback((key: string) => {
    setCompleted((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const completedCount = Object.values(completed).filter(Boolean).length;
  const isFullyVerified = completedCount === 4;
  const progressPercent = (completedCount / 4) * 100;

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
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
                    ? 'You are eligible for all tier matches'
                    : `${4 - completedCount} step${4 - completedCount !== 1 ? 's' : ''} remaining`}
                </Text>
              </View>
            </View>
            {isFullyVerified && (
              <MaterialCommunityIcons name="decagram" size={28} color={T.emerald} />
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
              <Ionicons name="checkmark-circle" size={24} color={T.emerald} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.verifiedBannerTitle}>Profile Fully Verified</Text>
              <Text style={st.verifiedBannerSub}>
                You now qualify for Corporate, Short-Term, and Gig tier matching. Companies can see your verified badge.
              </Text>
            </View>
          </View>
        )}

        {/* Gating Notice (when incomplete) */}
        {!isFullyVerified && (
          <View style={st.gatingNotice}>
            <Ionicons name="information-circle-outline" size={18} color={T.amber} />
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
          const isDone = completed[step.key];
          return (
            <View key={step.key} style={[st.stepCard, isDone && st.stepCardDone]}>
              {/* Step Number + Status */}
              <View style={st.stepTopRow}>
                <View style={st.stepNumberRow}>
                  <View style={[st.stepNumber, isDone && st.stepNumberDone]}>
                    {isDone ? (
                      <Ionicons name="checkmark" size={14} color={T.textOnAccent} />
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
                  <Ionicons name={step.icon} size={22} color={isDone ? T.emerald : T.accent} />
                </View>
                <Text style={st.stepDescription}>{step.description}</Text>
              </View>

              {/* Action Button (dev toggle) */}
              <TouchableOpacity
                style={[st.stepButton, isDone && st.stepButtonDone]}
                onPress={() => toggleStep(step.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isDone ? 'close-circle-outline' : 'arrow-forward-circle-outline'}
                  size={18}
                  color={isDone ? T.textMuted : T.textOnAccent}
                />
                <Text style={[st.stepButtonText, isDone && st.stepButtonTextDone]}>
                  {isDone ? 'Reset (Dev)' : 'Begin Verification'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Bottom Spacer */}
        <View style={{ height: 32 }} />
        </SwipeFadeContainer>
      </ScrollView>
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
  headerGreeting: { fontSize: 14, fontWeight: '600', color: T.accent, marginBottom: 2 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.3 },
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
  progressRingText: { fontSize: 14, fontWeight: '800', color: T.accent },
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
  tierChipTextActive: { color: T.accent },

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
  stepNumberText: { fontSize: 12, fontWeight: '800', color: T.accent },
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
    backgroundColor: T.accent,
  },
  stepButtonDone: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  stepButtonText: { fontSize: 13, fontWeight: '700', color: T.textOnAccent },
  stepButtonTextDone: { color: T.textMuted },
});
