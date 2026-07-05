import React, { useState, useEffect } from 'react';
import { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, ThemePalette } from '@/lib/theme';

// ==========================================
// INTERFACES & MOCK DATA
// ==========================================
type TierType = 'Corporate' | 'Short-Term' | 'Gig';

interface Candidate {
  id: string;
  name: string;
  role: string;
  avatar: string;
  matchScore: number;
  rateRequested: number;
  verifiedComponents: {
    identity: boolean;
    videoIntro: boolean;
    skillsAssessment: boolean;
    employerReview: boolean;
  };
  skills: string[];
}

interface Opportunity {
  id: string;
  title: string;
  companyName: string;
  isVerifiedCompany: boolean;
  budgetMax: number;
  location: string;
  duration: string;
  experienceLevel: string;
  skillsRequired: string[];
  description: string;
  candidates: Candidate[];
}

const mockOpportunities: Record<TierType, Opportunity> = {
  'Corporate': {
    id: 'opp_corp_01',
    title: 'Senior Backend Engineer',
    companyName: 'Fintech Corp',
    isVerifiedCompany: true,
    budgetMax: 7500,
    location: 'Remote',
    duration: 'Permanent',
    experienceLevel: 'Senior',
    skillsRequired: ['Node.js', 'PostgreSQL', 'TypeScript'],
    description: 'We are seeking a seasoned Backend Engineer to lead our transaction processing architecture. This is a long-term position with a premier financial infrastructure platform.',
    candidates: [
      {
        id: 'cand_01',
        name: 'Amara Osei',
        role: 'Senior Backend Developer',
        avatar: 'user',
        matchScore: 94,
        rateRequested: 7000,
        verifiedComponents: { identity: true, videoIntro: true, skillsAssessment: true, employerReview: true },
        skills: ['Node.js', 'PostgreSQL', 'TypeScript', 'AWS'],
      },
      {
        id: 'cand_02',
        name: 'Kwame Mensah',
        role: 'Full Stack Engineer',
        avatar: 'user',
        matchScore: 82,
        rateRequested: 8200,
        verifiedComponents: { identity: true, videoIntro: true, skillsAssessment: true, employerReview: true },
        skills: ['Node.js', 'PostgreSQL', 'React'],
      },
    ],
  },
  'Short-Term': {
    id: 'opp_st_01',
    title: 'Mobile Developer (React Native)',
    companyName: 'HealthTech Solutions',
    isVerifiedCompany: true,
    budgetMax: 8000,
    location: 'Remote',
    duration: '6 Months',
    experienceLevel: 'Senior',
    skillsRequired: ['React Native', 'TypeScript', 'Expo'],
    description: 'Looking for an experienced React Native developer to help audit and clean up application layouts, specifically fixing view cutting, safe area edges, and status bar padding.',
    candidates: [
      {
        id: 'cand_03',
        name: 'Chinedu Egwu',
        role: 'Mobile Engineer',
        avatar: 'user',
        matchScore: 88,
        rateRequested: 7800,
        verifiedComponents: { identity: true, videoIntro: true, skillsAssessment: true, employerReview: false },
        skills: ['React Native', 'TypeScript', 'Expo'],
      },
    ],
  },
  'Gig': {
    id: 'opp_gig_01',
    title: 'Brand Identity Designer',
    companyName: 'Consumer Goods Co',
    isVerifiedCompany: true,
    budgetMax: 2000,
    location: 'Remote',
    duration: '2 Weeks',
    experienceLevel: 'Mid-Level',
    skillsRequired: ['Brand Design', 'Adobe Illustrator', 'Typography'],
    description: 'Design a clean, 3-page brand kit for our launching e-commerce line.',
    candidates: [],
  },
};

