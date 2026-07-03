import { useState, useRef, useEffect, useCallback } from 'react';
import { Animated, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mockRoles, Role, TIER_CONFIG } from '@/lib/mock-data';

/* ── Small preview card (top 3 matches) ── */
function MatchPreview({ role, index }: { role: Role; index: number }) {
  const cfg = TIER_CONFIG[role.tier];
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay: index * 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, delay: index * 100, useNativeDriver: true }),
    ]).start();
  }, []);

  const location = role.location_type === 'remote' ? 'Remote' : role.location_type === 'hybrid' ? `Hybrid` : role.location_city || '';

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <Pressable
        style={st.previewCard}
        onPress={() => router.push({ pathname: '/(candidate)/role/[id]', params: { id: role.id } })}
      >
        {/* Left: compat score */}
        <View style={[st.previewScore, { borderColor: cfg.accent }]}>
          <Text style={[st.previewScoreNum, { color: cfg.accent }]}>
            {role.match_score === 0 ? '—' : role.match_score}
          </Text>
          {role.match_score > 0 && <Text style={[st.previewScorePct, { color: cfg.accent }]}>%</Text>}
        </View>

        {/* Center: info */}
        <View style={st.previewInfo}>
          <View style={st.previewTitleRow}>
            <Text style={st.previewTitle} numberOfLines={1}>{role.title}</Text>
          </View>
          <View style={st.previewMeta}>
            <View style={[st.previewTierDot, { backgroundColor: cfg.accent }]} />
            <Text style={st.previewMetaText}>{cfg.label}</Text>
            <Text style={st.previewMetaSep}>&middot;</Text>
            <Text style={st.previewMetaText}>{location}</Text>
          </View>
          <Text style={st.previewRate}>
            ${role.rate_min.toLocaleString()}–${role.rate_max.toLocaleString()}
            <Text style={st.previewRateSuffix}>{role.rate_type === 'monthly' ? '/mo' : role.rate_type === 'hourly' ? '/hr' : ' fixed'}</Text>
          </Text>
        </View>

        {/* Right: arrow */}
        <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
      </Pressable>
    </Animated.View>
  );
}

