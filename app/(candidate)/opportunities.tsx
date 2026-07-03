import { useState, useRef, useEffect, useCallback } from 'react';
import { Animated, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mockRoles, Role, Tier, TIER_CONFIG } from '@/lib/mock-data';

const filters = ['All', 'Corporate', 'Blue-Collar', 'Short-Term', 'Gig'] as const;
type FilterValue = Tier | 'all';
const filterToTier: Record<string, FilterValue> = { All: 'all', Corporate: 'corporate', 'Blue-Collar': 'blue_collar', 'Short-Term': 'short_term', Gig: 'gig' };

function CompatRing({ score, size = 38, accent }: { score: number; size?: number; accent: string }) {
  const isWaitlist = score === 0;
  return (
    <View style={[st.compatRing, { width: size, height: size, borderRadius: size / 2, borderColor: isWaitlist ? '#E5E7EB' : accent }]}>
      <Text style={[st.compatNum, { color: isWaitlist ? '#9CA3AF' : accent, fontSize: size * 0.32 }]}>
        {isWaitlist ? '—' : `${score}`}
      </Text>
      {!isWaitlist && <Text style={[st.compatPct, { color: accent }]}>%</Text>}
    </View>
  );
}

function RoleCard({ role, index, liked, onLike, onPass }: { role: Role; index: number; liked: boolean; onLike: () => void; onPass: () => void }) {
  const cfg = TIER_CONFIG[role.tier];
  const isGig = role.tier === 'gig';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay: index * 60, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  const location = role.location_type === 'remote' ? 'Remote' : role.location_type === 'hybrid' ? `Hybrid · ${role.location_city}` : `${role.location_city}, ${role.location_country}`;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
      <Pressable
        style={st.card}
        onPress={() => router.push({ pathname: '/(candidate)/role/[id]', params: { id: role.id } })}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start()}
      >
        <View style={st.cardTopRow}>
          <View style={[st.tierPill, { backgroundColor: cfg.accent + '14' }]}>
            <View style={[st.tierDot, { backgroundColor: cfg.accent }]} />
            <Text style={[st.tierLabel, { color: cfg.accent }]}>{cfg.label}</Text>
          </View>
          <CompatRing score={role.match_score} accent={cfg.accent} />
        </View>

        <View style={st.companyRow}>
          <View style={st.companyIcon}>
            <Ionicons name="lock-closed" size={14} color="#9CA3AF" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={st.verifiedRow}>
              <Ionicons name="checkmark-circle" size={13} color="#1B5E20" />
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
            <Ionicons name="location-outline" size={12} color="#6B7280" />
            <Text style={st.metaText}>{location}</Text>
          </View>
          <View style={st.metaChip}>
            <Ionicons name="time-outline" size={12} color="#6B7280" />
            <Text style={st.metaText}>{role.contract_length}</Text>
          </View>
          <View style={st.metaChip}>
            <Ionicons name="trending-up-outline" size={12} color="#6B7280" />
            <Text style={st.metaText}>{role.experience_level}</Text>
          </View>
        </View>

        <View style={st.skillsRow}>
          {role.required_skills.must_have.slice(0, 3).map((sk) => (
            <View key={sk} style={st.skillChip}><Text style={st.skillText}>{sk}</Text></View>
          ))}
          {role.required_skills.must_have.length > 3 && (
            <Text style={st.moreSkills}>+{role.required_skills.must_have.length - 3}</Text>
          )}
        </View>

        <View style={st.divider} />

        <View style={st.actionRow}>
          <Pressable style={st.passBtn} onPress={onPass} hitSlop={8}>
            <Ionicons name="close" size={18} color="#9CA3AF" />
          </Pressable>
          <Pressable style={[st.interestedBtn, { backgroundColor: cfg.accent }]} onPress={onLike} hitSlop={4}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={15} color="#FFFFFF" />
            <Text style={st.interestedText}>{isGig ? 'Join Waitlist' : 'Interested'}</Text>
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function OpportunitiesScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterValue>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [likedRoles, setLikedRoles] = useState<Set<string>>(new Set());
  const [passedRoles, setPassedRoles] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const filtered = mockRoles
    .filter((r) => !passedRoles.has(r.id))
    .filter((r) => activeFilter === 'all' || r.tier === activeFilter)
    .filter((r) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.company_industry.toLowerCase().includes(q) ||
        r.required_skills.must_have.some((sk) => sk.toLowerCase().includes(q)) ||
        r.required_skills.nice_to_have.some((sk) => sk.toLowerCase().includes(q)) ||
        (r.location_city || '').toLowerCase().includes(q) ||
        (r.location_country || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => b.match_score - a.match_score);

  const toggleLike = useCallback((id: string) => {
    setLikedRoles((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);
  const passRole = useCallback((id: string) => { setPassedRoles((prev) => new Set(prev).add(id)); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); setPassedRoles(new Set()); setSearchQuery(''); setTimeout(() => setRefreshing(false), 800); }, []);

  return (
    <View style={st.container}>
      <StatusBar style="dark" />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <RoleCard role={item} index={index} liked={likedRoles.has(item.id)} onLike={() => toggleLike(item.id)} onPass={() => passRole(item.id)} />
        )}
        contentContainerStyle={st.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1B5E20" colors={['#1B5E20']} />}
        ListHeaderComponent={
          <View style={[st.headerZone, { paddingTop: insets.top + 12 }]}>
            {/* Title row */}
            <View style={st.headerTitleRow}>
              <View>
                <Text style={st.headerTitle}>Explore Matches</Text>
                <Text style={st.headerSub}>Sorted by compatibility</Text>
              </View>
              <View style={st.countBadge}><Text style={st.countText}>{filtered.length}</Text></View>
            </View>

            {/* Search bar */}
            <View style={st.searchBar}>
              <Ionicons name="search-outline" size={18} color="#9CA3AF" />
              <TextInput
                style={st.searchInput}
                placeholder="Search roles, skills, locations..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color="#D1D5DB" />
                </Pressable>
              )}
            </View>

            {/* Filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chipRow}>
              {filters.map((label) => {
                const value = filterToTier[label];
                const isActive = activeFilter === value;
                return (
                  <Pressable key={label} style={[st.chip, isActive && st.chipActive]} onPress={() => setActiveFilter(value)}>
                    <Text style={[st.chipText, isActive && st.chipTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <View style={st.emptyWrap}>
            <View style={st.emptyCircle}><Ionicons name="search-outline" size={32} color="#D1D5DB" /></View>
            <Text style={st.emptyTitle}>{searchQuery ? 'No results found' : 'No matches here'}</Text>
            <Text style={st.emptySub}>{searchQuery ? 'Try different keywords or clear filters' : 'Try a different filter or pull to refresh'}</Text>
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
  headerZone: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#FFFFFF', marginBottom: 4 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  countBadge: { backgroundColor: '#1B5E20', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  countText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  /* Search */
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6', paddingHorizontal: 14, height: 44, gap: 10, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1A1A', fontWeight: '500' },

  /* Chips */
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: '#1B5E20', borderColor: '#1B5E20' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  chipTextActive: { color: '#FFFFFF' },

  /* Card */
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, marginHorizontal: 20, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tierPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tierDot: { width: 6, height: 6, borderRadius: 3 },
  tierLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },

  companyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  companyIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  companyName: { fontSize: 13, fontWeight: '600', color: '#374151' },
  industryText: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },

  roleTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  rateText: { marginBottom: 10 },
  rateBold: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  rateSuffix: { fontSize: 13, color: '#9CA3AF' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F9FAFB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  metaText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },

  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  skillChip: { backgroundColor: '#F0F9F0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#E8F5E9' },
  skillText: { fontSize: 11, fontWeight: '500', color: '#1B5E20' },
  moreSkills: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', alignSelf: 'center' },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 12 },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  passBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  interestedBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 10 },
  interestedText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  /* Compat ring */
  compatRing: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  compatNum: { fontWeight: '800' },
  compatPct: { fontSize: 8, fontWeight: '700', marginTop: -2 },

  /* Empty */
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 6 },
  emptyCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptySub: { fontSize: 13, color: '#9CA3AF' },
});
