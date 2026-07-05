import { useRef, useEffect, useState, useMemo} from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { Role, TIER_CONFIG } from '@/lib/mock-data';
import { VerificationState } from '@/lib/useVerification';
import { evaluateEligibility, getMissingRequirements } from '@/lib/matchingEngine';
import { useTheme, ThemePalette } from '@/lib/theme';

interface OpportunityCardProps {
  role: Role;
  index?: number;
  verificationStatus: VerificationState;
  routeGroup?: 'candidate' | 'company';
  applied?: boolean;
  onApply?: (roleId: string) => void;
  /** Gig waitlist state */
  onWaitlist?: boolean;
  onJoinWaitlist?: (roleId: string) => void;
}

export default function OpportunityCard({
  role,
  index = 0,
  verificationStatus,
  routeGroup = 'candidate',
  applied = false,
  onApply,
  onWaitlist = false,
  onJoinWaitlist,
}: OpportunityCardProps) {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);

  const cfg = TIER_CONFIG[role.tier];
  const isGig = role.tier === 'gig';

  // Gig tier bypasses verification entirely
  const { eligible, message } = isGig
    ? { eligible: false, message: '' }
    : evaluateEligibility(verificationStatus, role.tier);
  const missingItems = isGig ? [] : getMissingRequirements(verificationStatus, role.tier);

  const [showToast, setShowToast] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, delay: index * 50, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 280, delay: index * 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleJoinWaitlist = () => {
    if (onWaitlist) return;
    onJoinWaitlist?.(role.id);
    setShowToast(true);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setShowToast(false));
  };

  const handleApply = () => {
    if (!applied && onApply) onApply(role.id);
  };

  const location =
    role.location_type === 'remote'
      ? 'Remote'
      : role.location_type === 'hybrid'
        ? `Hybrid · ${role.location_city}`
        : `${role.location_city}, ${role.location_country}`;

  const detailPath =
    routeGroup === 'company'
      ? ('/(company)/role/[id]' as const)
      : ('/(candidate)/role/[id]' as const);

  // ── Shared card content (tier pill, company, role info, meta, skills) ──
  const cardContent = (
    <>
      <View style={st.topRow}>
        <View style={[st.tierPill, { backgroundColor: cfg.accent + '14' }]}>
          <View style={[st.tierDot, { backgroundColor: cfg.accent }]} />
          <Text style={[st.tierLabel, { color: cfg.accent }]}>{cfg.label}</Text>
        </View>
        {!isGig && (
          <View style={[st.scoreRing, { borderColor: cfg.accent }]}>
            <Text style={[st.scoreText, { color: cfg.accent }]}>{role.match_score}%</Text>
          </View>
        )}
        {isGig && (
          <View style={st.waitlistTag}>
            <Text style={st.waitlistTagText}>Waitlist</Text>
          </View>
        )}
      </View>

      <View style={st.companyRow}>
        <View style={st.companyIcon}>
          <Ionicons name="lock-closed" size={14} color={T.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={st.verifiedRow}>
            <Ionicons name="checkmark-circle" size={13} color={cfg.accent} />
            <Text style={st.companyName}>Verified Company</Text>
          </View>
          <Text style={st.industryText}>{role.company_industry} · {role.company_size_band}</Text>
        </View>
      </View>

      <Text style={st.roleTitle}>{role.title}</Text>
      <Text style={st.rateText}>
        <Text style={st.rateBold}>${role.rate_min.toLocaleString()}–${role.rate_max.toLocaleString()}</Text>
        <Text style={st.rateSuffix}>{role.rate_type === 'monthly' ? '/mo' : role.rate_type === 'hourly' ? '/hr' : ' fixed'}</Text>
      </Text>

      <View style={st.metaRow}>
        <View style={st.metaChip}>
          <Ionicons name="location-outline" size={12} color={T.textSecondary} />
          <Text style={st.metaText}>{location}</Text>
        </View>
        <View style={st.metaChip}>
          <Ionicons name="time-outline" size={12} color={T.textSecondary} />
          <Text style={st.metaText}>{role.contract_length}</Text>
        </View>
        <View style={st.metaChip}>
          <Ionicons name="trending-up-outline" size={12} color={T.textSecondary} />
          <Text style={st.metaText}>{role.experience_level}</Text>
        </View>
      </View>

      <View style={st.skillsRow}>
        {role.required_skills.must_have.slice(0, 3).map((sk) => (
          <View key={sk} style={[st.skillChip, { backgroundColor: cfg.accent + '10', borderColor: cfg.accent + '25' }]}>
            <Text style={[st.skillText, { color: cfg.accent }]}>{sk}</Text>
          </View>
        ))}
        {role.required_skills.must_have.length > 3 && (
          <Text style={st.moreSkills}>+{role.required_skills.must_have.length - 3}</Text>
        )}
      </View>

      <View style={st.divider} />
    </>
  );

  // ── GIG TIER: Specialized waitlist card ──
  if (isGig) {
    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <View style={[st.card, st.gigCard]}>
          {cardContent}

          {onWaitlist ? (
            <View style={st.onWaitlistBtn}>
              <Ionicons name="checkmark-done" size={16} color={T.textMuted} />
              <Text style={st.onWaitlistText}>On Waitlist</Text>
            </View>
          ) : (
            <Pressable style={st.joinWaitlistBtn} onPress={handleJoinWaitlist}>
              <Ionicons name="flash" size={16} color={T.textOnAccent} />
              <Text style={st.joinWaitlistText}>Join Gig Waitlist</Text>
            </Pressable>
          )}

          <Text style={st.gigNotice}>Gig tier matching launches in Phase 3</Text>

          {/* Toast */}
          {showToast && (
            <Animated.View style={[st.toast, { opacity: toastAnim }]}>
              <Ionicons name="checkmark-circle" size={16} color={T.emerald} />
              <Text style={st.toastText}>You have been added to the Gig tier waitlist. This tier will launch in Phase 3.</Text>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    );
  }

  // ── CORPORATE / SHORT-TERM: Standard card with apply/lock ──
  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
      <Pressable
        style={st.card}
        onPress={() => router.push({ pathname: detailPath, params: { id: role.id } })}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start()}
      >
        {cardContent}

        {applied ? (
          <View style={st.appliedBtn}>
            <Ionicons name="checkmark-done" size={16} color={T.emerald} />
            <Text style={st.appliedText}>Applied</Text>
          </View>
        ) : eligible ? (
          <Pressable style={st.applyBtn} onPress={handleApply}>
            <Ionicons name="checkmark-circle" size={16} color={T.textOnAccent} />
            <Text style={st.applyText}>Apply Now</Text>
          </Pressable>
        ) : (
          <View>
            <View style={st.lockedBtn}>
              <Ionicons name="lock-closed" size={14} color={T.textMuted} />
              <Text style={st.lockedText}>Locked</Text>
            </View>
            <View style={st.missingWrap}>
              <Ionicons name="alert-circle" size={13} color={T.danger} />
              <Text style={st.missingLabel}>{message}</Text>
            </View>
            {missingItems.length > 0 && (
              <View style={st.missingList}>
                {missingItems.map((item, idx) => (
                  <View key={`${item}-${idx}`} style={st.missingChip}>
                    <Ionicons name="close-circle-outline" size={12} color={T.danger} />
                    <Text style={st.missingChipText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  card: {
    backgroundColor: T.card, borderRadius: 16, padding: 16,
    marginBottom: 12, marginHorizontal: 20,
    borderWidth: 1, borderColor: T.border,
  },
  gigCard: { borderColor: T.textMuted + '30', borderStyle: 'dashed' },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tierPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tierDot: { width: 6, height: 6, borderRadius: 3 },
  tierLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  scoreRing: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  scoreText: { fontSize: 12, fontWeight: '800' },

  waitlistTag: { backgroundColor: T.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  waitlistTagText: { fontSize: 10, fontWeight: '700', color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },

  companyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  companyIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  companyName: { fontSize: 13, fontWeight: '600', color: T.textSecondary },
  industryText: { fontSize: 11, color: T.textMuted, marginTop: 1 },

  roleTitle: { fontSize: 17, fontWeight: '700', color: T.textPrimary, marginBottom: 4 },
  rateText: { marginBottom: 10 },
  rateBold: { fontSize: 18, fontWeight: '800', color: T.textPrimary },
  rateSuffix: { fontSize: 13, color: T.textMuted },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  metaText: { fontSize: 11, color: T.textSecondary, fontWeight: '500' },

  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  skillChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  skillText: { fontSize: 11, fontWeight: '500' },
  moreSkills: { fontSize: 11, color: T.textMuted, fontWeight: '600', alignSelf: 'center' },

  divider: { height: 1, backgroundColor: T.border, marginBottom: 12 },

  /* Applied */
  appliedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: T.emeraldBg, borderRadius: 12, height: 44, borderWidth: 1.5, borderColor: T.emerald },
  appliedText: { fontSize: 15, fontWeight: '700', color: T.emerald },

  /* Apply Now */
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: T.accent, borderRadius: 12, height: 44 },
  applyText: { fontSize: 15, fontWeight: '700', color: T.textOnAccent },

  /* Locked */
  lockedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: T.surface, borderRadius: 12, height: 44, borderWidth: 1, borderColor: T.border },
  lockedText: { fontSize: 15, fontWeight: '700', color: T.textMuted },
  missingWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10, backgroundColor: T.dangerBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  missingLabel: { flex: 1, fontSize: 11, color: T.danger, fontWeight: '600', lineHeight: 15 },
  missingList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  missingChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.dangerBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  missingChipText: { fontSize: 10, fontWeight: '600', color: T.danger },

  /* Gig Waitlist */
  joinWaitlistBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: T.textMuted, borderRadius: 12, height: 44 },
  joinWaitlistText: { fontSize: 15, fontWeight: '700', color: T.textOnAccent },
  onWaitlistBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: T.surface, borderRadius: 12, height: 44, borderWidth: 1.5, borderColor: T.textMuted + '30' },
  onWaitlistText: { fontSize: 15, fontWeight: '700', color: T.textMuted },
  gigNotice: { fontSize: 11, color: T.textMuted, textAlign: 'center', marginTop: 8 },

  /* Toast */
  toast: { position: 'absolute', bottom: 12, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.cardElevated, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: T.border },
  toastText: { flex: 1, fontSize: 12, fontWeight: '600', color: T.textPrimary, lineHeight: 16 },
});
