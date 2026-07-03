import { useState, useRef, useEffect } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  mockCompanyRoles,
  mockMatchedCandidates,
  mockRoles,
  MatchedCandidate,
  CandidateVerification,
  TIER_CONFIG,
  Tier,
} from '@/lib/mock-data';

// ── Tier enforcement rules ──────────────────────────────────────────

const TIER_RULES: Record<
  Tier,
  {
    required_verifications: (keyof CandidateVerification)[];
    optional_verifications: (keyof CandidateVerification)[];
    deadline_label: string;
    rate_flag: 'soft' | 'hard' | 'none';
    gated: boolean;
  }
> = {
  corporate: {
    required_verifications: [
      'identity',
      'video_intro',
      'skills_assessment',
      'employer_review',
    ],
    optional_verifications: [],
    deadline_label: '72h window',
    rate_flag: 'soft',
    gated: true,
  },
  blue_collar: {
    required_verifications: [
      'identity',
      'video_intro',
      'skills_assessment',
    ],
    optional_verifications: ['employer_review'],
    deadline_label: '48h window',
    rate_flag: 'soft',
    gated: true,
  },
  short_term: {
    required_verifications: [
      'identity',
      'video_intro',
      'skills_assessment',
    ],
    optional_verifications: ['employer_review'],
    deadline_label: '48h window',
    rate_flag: 'soft',
    gated: true,
  },
  gig: {
    required_verifications: [
      'identity',
      'video_intro',
      'skills_assessment',
      'employer_review',
    ],
    optional_verifications: [],
    deadline_label: '24h window',
    rate_flag: 'hard',
    gated: false, // Phase 1: out of scope
  },
};

const VERIFICATION_LABELS: Record<
  keyof CandidateVerification,
  { label: string; icon: string }
> = {
  identity: { label: 'Identity', icon: 'finger-print-outline' },
  video_intro: { label: 'Video Intro', icon: 'videocam-outline' },
  skills_assessment: {
    label: 'Skills',
    icon: 'school-outline',
  },
  employer_review: {
    label: 'Review',
    icon: 'star-outline',
  },
};

function getVerificationCount(v: CandidateVerification): number {
  return (
    (v.identity ? 1 : 0) +
    (v.video_intro ? 1 : 0) +
    (v.skills_assessment ? 1 : 0) +
    (v.employer_review ? 1 : 0)
  );
}

function meetsGating(
  v: CandidateVerification,
  tier: Tier
): boolean {
  const rules = TIER_RULES[tier];
  return rules.required_verifications.every((k) => v[k]);
}

function getTimeRemaining(
  sentAt: string,
  deadlineHours: number
): { text: string; urgent: boolean; expired: boolean } {
  const sent = new Date(sentAt).getTime();
  const deadline = sent + deadlineHours * 60 * 60 * 1000;
  const now = Date.now();
  const remaining = deadline - now;
  if (remaining <= 0)
    return { text: 'Expired', urgent: false, expired: true };
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor(
    (remaining % (1000 * 60 * 60)) / (1000 * 60)
  );
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return {
      text: `${days}d ${hours % 24}h left`,
      urgent: false,
      expired: false,
    };
  }
  return {
    text: `${hours}h ${minutes}m left`,
    urgent: hours < 12,
    expired: false,
  };
}

// ── Verification badge row ──────────────────────────────────────────

