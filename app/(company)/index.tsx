import { useState, useRef, useEffect, useCallback } from 'react';
import { Animated, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  mockCompany,
  mockCompanyRoles,
  PLAN_CONFIG,
  TIER_CONFIG,
  CompanyRole,
} from '@/lib/mock-data';

function RoleRow({
  role,
  index,
}: {
  role: CompanyRole;
  index: number;
}) {
  const cfg = TIER_CONFIG[role.tier];
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const isActive = role.status === 'active';

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <Pressable
        style={st.roleRow}
        onPress={() =>
          router.push({
            pathname: '/(company)/role/[id]',
            params: { id: role.id },
          })
        }
      >
        <View
          style={[
            st.roleIconWrap,
            { backgroundColor: cfg.accent + '14' },
          ]}
        >
          <Ionicons
            name={cfg.icon as any}
            size={16}
            color={cfg.accent}
          />
        </View>
        <View style={st.roleInfo}>
          <Text style={st.roleTitle} numberOfLines={1}>
            {role.title}
          </Text>
          <View style={st.roleMeta}>
            <View
              style={[
                st.statusDot,
                {
                  backgroundColor: isActive
                    ? '#22C55E'
                    : '#F59E0B',
                },
              ]}
            />
            <Text style={st.roleMetaText}>
              {role.status.charAt(0).toUpperCase() +
                role.status.slice(1)}
            </Text>
            <Text style={st.roleMetaSep}>{'·'}</Text>
            <Text style={st.roleMetaText}>
              {role.candidates_matched} matched
            </Text>
            <Text style={st.roleMetaSep}>{'·'}</Text>
            <Text style={st.roleMetaText}>
              {role.intros_accepted} accepted
            </Text>
          </View>
        </View>
        <Ionicons
          name="chevron-forward"
          size={16}
          color="#D1D5DB"
        />
      </Pressable>
    </Animated.View>
  );
}