// ==========================================
// COMPONENT IMPLEMENTATION
// ==========================================
export default function OpportunityDetail() {
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);

  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedTier, setSelectedTier] = useState<TierType>('Corporate');
  const [timeLeft, setTimeLeft] = useState(0);
  const [joinedWaitlist, setJoinedWaitlist] = useState(false);

  const currentOpp = mockOpportunities[selectedTier];

  // Set up Tier-specific Countdown Timers
  useEffect(() => {
    let initialSeconds = 0;
    if (selectedTier === 'Corporate') {
      initialSeconds = 72 * 3600;
    } else if (selectedTier === 'Short-Term') {
      initialSeconds = 48 * 3600;
    } else {
      initialSeconds = 24 * 3600;
    }
    setTimeLeft(initialSeconds);
  }, [selectedTier]);

  // Handle countdown interval
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Time Helper
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const getTierColor = (tier: TierType) => {
    if (tier === 'Corporate') return T.emerald;
    if (tier === 'Short-Term') return T.indigo;
    return T.textMuted;
  };

  const getTierBg = (tier: TierType) => {
    if (tier === 'Corporate') return T.emeraldBg;
    if (tier === 'Short-Term') return T.indigoBg;
    return T.surface;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* HEADER BAR */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={T.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Opportunity Detail</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={T.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* LIVE INTERACTIVE DEV SWITCHER */}
      <View style={styles.devSwitcherContainer}>
        <Text style={styles.devLabel}>DEV PREVIEW TIER:</Text>
        <View style={styles.tabRow}>
          {(['Corporate', 'Short-Term', 'Gig'] as TierType[]).map((tier) => (
            <TouchableOpacity
              key={tier}
              onPress={() => setSelectedTier(tier)}
              style={[
                styles.tabButton,
                selectedTier === tier && {
                  backgroundColor: getTierColor(tier),
                  borderColor: getTierColor(tier),
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTier === tier && styles.tabTextActive,
                ]}
              >
                {tier}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* MAIN OPPORTUNITY CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.tierBadge, { backgroundColor: getTierBg(selectedTier) }]}>
              <View style={[styles.dot, { backgroundColor: getTierColor(selectedTier) }]} />
              <Text style={[styles.tierBadgeText, { color: getTierColor(selectedTier) }]}>
                {selectedTier.toUpperCase()}
              </Text>
            </View>

            {selectedTier !== 'Gig' && (
              <View style={styles.timerBadge}>
                <Ionicons name="time-outline" size={14} color={T.danger} />
                <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
              </View>
            )}
          </View>

          <Text style={styles.jobTitle}>{currentOpp.title}</Text>

          <View style={styles.companyRow}>
            <View style={styles.companyIconContainer}>
              <FontAwesome5 name="building" size={14} color={T.textMuted} />
            </View>
            <Text style={styles.companyName}>{currentOpp.companyName}</Text>
            {currentOpp.isVerifiedCompany && (
              <View style={styles.verifiedContainer}>
                <MaterialCommunityIcons name="decagram" size={16} color={T.accent} />
                <Text style={styles.verifiedText}>Verified Company</Text>
              </View>
            )}
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={16} color={T.textMuted} />
              <Text style={styles.metaLabel}>{currentOpp.location}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={T.textMuted} />
              <Text style={styles.metaLabel}>{currentOpp.duration}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="briefcase-outline" size={16} color={T.textMuted} />
              <Text style={styles.metaLabel}>{currentOpp.experienceLevel}</Text>
            </View>
          </View>

          <View style={styles.budgetRow}>
            <Text style={styles.budgetAmount}>
              ${currentOpp.budgetMax.toLocaleString()}/mo
            </Text>
            <Text style={styles.budgetSubtitle}>Max Budget Allocation</Text>
          </View>

          <Text style={styles.sectionHeader}>Description</Text>
          <Text style={styles.descriptionText}>{currentOpp.description}</Text>

          <Text style={styles.sectionHeader}>Required Skills</Text>
          <View style={styles.skillsContainer}>
            {currentOpp.skillsRequired.map((skill, index) => (
              <View key={index} style={styles.skillPill}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CANDIDATES / MATCHES WORKFLOW SECTION */}
        {selectedTier === 'Gig' ? (
          <View style={styles.gigWaitlistCard}>
            <View style={styles.lockIconContainer}>
              <Ionicons name="lock-closed" size={32} color={T.textMuted} />
            </View>
            <Text style={styles.waitlistTitle}>Gig Matching Coming Soon</Text>
            <Text style={styles.waitlistSubtitle}>
              Our high-velocity gig matching engine is currently scheduled for Phase 3 release. Join our early pilot waitlist to get notified instantly.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setJoinedWaitlist(true);
                Alert.alert('Success', 'You have successfully joined the Gig matching pilot waitlist!');
              }}
              disabled={joinedWaitlist}
              style={[
                styles.waitlistButton,
                { backgroundColor: joinedWaitlist ? T.emerald : T.accent },
              ]}
            >
              <Ionicons name={joinedWaitlist ? 'checkmark-circle' : 'mail-outline'} size={20} color={T.textOnAccent} />
              <Text style={styles.waitlistButtonText}>
                {joinedWaitlist ? 'Joined Waitlist' : 'Join Waitlist'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View style={styles.matchSectionHeader}>
              <Text style={styles.matchSectionTitle}>Match Recommendations</Text>
              <Text style={styles.matchCount}>{currentOpp.candidates.length} Found</Text>
            </View>

            {currentOpp.candidates.map((cand) => {
              const isOverBudget = cand.rateRequested > currentOpp.budgetMax;
              const activeThemeColor = getTierColor(selectedTier);
              const activeThemeBg = getTierBg(selectedTier);
              const showEmployerReview = selectedTier === 'Corporate';

              return (
                <View key={cand.id} style={styles.candidateCard}>
                  <View style={styles.candHeader}>
                    <View style={styles.candAvatarContainer}>
                      <Ionicons name="person" size={20} color={T.textMuted} />
                    </View>
                    <View style={styles.candInfo}>
                      <Text style={styles.candName}>{cand.name}</Text>
                      <Text style={styles.candRole}>{cand.role}</Text>
                    </View>
                    <View style={[styles.scoreRing, { borderColor: activeThemeColor }]}>
                      <Text style={[styles.scoreText, { color: activeThemeColor }]}>
                        {cand.matchScore}%
                      </Text>
                    </View>
                  </View>

                  {isOverBudget && (
                    <View style={styles.warningBanner}>
                      <Ionicons name="warning" size={16} color={T.amber} />
                      <Text style={styles.warningBannerText}>
                        Requested rate (${cand.rateRequested.toLocaleString()}) exceeds maximum opportunity budget.
                      </Text>
                    </View>
                  )}

                  <Text style={styles.badgeSectionTitle}>
                    {selectedTier === 'Corporate' ? 'Gated Verification (4/4 Required)' : 'Gated Verification (3/4 Required)'}
                  </Text>
                  <View style={styles.badgesWrapper}>
                    <View style={[styles.badgeComponent, cand.verifiedComponents.identity ? styles.badgeSuccess : styles.badgeFailed]}>
                      <Ionicons name="id-card-outline" size={14} color={cand.verifiedComponents.identity ? T.emerald : T.danger} />
                      <Text style={[styles.badgeComponentText, { color: cand.verifiedComponents.identity ? T.emerald : T.danger }]}>Identity</Text>
                    </View>
                    <View style={[styles.badgeComponent, cand.verifiedComponents.videoIntro ? styles.badgeSuccess : styles.badgeFailed]}>
                      <Ionicons name="videocam-outline" size={14} color={cand.verifiedComponents.videoIntro ? T.emerald : T.danger} />
                      <Text style={[styles.badgeComponentText, { color: cand.verifiedComponents.videoIntro ? T.emerald : T.danger }]}>Video</Text>
                    </View>
                    <View style={[styles.badgeComponent, cand.verifiedComponents.skillsAssessment ? styles.badgeSuccess : styles.badgeFailed]}>
                      <Ionicons name="shield-checkmark-outline" size={14} color={cand.verifiedComponents.skillsAssessment ? T.emerald : T.danger} />
                      <Text style={[styles.badgeComponentText, { color: cand.verifiedComponents.skillsAssessment ? T.emerald : T.danger }]}>Skills</Text>
                    </View>
                    {showEmployerReview && (
                      <View style={[styles.badgeComponent, cand.verifiedComponents.employerReview ? styles.badgeSuccess : styles.badgeFailed]}>
                        <Ionicons name="star-outline" size={14} color={cand.verifiedComponents.employerReview ? T.emerald : T.danger} />
                        <Text style={[styles.badgeComponentText, { color: cand.verifiedComponents.employerReview ? T.emerald : T.danger }]}>Review</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.candSkillsRow}>
                    {cand.skills.map((skill, i) => (
                      <View key={i} style={[styles.candSkillPill, { backgroundColor: activeThemeBg }]}>
                        <Text style={[styles.candSkillText, { color: activeThemeColor }]}>{skill}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity style={[styles.outreachButton, { backgroundColor: activeThemeColor }]}>
                    <Ionicons name="paper-plane" size={16} color={T.textOnAccent} />
                    <Text style={styles.outreachButtonText}>Send Introduction</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: T.bg,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: T.textPrimary,
  },
  menuButton: {
    padding: 4,
  },
  devSwitcherContainer: {
    padding: 12,
    backgroundColor: T.bg,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  devLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: T.textMuted,
    marginBottom: 8,
    letterSpacing: 1,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: T.border,
    alignItems: 'center',
    backgroundColor: T.card,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: T.textMuted,
  },
  tabTextActive: {
    color: T.textOnAccent,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: T.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: T.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.dangerBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '700',
    color: T.danger,
    marginLeft: 4,
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: T.textPrimary,
    marginBottom: 10,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  companyIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: T.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  companyName: {
    fontSize: 14,
    fontWeight: '600',
    color: T.textPrimary,
    marginRight: 8,
  },
  verifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.accentBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: T.accent,
    marginLeft: 4,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: T.border,
    paddingVertical: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginVertical: 4,
  },
  metaLabel: {
    fontSize: 13,
    color: T.textMuted,
    marginLeft: 6,
    fontWeight: '500',
  },
  budgetRow: {
    marginBottom: 20,
  },
  budgetAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: T.textPrimary,
  },
  budgetSubtitle: {
    fontSize: 12,
    color: T.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: T.textPrimary,
    marginBottom: 8,
    marginTop: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: T.textMuted,
    lineHeight: 20,
    marginBottom: 12,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillPill: {
    backgroundColor: T.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: T.border,
  },
  skillText: {
    fontSize: 12,
    fontWeight: '600',
    color: T.textMuted,
  },
  matchSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 10,
  },
  matchSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: T.textPrimary,
  },
  matchCount: {
    fontSize: 13,
    color: T.textMuted,
    fontWeight: '600',
  },
  candidateCard: {
    backgroundColor: T.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: T.border,
  },
  candHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  candAvatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  candInfo: {
    flex: 1,
  },
  candName: {
    fontSize: 15,
    fontWeight: '700',
    color: T.textPrimary,
  },
  candRole: {
    fontSize: 12,
    color: T.textMuted,
    marginTop: 2,
  },
  scoreRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.card,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '800',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.amberBg,
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  warningBannerText: {
    fontSize: 11,
    color: T.amber,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  badgeSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: T.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  badgesWrapper: {
    flexDirection: 'row',
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  badgeComponent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
  },
  badgeSuccess: {
    backgroundColor: T.emeraldBg,
    borderColor: T.emeraldBg,
  },
  badgeFailed: {
    backgroundColor: T.dangerBg,
    borderColor: T.dangerBg,
  },
  badgeComponentText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  candSkillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  candSkillPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  candSkillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  outreachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  outreachButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: T.textOnAccent,
    marginLeft: 6,
  },
  gigWaitlistCard: {
    backgroundColor: T.card,
    borderRadius: 16,
    padding: 30,
    borderWidth: 1.5,
    borderColor: T.border,
    alignItems: 'center',
  },
  lockIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: T.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  waitlistTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: T.textPrimary,
    marginBottom: 10,
  },
  waitlistSubtitle: {
    fontSize: 13,
    color: T.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  waitlistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    width: '100%',
  },
  waitlistButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: T.textOnAccent,
    marginLeft: 6,
  },
});
