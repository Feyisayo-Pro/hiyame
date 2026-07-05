import { useState, useRef, useEffect, useMemo} from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mockRoles, Role, Tier, TIER_CONFIG } from '@/lib/mock-data';
import { useTheme, ThemePalette } from '@/lib/theme';

function formatLocation(role: Role): string {
  if (role.location_type === 'remote') return 'Remote';
  const city = role.location_city || '';
  const country = role.location_country || '';
  const place = [city, country].filter(Boolean).join(', ');
  return role.location_type === 'hybrid' ? `Hybrid · ${place}` : place;
}

export default function RoleDetailScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);

  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const role = mockRoles.find((r) => r.id === id);
  const [saved, setSaved] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const ctaScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  if (!role) {
    return (
      <View style={st.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={40} color={T.textMuted} />
        <Text style={st.emptyText}>Role not found</Text>
      </View>
    );
  }

  const cfg = TIER_CONFIG[role.tier];
  const isWaitlist = role.tier === 'gig';
  const scoreText = role.match_score === 0 ? 'Waitlist' : `${role.match_score}%`;
  const ctaLabel = isWaitlist ? 'Join Waitlist' : "I'm Interested";

  const matchItems = [
    { icon: 'checkmark-circle' as const, label: `Skills: ${role.required_skills.must_have.length}/${role.required_skills.must_have.length} must-have matched` },
    { icon: 'checkmark-circle' as const, label: 'Experience: Exact level match' },
    { icon: 'checkmark-circle' as const, label: 'Rate: Within your range' },
    { icon: 'checkmark-circle' as const, label: 'Availability: Within 14 days' },
  ];

  return (
    <View style={st.container}>

      {/* Header */}
      <View style={[st.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={st.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={T.textPrimary} />
        </Pressable>
        <Text style={st.headerTitle}>Opportunity Details</Text>
        <Pressable style={st.headerBtn} onPress={() => setSaved(!saved)}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={saved ? T.accent : T.textPrimary} />
        </Pressable>
      </View>

      <Animated.View style={[st.contentWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>

          {/* Company logo */}
          <View style={st.logoSection}>
            <View style={st.logoCircle}>
              <Ionicons name="lock-closed" size={20} color={T.textMuted} />
            </View>
          </View>

          {/* Title + tier */}
          <Text style={st.roleTitle}>{role.title}</Text>
          <View style={[st.tierBadge, { backgroundColor: cfg.accent + '14' }]}>
            <View style={[st.tierDot, { backgroundColor: cfg.accent }]} />
            <Text style={[st.tierBadgeText, { color: cfg.accent }]}>{cfg.label}</Text>
          </View>

          {/* Info cards */}
          <View style={st.infoRow}>
            {[
              { icon: 'cash-outline' as const, label: 'Rate', value: `$${role.rate_min.toLocaleString()}–$${role.rate_max.toLocaleString()}/${role.rate_type === 'monthly' ? 'mo' : role.rate_type === 'hourly' ? 'hr' : 'fixed'}` },
              { icon: 'document-text-outline' as const, label: 'Contract', value: role.contract_length },
              { icon: 'location-outline' as const, label: 'Location', value: formatLocation(role) },
            ].map((item) => (
              <View key={item.label} style={st.infoCard}>
                <Ionicons name={item.icon} size={16} color={T.textSecondary} style={{ marginBottom: 6 }} />
                <Text style={st.infoLabel}>{item.label}</Text>
                <Text style={st.infoValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* Compatibility section */}
          <View style={st.matchCard}>
            <View style={st.matchTitleRow}>
              <View style={st.matchIconCircle}>
                <Ionicons name="sparkles" size={16} color={T.accent} />
              </View>
              <Text style={st.matchTitle}>Your Compatibility</Text>
              <View style={[st.matchScorePill, { backgroundColor: isWaitlist ? '#E65100' : T.accent }]}>
                <Text style={st.matchScoreText}>{scoreText}</Text>
              </View>
            </View>
            {matchItems.map((item, i) => (
              <View key={i} style={st.matchRow}>
                <Ionicons name={item.icon} size={16} color={T.accent} />
                <Text style={st.matchText}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* Required skills */}
          <View style={st.section}>
            <Text style={st.sectionTitle}>Required Skills</Text>
            <View style={st.skillWrap}>
              {role.required_skills.must_have.map((skill) => (
                <View key={skill} style={st.requiredSkillPill}>
                  <Ionicons name="checkmark-circle" size={12} color={T.accent} />
                  <Text style={st.requiredSkillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Nice to have */}
          <View style={st.section}>
            <Text style={st.sectionTitle}>Nice to Have</Text>
            <View style={st.skillWrap}>
              {role.required_skills.nice_to_have.map((skill) => (
                <View key={skill} style={st.optionalSkillPill}>
                  <Text style={st.optionalSkillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* About */}
          <View style={st.section}>
            <Text style={st.sectionTitle}>About This Opportunity</Text>
            <Text style={st.bodyText} numberOfLines={showFullDesc ? undefined : 3}>
              {role.visibility_description} This role is part of a growing team focused on scaling operations across the African market. The ideal candidate will bring both technical depth and collaborative energy to a fast-paced environment.
            </Text>
            <Pressable onPress={() => setShowFullDesc(!showFullDesc)}>
              <Text style={st.seeMore}>{showFullDesc ? 'Show Less' : 'See More...'}</Text>
            </Pressable>
          </View>

          {/* Company info */}
          <View style={st.companyInfoRow}>
            <View style={st.companyInfoItem}>
              <Ionicons name="business-outline" size={15} color={T.textSecondary} />
              <Text style={st.companyInfoText}>{role.company_size_band}</Text>
            </View>
            <View style={st.companyInfoItem}>
              <Ionicons name="layers-outline" size={15} color={T.textSecondary} />
              <Text style={st.companyInfoText}>{role.company_industry}</Text>
            </View>
          </View>

          {/* Privacy card */}
          <View style={st.privacyCard}>
            <Ionicons name="shield-checkmark-outline" size={18} color={T.accent} />
            <Text style={st.privacyText}>Company details revealed after mutual acceptance</Text>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Footer CTA */}
      <View style={[st.footer, { paddingBottom: Platform.OS === 'ios' ? insets.bottom + 8 : 16 }]}>
        <Pressable style={st.bookmarkBtn} onPress={() => setSaved(!saved)}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={saved ? T.accent : T.textPrimary} />
        </Pressable>
        <Animated.View style={{ flex: 1, transform: [{ scale: ctaScale }] }}>
          <Pressable
            style={[st.ctaButton, { backgroundColor: isWaitlist ? '#E65100' : cfg.accent }]}
            onPressIn={() => Animated.spring(ctaScale, { toValue: 0.97, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(ctaScale, { toValue: 1, friction: 3, useNativeDriver: true }).start()}
          >
            <Ionicons name={isWaitlist ? 'time-outline' : 'heart'} size={16} color={T.textOnAccent} />
            <Text style={st.ctaText}>{ctaLabel}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  header: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.bg, borderBottomWidth: 1, borderBottomColor: T.border },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.card, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: T.textPrimary },

  contentWrap: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 },

  logoSection: { alignItems: 'center', marginBottom: 16 },
  logoCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: T.card, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },

  roleTitle: { fontSize: 22, fontWeight: '800', color: T.textPrimary, textAlign: 'center', marginBottom: 8, letterSpacing: -0.3 },
  tierBadge: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, marginBottom: 20 },
  tierDot: { width: 6, height: 6, borderRadius: 3 },
  tierBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },

  infoRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  infoCard: { flex: 1, backgroundColor: T.card, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 12, alignItems: 'center' },
  infoLabel: { fontSize: 10, color: T.textMuted, textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.4, marginBottom: 3 },
  infoValue: { fontSize: 12, fontWeight: '700', color: T.textPrimary, textAlign: 'center' },

  matchCard: { backgroundColor: T.accentBg, borderRadius: 14, borderWidth: 1, borderColor: T.accentBg20, padding: 16, marginBottom: 20 },
  matchTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  matchIconCircle: { width: 32, height: 32, borderRadius: 8, backgroundColor: T.accentBg20, alignItems: 'center', justifyContent: 'center' },
  matchTitle: { fontSize: 15, fontWeight: '700', color: T.textPrimary, flex: 1, marginLeft: 10 },
  matchScorePill: { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  matchScoreText: { color: T.textOnAccent, fontSize: 12, fontWeight: '800' },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  matchText: { fontSize: 13, color: T.textSecondary, fontWeight: '500' },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: T.textPrimary, marginBottom: 10 },
  skillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  requiredSkillPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: T.accentBg, borderWidth: 1, borderColor: T.accentBg20, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  requiredSkillText: { fontSize: 12, fontWeight: '600', color: T.accent },
  optionalSkillPill: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  optionalSkillText: { fontSize: 12, color: T.textSecondary, fontWeight: '500' },

  bodyText: { fontSize: 14, lineHeight: 22, color: T.textSecondary },
  seeMore: { fontSize: 13, fontWeight: '700', color: T.accent, marginTop: 6 },

  companyInfoRow: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  companyInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  companyInfoText: { fontSize: 12, color: T.textSecondary, fontWeight: '500' },

  privacyCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.accentBg, borderWidth: 1, borderColor: T.accentBg20, borderRadius: 12, padding: 14, marginBottom: 20 },
  privacyText: { color: T.textSecondary, fontSize: 12, flex: 1, fontWeight: '500' },

  footer: { backgroundColor: T.bg, paddingHorizontal: 20, paddingTop: 12, flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: T.border },
  bookmarkBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: T.card, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  ctaButton: { flex: 1, height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaText: { color: T.textOnAccent, fontSize: 15, fontWeight: '700' },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: T.bg },
  emptyText: { fontSize: 15, color: T.textMuted },
});