export default function CompanyDashboardScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const plan = PLAN_CONFIG[mockCompany.plan];
  const slotsUsed = mockCompany.job_slots_active;
  const slotsTotal = mockCompany.job_slots_total;
  const slotsFree = slotsTotal - slotsUsed;
  const totalMatched = mockCompanyRoles.reduce(
    (sum, r) => sum + r.candidates_matched,
    0
  );
  const totalIntros = mockCompanyRoles.reduce(
    (sum, r) => sum + r.intros_sent,
    0
  );
  const totalAccepted = mockCompanyRoles.reduce(
    (sum, r) => sum + r.intros_accepted,
    0
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const stats = [
    {
      label: 'Matched',
      value: totalMatched,
      icon: 'people' as const,
      color: '#1B5E20',
    },
    {
      label: 'Intros',
      value: totalIntros,
      icon: 'send' as const,
      color: '#1565C0',
    },
    {
      label: 'Accepted',
      value: totalAccepted,
      icon: 'checkmark-circle' as const,
      color: '#7B1FA2',
    },
  ];

  return (
    <View style={st.container}>
      <StatusBar style="dark" />
      <FlatList
        data={mockCompanyRoles}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <RoleRow role={item} index={index} />
        )}
        contentContainerStyle={st.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1B5E20"
            colors={['#1B5E20']}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View
              style={[st.header, { paddingTop: insets.top + 8 }]}
            >
              <View style={st.headerRow}>
                <View style={st.profileRow}>
                  <View style={st.avatar}>
                    <Ionicons
                      name="business"
                      size={16}
                      color="#1B5E20"
                    />
                  </View>
                  <View>
                    <Text style={st.companyName}>
                      {mockCompany.name}
                    </Text>
                    <View style={st.verifiedRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={12}
                        color="#1B5E20"
                      />
                      <Text style={st.verifiedText}>
                        Verified Company
                      </Text>
                    </View>
                  </View>
                </View>
                <Pressable style={st.iconBtn}>
                  <Ionicons
                    name="settings-outline"
                    size={20}
                    color="#374151"
                  />
                </Pressable>
              </View>
            </View>

            {/* Plan + Slots banner */}
            <View style={st.bannerWrap}>
              <View style={st.banner}>
                <View style={st.bannerLeft}>
                  <View style={st.planBadge}>
                    <Ionicons
                      name="diamond-outline"
                      size={14}
                      color="#FFFFFF"
                    />
                    <Text style={st.planLabel}>
                      {plan.label} Plan
                    </Text>
                  </View>
                  <Text style={st.bannerSub}>
                    {plan.features[0]}
                  </Text>
                </View>
                <View style={st.slotCircle}>
                  <Text style={st.slotCount}>{slotsFree}</Text>
                  <Text style={st.slotLabel}>free</Text>
                </View>
              </View>
            </View>

            {/* Job slots bar */}
            <View style={st.slotsSection}>
              <View style={st.slotsTitleRow}>
                <Text style={st.slotsTitle}>Job Slots</Text>
                <Text style={st.slotsCount}>
                  {slotsUsed}/{slotsTotal} active
                </Text>
              </View>
              <View style={st.slotsBar}>
                <View
                  style={[
                    st.slotsBarFill,
                    {
                      width: `${
                        (slotsUsed / slotsTotal) * 100
                      }%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Stats row */}
            <View style={st.statsRow}>
              {stats.map((s) => (
                <View key={s.label} style={st.statCard}>
                  <View
                    style={[
                      st.statIconWrap,
                      { backgroundColor: s.color + '14' },
                    ]}
                  >
                    <Ionicons
                      name={s.icon}
                      size={16}
                      color={s.color}
                    />
                  </View>
                  <Text style={st.statValue}>{s.value}</Text>
                  <Text style={st.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Quick actions */}
            <View style={st.quickActions}>
              <Pressable style={st.quickBtn}>
                <View style={st.quickIconWrap}>
                  <Ionicons
                    name="add-circle-outline"
                    size={18}
                    color="#1B5E20"
                  />
                </View>
                <Text style={st.quickLabel}>Post Role</Text>
              </Pressable>
              <Pressable style={st.quickBtn}>
                <View style={st.quickIconWrap}>
                  <Ionicons
                    name="analytics-outline"
                    size={18}
                    color="#1B5E20"
                  />
                </View>
                <Text style={st.quickLabel}>Analytics</Text>
              </Pressable>
              <Pressable style={st.quickBtn}>
                <View style={st.quickIconWrap}>
                  <Ionicons
                    name="card-outline"
                    size={18}
                    color="#1B5E20"
                  />
                </View>
                <Text style={st.quickLabel}>Billing</Text>
              </Pressable>
            </View>

            {/* Section: Active Roles */}
            <View style={st.sectionRow}>
              <Text style={st.sectionTitle}>Active Roles</Text>
              <Text style={st.sectionCount}>
                {mockCompanyRoles.length}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={st.emptyWrap}>
            <View style={st.emptyCircle}>
              <Ionicons
                name="briefcase-outline"
                size={32}
                color="#D1D5DB"
              />
            </View>
            <Text style={st.emptyTitle}>No roles posted</Text>
            <Text style={st.emptySub}>
              Post your first role to start matching
            </Text>
          </View>
        }
      />
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  listContent: { paddingBottom: 24 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  verifiedText: {
    fontSize: 11,
    color: '#1B5E20',
    fontWeight: '600',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bannerWrap: { paddingHorizontal: 20, marginBottom: 20 },
  banner: {
    backgroundColor: '#1B5E20',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerLeft: { flex: 1 },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 6,
  },
  planLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bannerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  slotCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotCount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  slotLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginTop: -2,
  },

  slotsSection: { paddingHorizontal: 20, marginBottom: 20 },
  slotsTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  slotsCount: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  slotsBar: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  slotsBarFill: {
    height: 6,
    backgroundColor: '#1B5E20',
    borderRadius: 3,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 14,
    alignItems: 'center',
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },

  quickActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickBtn: { flex: 1, alignItems: 'center', gap: 6 },
  quickIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F0F9F0',
    borderWidth: 1,
    borderColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },

  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: '#1B5E20',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },

  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 10,
    gap: 12,
  },
  roleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleInfo: { flex: 1 },
  roleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 3,
  },
  roleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  roleMetaText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  roleMetaSep: { fontSize: 11, color: '#D1D5DB' },

  emptyWrap: { alignItems: 'center', paddingTop: 40, gap: 6 },
  emptyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  emptySub: { fontSize: 13, color: '#9CA3AF' },
});