function VerificationBadges({
  verification,
  tier,
}: {
  verification: CandidateVerification;
  tier: Tier;
}) {
  const rules = TIER_RULES[tier];
  return (
    <View style={st.verBadgeRow}>
      {(
        Object.keys(VERIFICATION_LABELS) as Array<
          keyof CandidateVerification
        >
      ).map((key) => {
        const isRequired =
          rules.required_verifications.includes(key);
        const isOptional =
          rules.optional_verifications.includes(key);
        const hasIt = verification[key];
        const vl = VERIFICATION_LABELS[key];
        return (
          <View
            key={key}
            style={[
              st.verBadge,
              hasIt
                ? st.verBadgePass
                : isRequired
                ? st.verBadgeFail
                : st.verBadgeOptional,
            ]}
          >
            <Ionicons
              name={
                hasIt
                  ? 'checkmark-circle'
                  : isRequired
                  ? 'close-circle'
                  : ('remove-circle-outline' as any)
              }
              size={11}
              color={
                hasIt
                  ? '#1B5E20'
                  : isRequired
                  ? '#DC2626'
                  : '#9CA3AF'
              }
            />
            <Text
              style={[
                st.verBadgeText,
                {
                  color: hasIt
                    ? '#1B5E20'
                    : isRequired
                    ? '#DC2626'
                    : '#9CA3AF',
                },
              ]}
            >
              {vl.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Candidate card ──────────────────────────────────────────────────

function CandidateCard({
  candidate,
  index,
  deadlineHours,
  isTop5,
  tier,
  rateMax,
}: {
  candidate: MatchedCandidate;
  index: number;
  deadlineHours: number;
  isTop5: boolean;
  tier: Tier;
  rateMax: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const rules = TIER_RULES[tier];
  const passesGating = meetsGating(candidate.verification, tier);
  const hasRateFlag =
    candidate.rate_expectation &&
    candidate.rate_expectation > rateMax;
  const isScoreCapped =
    candidate.missing_must_have &&
    candidate.missing_must_have.length > 0;
  const hasIntro =
    candidate.status === 'intro_sent' ||
    candidate.status === 'intro_accepted' ||
    candidate.status === 'intro_expired';
  const timer =
    hasIntro && candidate.intro_sent_at
      ? getTimeRemaining(candidate.intro_sent_at, deadlineHours)
      : null;

  const statusConfig: Record<
    string,
    { label: string; color: string; bg: string }
  > = {
    matched: {
      label: 'Matched',
      color: '#1B5E20',
      bg: '#F0F9F0',
    },
    intro_sent: {
      label: 'Intro Sent',
      color: '#1565C0',
      bg: '#E3F2FD',
    },
    intro_accepted: {
      label: 'Accepted',
      color: '#2E7D32',
      bg: '#E8F5E9',
    },
    intro_expired: {
      label: 'Expired',
      color: '#DC2626',
      bg: '#FEF2F2',
    },
  };
  const sc = statusConfig[candidate.status];

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <View
        style={[
          st.candidateCard,
          isTop5 && st.candidateCardTop5,
          !passesGating && st.candidateCardGated,
        ]}
      >
        {isTop5 && (
          <View style={st.rankBadge}>
            <Text style={st.rankText}>#{index + 1}</Text>
          </View>
        )}

        <View style={st.candidateRow}>
          <View style={st.candidateLeft}>
            <View style={st.candidateAvatar}>
              <Ionicons
                name="person"
                size={16}
                color="#6B7280"
              />
              {candidate.verified && (
                <View style={st.verifiedBadgeSmall}>
                  <Ionicons
                    name="checkmark-circle"
                    size={10}
                    color="#1B5E20"
                  />
                </View>
              )}
            </View>
            <View style={st.scoreRing}>
              <Text style={st.scoreNum}>
                {candidate.match_score}
              </Text>
              <Text style={st.scorePct}>%</Text>
            </View>
          </View>

          <View style={st.candidateInfo}>
            <Text style={st.candidateName} numberOfLines={1}>
              {candidate.name}
            </Text>
            <Text style={st.candidateTitle} numberOfLines={1}>
              {candidate.title}
            </Text>
            <Text style={st.candidateLocation}>
              {candidate.location_city},{' '}
              {candidate.location_country}
            </Text>
          </View>

          <View
            style={[st.statusPill, { backgroundColor: sc.bg }]}
          >
            <Text
              style={[st.statusText, { color: sc.color }]}
            >
              {sc.label}
            </Text>
          </View>
        </View>

        {/* Warnings zone */}
        {(isScoreCapped || hasRateFlag || !passesGating) && (
          <View style={st.warningsZone}>
            {!passesGating && (
              <View style={st.warningRow}>
                <Ionicons
                  name="shield-outline"
                  size={12}
                  color="#DC2626"
                />
                <Text style={st.warningTextRed}>
                  Missing required verification
                </Text>
              </View>
            )}
            {isScoreCapped && (
              <View style={st.warningRow}>
                <Ionicons
                  name="warning-outline"
                  size={12}
                  color="#F59E0B"
                />
                <Text style={st.warningTextAmber}>
                  Score capped at 50 — missing:{' '}
                  {candidate.missing_must_have!.join(', ')}
                </Text>
              </View>
            )}
            {hasRateFlag && (
              <View style={st.warningRow}>
                <Ionicons
                  name={
                    rules.rate_flag === 'hard'
                      ? 'ban-outline'
                      : 'flag-outline'
                  }
                  size={12}
                  color={
                    rules.rate_flag === 'hard'
                      ? '#DC2626'
                      : '#F59E0B'
                  }
                />
                <Text
                  style={
                    rules.rate_flag === 'hard'
                      ? st.warningTextRed
                      : st.warningTextAmber
                  }
                >
                  {rules.rate_flag === 'hard'
                    ? 'Rate exceeds max — excluded'
                    : `Rate above budget ($${candidate.rate_expectation!.toLocaleString()})`}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Verification badges */}
        <VerificationBadges
          verification={candidate.verification}
          tier={tier}
        />

        {/* Skills */}
        <View style={st.candidateSkills}>
          {candidate.skills.slice(0, 4).map((sk) => (
            <View key={sk} style={st.skillChip}>
              <Text style={st.skillText}>{sk}</Text>
            </View>
          ))}
        </View>

        {/* Timer */}
        {timer && !timer.expired && (
          <View
            style={[
              st.timerRow,
              timer.urgent && st.timerRowUrgent,
            ]}
          >
            <Ionicons
              name="time-outline"
              size={13}
              color={timer.urgent ? '#DC2626' : '#6B7280'}
            />
            <Text
              style={[
                st.timerText,
                timer.urgent && st.timerTextUrgent,
              ]}
            >
              {timer.text}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={st.candidateActions}>
          {candidate.status === 'matched' && passesGating && (
            <Pressable style={st.introBtn}>
              <Ionicons
                name="send-outline"
                size={14}
                color="#FFFFFF"
              />
              <Text style={st.introBtnText}>
                Send Introduction
              </Text>
            </Pressable>
          )}
          {candidate.status === 'matched' && !passesGating && (
            <View style={st.gatedRow}>
              <Ionicons
                name="lock-closed-outline"
                size={13}
                color="#9CA3AF"
              />
              <Text style={st.gatedText}>
                Verification incomplete
              </Text>
            </View>
          )}
          {candidate.status === 'intro_accepted' && (
            <Pressable style={st.chatBtn}>
              <Ionicons
                name="chatbubble-outline"
                size={14}
                color="#1B5E20"
              />
              <Text style={st.chatBtnText}>Open Chat</Text>
            </Pressable>
          )}
          {candidate.status === 'intro_sent' && (
            <View style={st.pendingRow}>
              <Ionicons
                name="hourglass-outline"
                size={13}
                color="#6B7280"
              />
              <Text style={st.pendingText}>
                Awaiting response
              </Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────

export default function CompanyRoleDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const companyRole = mockCompanyRoles.find((r) => r.id === id);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (!companyRole) {
    return (
      <View style={st.emptyContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={40}
          color="#D1D5DB"
        />
        <Text style={st.emptyText}>Role not found</Text>
      </View>
    );
  }

  const baseRole = mockRoles.find(
    (r) => r.id === companyRole.role_id
  );
  const cfg = TIER_CONFIG[companyRole.tier];
  const rules = TIER_RULES[companyRole.tier];
  const isGig = companyRole.tier === 'gig';

  const top5 = mockMatchedCandidates
    .filter((c) => c.match_score >= 85)
    .slice(0, 5);
  const alternates = mockMatchedCandidates
    .filter((c) => c.match_score < 85)
    .slice(0, 10);

  const roleStats = [
    {
      label: 'Matched',
      value: companyRole.candidates_matched,
      icon: 'people-outline' as const,
    },
    {
      label: 'Shortlisted',
      value: companyRole.candidates_shortlisted,
      icon: 'star-outline' as const,
    },
    {
      label: 'Intros',
      value: companyRole.intros_sent,
      icon: 'send-outline' as const,
    },
    {
      label: 'Accepted',
      value: companyRole.intros_accepted,
      icon: 'checkmark-circle-outline' as const,
    },
  ];

  // Gig tier: show waitlist stub
  if (isGig) {
    return (
      <View style={st.container}>
        <StatusBar style="dark" />
        <View
          style={[st.header, { paddingTop: insets.top + 8 }]}
        >
          <Pressable
            style={st.headerBtn}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color="#374151"
            />
          </Pressable>
          <Text style={st.headerTitle}>Role Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={st.gigStub}>
          <View style={st.gigStubCircle}>
            <Ionicons
              name="flash-outline"
              size={40}
              color="#E65100"
            />
          </View>
          <Text style={st.gigStubTitle}>
            {companyRole.title}
          </Text>
          <View
            style={[
              st.tierBadge,
              { backgroundColor: '#FFE0B2' },
            ]}
          >
            <View
              style={[
                st.tierDot,
                { backgroundColor: '#E65100' },
              ]}
            />
            <Text
              style={[
                st.tierBadgeText,
                { color: '#E65100' },
              ]}
            >
              Gig
            </Text>
          </View>
          <View style={st.gigStubCard}>
            <Ionicons
              name="time-outline"
              size={20}
              color="#E65100"
            />
            <Text style={st.gigStubCardTitle}>
              Waitlist Only — Phase 1
            </Text>
            <Text style={st.gigStubCardSub}>
              Gig matching is not yet active. Candidates on the
              waitlist will be notified when this tier launches.
            </Text>
          </View>
          <View style={st.gigStubInfo}>
            <Text style={st.gigStubInfoTitle}>
              Coming in Phase 2:
            </Text>
            <View style={st.gigStubInfoRow}>
              <Ionicons
                name="document-text-outline"
                size={13}
                color="#6B7280"
              />
              <Text style={st.gigStubInfoText}>
                500-char scope_of_work replaces description
              </Text>
            </View>
            <View style={st.gigStubInfoRow}>
              <Ionicons
                name="shield-checkmark-outline"
                size={13}
                color="#6B7280"
              />
              <Text style={st.gigStubInfoText}>
                All 4 verification components required
              </Text>
            </View>
            <View style={st.gigStubInfoRow}>
              <Ionicons
                name="ban-outline"
                size={13}
                color="#6B7280"
              />
              <Text style={st.gigStubInfoText}>
                Rate above max = hard exclusion (no soft flags)
              </Text>
            </View>
            <View style={st.gigStubInfoRow}>
              <Ionicons
                name="alarm-outline"
                size={13}
                color="#6B7280"
              />
              <Text style={st.gigStubInfoText}>
                Fast 24-hour response window
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={st.container}>
      <StatusBar style="dark" />
      <View
        style={[st.header, { paddingTop: insets.top + 8 }]}
      >
        <Pressable
          style={st.headerBtn}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color="#374151"
          />
        </Pressable>
        <Text style={st.headerTitle}>Role Details</Text>
        <Pressable style={st.headerBtn}>
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color="#374151"
          />
        </Pressable>
      </View>

      <Animated.View
        style={[
          st.contentWrap,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={st.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Title + badges */}
          <Text style={st.roleTitle}>
            {companyRole.title}
          </Text>
          <View style={st.tierStatusRow}>
            <View
              style={[
                st.tierBadge,
                { backgroundColor: cfg.accent + '14' },
              ]}
            >
              <View
                style={[
                  st.tierDot,
                  { backgroundColor: cfg.accent },
                ]}
              />
              <Text
                style={[
                  st.tierBadgeText,
                  { color: cfg.accent },
                ]}
              >
                {cfg.label}
              </Text>
            </View>
            <View
              style={[
                st.statusBadge,
                {
                  backgroundColor:
                    companyRole.status === 'active'
                      ? '#E8F5E9'
                      : '#FEF3C7',
                },
              ]}
            >
              <View
                style={[
                  st.statusDot,
                  {
                    backgroundColor:
                      companyRole.status === 'active'
                        ? '#22C55E'
                        : '#F59E0B',
                  },
                ]}
              />
              <Text
                style={[
                  st.statusBadgeText,
                  {
                    color:
                      companyRole.status === 'active'
                        ? '#1B5E20'
                        : '#92400E',
                  },
                ]}
              >
                {companyRole.status.charAt(0).toUpperCase() +
                  companyRole.status.slice(1)}
              </Text>
            </View>
          </View>

          {/* Tier rules card */}
          <View style={st.rulesCard}>
            <View style={st.rulesHeader}>
              <Ionicons
                name="shield-checkmark"
                size={16}
                color={cfg.accent}
              />
              <Text style={st.rulesTitle}>
                {cfg.label} Tier Rules
              </Text>
            </View>
            <View style={st.rulesRow}>
              <Ionicons
                name="finger-print-outline"
                size={13}
                color="#374151"
              />
              <Text style={st.rulesText}>
                {rules.required_verifications.length} of 4
                verifications required
                {rules.optional_verifications.length > 0
                  ? ` (${rules.optional_verifications.join(', ')} optional)`
                  : ''}
              </Text>
            </View>
            <View style={st.rulesRow}>
              <Ionicons
                name="alarm-outline"
                size={13}
                color="#374151"
              />
              <Text style={st.rulesText}>
                {rules.deadline_label} for candidate response
              </Text>
            </View>
            <View style={st.rulesRow}>
              <Ionicons
                name="flag-outline"
                size={13}
                color="#374151"
              />
              <Text style={st.rulesText}>
                Missing must_have skill caps score at 50
              </Text>
            </View>
            <View style={st.rulesRow}>
              <Ionicons
                name={
                  rules.rate_flag === 'soft'
                    ? 'flag-outline'
                    : 'ban-outline'
                }
                size={13}
                color="#374151"
              />
              <Text style={st.rulesText}>
                {rules.rate_flag === 'soft'
                  ? 'Rate above max shows soft warning'
                  : 'Rate above max = hard exclusion'}
              </Text>
            </View>
          </View>

          {/* Role params */}
          {baseRole && (
            <View style={st.paramsRow}>
              {[
                {
                  icon: 'cash-outline' as const,
                  label: `$${baseRole.rate_min.toLocaleString()}-$${baseRole.rate_max.toLocaleString()}/${baseRole.rate_type === 'monthly' ? 'mo' : baseRole.rate_type === 'hourly' ? 'hr' : 'fixed'}`,
                },
                {
                  icon: 'time-outline' as const,
                  label: baseRole.contract_length,
                },
                {
                  icon: 'location-outline' as const,
                  label:
                    baseRole.location_type === 'remote'
                      ? 'Remote'
                      : baseRole.location_city ||
                        baseRole.location_type,
                },
              ].map((item) => (
                <View key={item.label} style={st.paramChip}>
                  <Ionicons
                    name={item.icon}
                    size={13}
                    color="#6B7280"
                  />
                  <Text style={st.paramText}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Stats grid */}
          <View style={st.statsGrid}>
            {roleStats.map((s) => (
              <View key={s.label} style={st.statItem}>
                <View style={st.statIconWrap}>
                  <Ionicons
                    name={s.icon}
                    size={16}
                    color="#1B5E20"
                  />
                </View>
                <Text style={st.statValue}>{s.value}</Text>
                <Text style={st.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Deadline info */}
          {companyRole.deadline_hours > 0 && (
            <View style={st.deadlineCard}>
              <Ionicons
                name="alarm-outline"
                size={16}
                color="#1B5E20"
              />
              <Text style={st.deadlineText}>
                Introduction window:{' '}
                <Text style={st.deadlineBold}>
                  {companyRole.deadline_hours}h
                </Text>{' '}
                per candidate
              </Text>
            </View>
          )}

          {/* Required skills */}
          {baseRole && (
            <View style={st.section}>
              <Text style={st.sectionTitle}>
                Required Skills
              </Text>
              <View style={st.skillWrap}>
                {baseRole.required_skills.must_have.map(
                  (sk) => (
                    <View
                      key={sk}
                      style={st.requiredSkillPill}
                    >
                      <Text style={st.requiredSkillText}>
                        {sk}
                      </Text>
                    </View>
                  )
                )}
              </View>
            </View>
          )}

          {/* Top 5 */}
          <View style={st.section}>
            <View style={st.sectionHeaderRow}>
              <Text style={st.sectionTitle}>
                Top 5 Candidates
              </Text>
              <View style={st.top5Badge}>
                <Text style={st.top5BadgeText}>
                  {top5.length}
                </Text>
              </View>
            </View>
            <Text style={st.sectionSub}>
              Highest compatibility scores
            </Text>
            {top5.map((c, i) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                index={i}
                deadlineHours={companyRole.deadline_hours}
                isTop5
                tier={companyRole.tier}
                rateMax={baseRole?.rate_max || 0}
              />
            ))}
          </View>

          {/* Alternates */}
          <View style={st.section}>
            <View style={st.sectionHeaderRow}>
              <Text style={st.sectionTitle}>Alternates</Text>
              <View
                style={[
                  st.top5Badge,
                  { backgroundColor: '#F9FAFB' },
                ]}
              >
                <Text
                  style={[
                    st.top5BadgeText,
                    { color: '#6B7280' },
                  ]}
                >
                  {alternates.length}
                </Text>
              </View>
            </View>
            <Text style={st.sectionSub}>
              Next best matches
            </Text>
            {alternates.map((c, i) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                index={i + 5}
                deadlineHours={companyRole.deadline_hours}
                isTop5={false}
                tier={companyRole.tier}
                rateMax={baseRole?.rate_max || 0}
              />
            ))}
          </View>

          {/* RLS */}
          <View style={st.rlsCard}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color="#1B5E20"
            />
            <Text style={st.rlsText}>
              Candidate profiles restricted to your
              company_id. Full identity revealed after mutual
              acceptance.
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 15, color: '#9CA3AF' },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  contentWrap: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  roleTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  tierStatusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tierDot: { width: 6, height: 6, borderRadius: 3 },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Rules card
  rulesCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  rulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  rulesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  rulesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  rulesText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },

  paramsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  paramChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  paramText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },

  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#F0F9F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },

  deadlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9F0',
    borderWidth: 1,
    borderColor: '#E8F5E9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  deadlineText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  deadlineBold: {
    fontWeight: '800',
    color: '#1B5E20',
  },

  section: { marginBottom: 24 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  sectionSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  top5Badge: {
    backgroundColor: '#1B5E20',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  top5BadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  skillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  requiredSkillPill: {
    backgroundColor: '#F0F9F0',
    borderWidth: 1,
    borderColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  requiredSkillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1B5E20',
  },

  // Candidate card
  candidateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 14,
    marginBottom: 10,
  },
  candidateCardTop5: {
    borderColor: '#E8F5E9',
    borderWidth: 1.5,
  },
  candidateCardGated: { opacity: 0.7 },
  rankBadge: {
    position: 'absolute',
    top: -1,
    right: 12,
    backgroundColor: '#1B5E20',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 1,
  },
  rankText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  candidateLeft: { alignItems: 'center', gap: 4 },
  candidateAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadgeSmall: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },
  scoreRing: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B5E20',
  },
  scorePct: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1B5E20',
  },

  candidateInfo: { flex: 1 },
  candidateName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  candidateTitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 1,
  },
  candidateLocation: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: { fontSize: 10, fontWeight: '700' },

  // Warnings
  warningsZone: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    gap: 4,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  warningTextAmber: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '500',
    flex: 1,
  },
  warningTextRed: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '500',
    flex: 1,
  },

  // Verification badges
  verBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  verBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verBadgePass: { backgroundColor: '#F0F9F0' },
  verBadgeFail: { backgroundColor: '#FEF2F2' },
  verBadgeOptional: { backgroundColor: '#F9FAFB' },
  verBadgeText: { fontSize: 10, fontWeight: '600' },

  candidateSkills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  skillChip: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  skillText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },

  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timerRowUrgent: { backgroundColor: '#FEF2F2' },
  timerText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  timerTextUrgent: { color: '#DC2626' },

  candidateActions: { marginTop: 2 },
  introBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1B5E20',
    borderRadius: 8,
    height: 36,
  },
  introBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0F9F0',
    borderWidth: 1,
    borderColor: '#E8F5E9',
    borderRadius: 8,
    height: 36,
  },
  chatBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B5E20',
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pendingText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  gatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  gatedText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    fontStyle: 'italic',
  },

  rlsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F0F9F0',
    borderWidth: 1,
    borderColor: '#E8F5E9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  rlsText: {
    color: '#6B7280',
    fontSize: 12,
    flex: 1,
    fontWeight: '500',
    lineHeight: 18,
  },

  // Gig stub
  gigStub: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  gigStubCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#FFE0B2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  gigStubTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  gigStubCard: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFE0B2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
    width: '100%',
  },
  gigStubCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E65100',
    marginTop: 8,
    marginBottom: 4,
  },
  gigStubCardSub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  gigStubInfo: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    width: '100%',
  },
  gigStubInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  gigStubInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  gigStubInfoText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
});