export default function CandidateHomeScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const allMatches = mockRoles.sort((a, b) => b.match_score - a.match_score);
  const topMatches = allMatches.filter((r) => r.match_score > 0).slice(0, 3);
  const matchCount = allMatches.filter((r) => r.match_score >= 80).length;
  const savedCount = 0;
  const introCount = 0;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const stats = [
    { label: 'Matches', value: allMatches.length, icon: 'heart' as const, color: '#1B5E20' },
    { label: 'Saved', value: savedCount, icon: 'bookmark' as const, color: '#1565C0' },
    { label: 'Intros', value: introCount, icon: 'people' as const, color: '#7B1FA2' },
  ];

  return (
    <View style={st.container}>
      <StatusBar style="dark" />
      <FlatList
        data={topMatches}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <MatchPreview role={item} index={index} />}
        contentContainerStyle={st.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1B5E20" colors={['#1B5E20']} />}
        ListHeaderComponent={
          <View>
            {/* ── Header ── */}
            <View style={[st.header, { paddingTop: insets.top + 8 }]}>
              <View style={st.headerRow}>
                <View style={st.profileRow}>
                  <View style={st.avatar}>
                    <Ionicons name="person" size={16} color="#1B5E20" />
                  </View>
                  <View>
                    <Text style={st.greeting}>Good morning</Text>
                    <Text style={st.userName}>Amara Osei</Text>
                  </View>
                </View>
                <Pressable style={st.iconBtn} onPress={() => router.push('/(candidate)/notifications')}>
                  <Ionicons name="notifications-outline" size={20} color="#374151" />
                  <View style={st.notifDot} />
                </Pressable>
              </View>
            </View>

            {/* ── Match banner ── */}
            <Pressable style={st.bannerWrap} onPress={() => router.push('/(candidate)/opportunities')}>
              <View style={st.banner}>
                <View style={st.bannerIconWrap}>
                  <Ionicons name="heart" size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.bannerTitle}>{matchCount} new matches this week</Text>
                  <Text style={st.bannerSub}>Tap to explore all opportunities</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color="#1B5E20" />
              </View>
            </Pressable>

            {/* ── Stats row ── */}
            <View style={st.statsRow}>
              {stats.map((s) => (
                <View key={s.label} style={st.statCard}>
                  <View style={[st.statIconWrap, { backgroundColor: s.color + '14' }]}>
                    <Ionicons name={s.icon} size={16} color={s.color} />
                  </View>
                  <Text style={st.statValue}>{s.value}</Text>
                  <Text style={st.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* ── Quick actions ── */}
            <View style={st.quickActions}>
              <Pressable style={st.quickBtn} onPress={() => router.push('/(candidate)/opportunities')}>
                <View style={st.quickIconWrap}>
                  <Ionicons name="compass-outline" size={18} color="#1B5E20" />
                </View>
                <Text style={st.quickLabel}>Explore</Text>
              </Pressable>
              <Pressable style={st.quickBtn} onPress={() => router.push('/(candidate)/profile')}>
                <View style={st.quickIconWrap}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#1B5E20" />
                </View>
                <Text style={st.quickLabel}>Verify</Text>
              </Pressable>
              <Pressable style={st.quickBtn} onPress={() => router.push('/(candidate)/profile')}>
                <View style={st.quickIconWrap}>
                  <Ionicons name="create-outline" size={18} color="#1B5E20" />
                </View>
                <Text style={st.quickLabel}>Profile</Text>
              </Pressable>
            </View>

            {/* ── Section: Top Matches ── */}
            <View style={st.sectionRow}>
              <Text style={st.sectionTitle}>Top Matches</Text>
              <Pressable onPress={() => router.push('/(candidate)/opportunities')} style={st.seeAll}>
                <Text style={st.seeAllText}>See All</Text>
                <Ionicons name="arrow-forward" size={14} color="#1B5E20" />
              </Pressable>
            </View>
          </View>
        }
        ListFooterComponent={
          <Pressable style={st.viewAllBtn} onPress={() => router.push('/(candidate)/opportunities')}>
            <Text style={st.viewAllText}>View All Matches</Text>
            <Ionicons name="arrow-forward" size={16} color="#1B5E20" />
          </Pressable>
        }
        ListEmptyComponent={
          <View style={st.emptyWrap}>
            <View style={st.emptyCircle}><Ionicons name="heart-dislike-outline" size={32} color="#D1D5DB" /></View>
            <Text style={st.emptyTitle}>No matches yet</Text>
            <Text style={st.emptySub}>Complete your profile to start getting matched</Text>
          </View>
        }
      />
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  listContent: { paddingBottom: 24 },

  /* Header */
  header: { paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#FFFFFF' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
  greeting: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  userName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  notifDot: { position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#FFFFFF' },

  /* Banner */
  bannerWrap: { paddingHorizontal: 20, marginBottom: 16 },
  banner: { backgroundColor: '#1B5E20', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  bannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  /* Stats */
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#F3F4F6', padding: 14, alignItems: 'center' },
  statIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },

  /* Quick actions */
  quickActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 24 },
  quickBtn: { flex: 1, alignItems: 'center', gap: 6 },
  quickIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#F0F9F0', borderWidth: 1, borderColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 11, fontWeight: '600', color: '#374151' },

  /* Section */
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText: { fontSize: 13, fontWeight: '600', color: '#1B5E20' },

  /* Preview card */
  previewCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#F3F4F6', padding: 14, marginHorizontal: 20, marginBottom: 10, gap: 12 },
  previewScore: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  previewScoreNum: { fontSize: 14, fontWeight: '800' },
  previewScorePct: { fontSize: 8, fontWeight: '700', marginTop: -2 },
  previewInfo: { flex: 1 },
  previewTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', flex: 1 },
  previewMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  previewTierDot: { width: 6, height: 6, borderRadius: 3 },
  previewMetaText: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  previewMetaSep: { fontSize: 11, color: '#D1D5DB' },
  previewRate: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginTop: 4 },
  previewRateSuffix: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },

  /* View all button */
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 20, marginTop: 4, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F0F9F0', borderWidth: 1, borderColor: '#E8F5E9' },
  viewAllText: { fontSize: 14, fontWeight: '700', color: '#1B5E20' },

  /* Empty */
  emptyWrap: { alignItems: 'center', paddingTop: 40, gap: 6 },
  emptyCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptySub: { fontSize: 13, color: '#9CA3AF' },
});
