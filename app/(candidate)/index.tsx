import { useCallback, useState, useMemo} from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCandidateProfile } from '@/lib/candidateProfile';
import { useVerification } from '@/lib/useVerification';
import { useApplicationStore } from '@/lib/applicationStore';
import { Role } from '@/lib/mock-data';
import OpportunityCard from '@/components/OpportunityCard';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import { useTheme, useThemeToggle, ThemePalette } from '@/lib/theme';

const FEATURED_ROLES: Role[] = [
  {
    id: 'home-corp-1',
    tier: 'corporate',
    title: 'Corporate Accountant',
    function: 'Finance',
    required_skills: { must_have: ['IFRS', 'Financial Reporting', 'SAP'], nice_to_have: ['CPA', 'Audit'] },
    experience_level: 'senior',
    location_type: 'hybrid',
    location_city: 'Lagos',
    location_country: 'Nigeria',
    contract_length: 'Permanent',
    rate_min: 4500,
    rate_max: 7000,
    rate_type: 'monthly',
    start_date: '2026-08-15',
    company_size_band: '501–1000 employees',
    company_industry: 'Banking & Finance',
    visibility_description: 'A top-tier pan-African bank expanding its corporate accounting division.',
    match_score: 92,
    status: 'matching',
    created_at: '2026-07-01',
  },
  {
    id: 'home-st-1',
    tier: 'short_term',
    title: 'Project Auditor',
    function: 'Audit',
    required_skills: { must_have: ['Internal Audit', 'Risk Assessment', 'Excel'], nice_to_have: ['CISA', 'Data Analytics'] },
    experience_level: 'mid',
    location_type: 'remote',
    contract_length: '6 months',
    rate_min: 3000,
    rate_max: 5000,
    rate_type: 'monthly',
    start_date: '2026-09-01',
    company_size_band: '51–200 employees',
    company_industry: 'Consulting',
    visibility_description: 'An advisory firm seeking a project auditor for a 6-month engagement.',
    match_score: 85,
    status: 'matching',
    created_at: '2026-07-02',
  },
  {
    id: 'home-gig-1',
    tier: 'gig',
    title: 'Freelance Bookkeeper',
    function: 'Bookkeeping',
    required_skills: { must_have: ['QuickBooks', 'Reconciliation', 'Invoicing'], nice_to_have: ['Xero', 'Payroll'] },
    experience_level: 'junior',
    location_type: 'remote',
    contract_length: 'Ongoing',
    rate_min: 15,
    rate_max: 30,
    rate_type: 'hourly',
    start_date: 'Flexible',
    company_size_band: '1–10 employees',
    company_industry: 'Small Business',
    visibility_description: 'Multiple small businesses seeking freelance bookkeeping support.',
    match_score: 0,
    status: 'matching',
    created_at: '2026-07-03',
  },
];

export default function CandidateHomeScreen() {
  const T = useTheme();
  const { mode, toggleTheme } = useThemeToggle();
  const st = useMemo(() => makeStyles(T), [T]);

  const { fullName, professionalTitle, coreSkills, targetMinRate } = useCandidateProfile();
  const verification = useVerification();
  const { applyToRole, hasApplied, joinGigWaitlist, isOnWaitlist } = useApplicationStore();
  const [refreshing, setRefreshing] = useState(false);

  const { completedCount, totalCount, isFullyVerified } = verification;
  const firstName = fullName ? fullName.split(' ')[0] : 'Professional';
  const progressPercent = (completedCount / totalCount) * 100;

  const checklistItems = [
    { icon: 'id-card-outline' as const, label: 'Identity Check', done: verification.identityVerified },
    { icon: 'videocam-outline' as const, label: 'Video Introduction', done: verification.videoIntroUploaded },
    { icon: 'shield-checkmark-outline' as const, label: 'Skills Assessment', done: verification.assessmentCompleted },
    { icon: 'star-outline' as const, label: 'Employer Review', done: verification.employerReviewSecured },
  ];

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} colors={[T.accent]} />}
      >
        <SwipeFadeContainer>
        {/* Header */}
        <View style={st.header}>
          <View style={st.headerRow}>
            <View style={st.profileRow}>
              <View style={st.avatar}>
                <Ionicons name="person" size={16} color={T.accent} />
              </View>
              <View>
                <Text style={st.greeting}>Good morning</Text>
                <Text style={st.userName}>{firstName}</Text>
              </View>
            </View>
            <View style={st.headerActions}>
              <Pressable style={st.iconBtn} onPress={toggleTheme}>
                <Ionicons name={mode === 'light' ? 'sunny-outline' : 'moon-outline'} size={20} color={T.textSecondary} />
              </Pressable>
              <Pressable style={st.iconBtn} onPress={() => router.replace('/(auth)/welcome')}>
                <Ionicons name="log-out-outline" size={20} color={T.textSecondary} />
              </Pressable>
            </View>
          </View>
          {professionalTitle ? (
            <Text style={st.titleBadge}>{professionalTitle}</Text>
          ) : null}
        </View>

        {/* Verification Score Ring */}
        <View style={st.scoreCard}>
          <View style={st.scoreHeader}>
            <View style={st.scoreLeft}>
              <View style={[st.scoreRing, isFullyVerified && st.scoreRingComplete]}>
                <Text style={[st.scoreRingText, isFullyVerified && st.scoreRingTextComplete]}>
                  {completedCount}/{totalCount}
                </Text>
              </View>
              <View>
                <Text style={st.scoreTitle}>
                  {isFullyVerified ? 'Profile Verified' : 'Verification In Progress'}
                </Text>
                <Text style={st.scoreSub}>
                  {isFullyVerified
                    ? 'All components complete — you are match-ready'
                    : `${totalCount - completedCount} component${totalCount - completedCount !== 1 ? 's' : ''} remaining`}
                </Text>
              </View>
            </View>
            {isFullyVerified && (
              <MaterialCommunityIcons name="decagram" size={28} color={T.emerald} />
            )}
          </View>

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

          {!isFullyVerified && (
            <Pressable style={st.verifyLink} onPress={() => router.push('/(candidate)/verification')}>
              <Ionicons name="shield-checkmark-outline" size={16} color={T.accent} />
              <Text style={st.verifyLinkText}>Continue Verification</Text>
              <Ionicons name="arrow-forward" size={14} color={T.accent} />
            </Pressable>
          )}
        </View>

        {/* Quick Stats */}
        <View style={st.statsRow}>
          <View style={st.statCard}>
            <View style={[st.statIconWrap, { backgroundColor: T.accentBg }]}>
              <Ionicons name="shield-checkmark" size={16} color={T.accent} />
            </View>
            <Text style={st.statValue}>{completedCount}/{totalCount}</Text>
            <Text style={st.statLabel}>Verified</Text>
          </View>
          <View style={st.statCard}>
            <View style={[st.statIconWrap, { backgroundColor: T.accentBg }]}>
              <Ionicons name="heart" size={16} color={T.accent} />
            </View>
            <Text style={st.statValue}>0</Text>
            <Text style={st.statLabel}>Matches</Text>
          </View>
          <View style={st.statCard}>
            <View style={[st.statIconWrap, { backgroundColor: T.accentBg }]}>
              <Ionicons name="people" size={16} color={T.accent} />
            </View>
            <Text style={st.statValue}>0</Text>
            <Text style={st.statLabel}>Intros</Text>
          </View>
        </View>

        {/* Verification Checklist Summary */}
        <View style={st.section}>
          <View style={st.sectionRow}>
            <Text style={st.sectionTitle}>Verification Checklist</Text>
            <Pressable onPress={() => router.push('/(candidate)/verification')} style={st.seeAll}>
              <Text style={st.seeAllText}>View All</Text>
              <Ionicons name="arrow-forward" size={14} color={T.accent} />
            </Pressable>
          </View>

          {checklistItems.map((item, i) => (
            <View key={i} style={st.checkItem}>
              <View style={[st.checkIconWrap, item.done && st.checkIconDone]}>
                <Ionicons name={item.icon} size={18} color={item.done ? T.emerald : T.accent} />
              </View>
              <Text style={[st.checkLabel, item.done && st.checkLabelDone]}>{item.label}</Text>
              <View style={[st.checkStatus, item.done ? st.checkStatusDone : st.checkStatusPending]}>
                <Text style={[st.checkStatusText, item.done ? st.checkStatusTextDone : st.checkStatusTextPending]}>
                  {item.done ? 'Done' : 'Pending'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Recommended For You */}
        <View style={st.section}>
          <View style={st.sectionRow}>
            <Text style={st.sectionTitle}>Recommended For You</Text>
            <View style={st.liveBadge}>
              <View style={st.liveDot} />
              <Text style={st.liveText}>Live</Text>
            </View>
          </View>
          <Text style={st.sectionSub}>
            {isFullyVerified
              ? 'You are match-ready. Apply to any unlocked role below.'
              : 'Complete verification steps to unlock eligible roles.'}
          </Text>
        </View>

        {FEATURED_ROLES.map((role, index) => (
          <OpportunityCard
            key={role.id}
            role={role}
            index={index}
            verificationStatus={verification}
            routeGroup="candidate"
            applied={hasApplied(role.id)}
            onApply={() =>
              applyToRole({
                roleId: role.id,
                roleTitle: role.title,
                roleTier: role.tier,
                candidateName: fullName || 'Anonymous Professional',
                candidateTitle: professionalTitle || 'Career Professional',
                coreSkills: coreSkills ?? [],
                targetMinRate: targetMinRate ?? 0,
                verifiedCount: completedCount,
                totalCount,
                identityVerified: verification.identityVerified,
                videoIntroUploaded: verification.videoIntroUploaded,
                assessmentCompleted: verification.assessmentCompleted,
                employerReviewSecured: verification.employerReviewSecured,
              })
            }
            onWaitlist={isOnWaitlist(role.id)}
            onJoinWaitlist={() => joinGigWaitlist(role.id)}
          />
        ))}

        <View style={{ height: 16 }} />
        </SwipeFadeContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingBottom: 32 },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.accentBg, alignItems: 'center', justifyContent: 'center' },
  greeting: { fontSize: 15, color: T.textPrimary, fontWeight: '600' },
  userName: { fontSize: 22, fontWeight: '800', color: T.textPrimary },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  titleBadge: { fontSize: 13, color: T.textSecondary, fontWeight: '600', marginTop: 4, marginLeft: 50 },

  scoreCard: { marginHorizontal: 20, marginBottom: 20, padding: 20, borderRadius: 16, backgroundColor: T.card, borderWidth: 1, borderColor: T.border },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  scoreLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  scoreRing: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  scoreRingComplete: { borderColor: T.emerald, backgroundColor: T.emeraldBg },
  scoreRingText: { fontSize: 15, fontWeight: '800', color: T.accent },
  scoreRingTextComplete: { color: T.emerald },
  scoreTitle: { fontSize: 16, fontWeight: '700', color: T.textPrimary },
  scoreSub: { fontSize: 12, color: T.textMuted, marginTop: 2 },
  progressBarBg: { height: 6, backgroundColor: T.surface, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 6, borderRadius: 3 },
  verifyLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, alignSelf: 'flex-start' },
  verifyLinkText: { fontSize: 13, fontWeight: '700', color: T.accent },

  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: T.card, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 14, alignItems: 'center' },
  statIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '800', color: T.textPrimary, marginBottom: 2 },
  statLabel: { fontSize: 11, color: T.textMuted, fontWeight: '600' },

  section: { paddingHorizontal: 20, marginBottom: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: T.textPrimary },
  sectionSub: { fontSize: 13, color: T.textSecondary, lineHeight: 18, marginBottom: 8 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText: { fontSize: 13, fontWeight: '600', color: T.accent },

  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: T.emeraldBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.emerald },
  liveText: { fontSize: 11, fontWeight: '700', color: T.emerald, textTransform: 'uppercase' },

  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.border },
  checkIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  checkIconDone: { backgroundColor: T.emeraldBg, borderColor: T.emerald },
  checkLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: T.textPrimary },
  checkLabelDone: { color: T.emerald },
  checkStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  checkStatusDone: { backgroundColor: T.emeraldBg },
  checkStatusText: { fontSize: 11, fontWeight: '700', color: T.textMuted },
  checkStatusTextDone: { color: T.emerald },
  checkStatusPending: { backgroundColor: T.accentBg },
  checkStatusTextPending: { color: T.accent },
});
