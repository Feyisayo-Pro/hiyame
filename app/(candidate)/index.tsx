import { useCallback, useState, useMemo, useEffect } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { getCandidateStats, CandidateStats, relativeTime } from '@/lib/dashboardStats';
import { TIER_CONFIG } from '@/lib/mock-data';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import { useTheme, useThemeToggle, ThemePalette } from '@/lib/theme';

const VERIFY_COMPONENTS: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'identity', label: 'Identity Check', icon: 'id-card-outline' },
  { key: 'video_intro', label: 'Video Introduction', icon: 'videocam-outline' },
  { key: 'skills_assessment', label: 'Skills Assessment', icon: 'shield-checkmark-outline' },
  { key: 'employer_review', label: 'Employer Review', icon: 'star-outline' },
];

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function introStatusMeta(status: string, T: ThemePalette) {
  switch (status) {
    case 'sent': return { label: 'Respond', color: T.amber, bg: T.amberBg };
    case 'accepted': return { label: 'Connected', color: T.emerald, bg: T.emeraldBg };
    case 'declined': return { label: 'Declined', color: T.textSecondary, bg: T.surface };
    case 'expired': return { label: 'Expired', color: T.danger, bg: T.dangerBg };
    default: return { label: status, color: T.textSecondary, bg: T.surface };
  }
}

export default function CandidateHomeScreen() {
  const T = useTheme();
  const { mode, toggleTheme } = useThemeToggle();
  const st = useMemo(() => makeStyles(T), [T]);
  const { candidateId } = useAuth();

  const [stats, setStats] = useState<CandidateStats | null>(null);
  const [passedComponents, setPassedComponents] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!candidateId) { setStats(null); return; }
    const [s, { data: vrecs }] = await Promise.all([
      getCandidateStats(candidateId),
      supabase.from('verification_records').select('component, status').eq('candidate_id', candidateId),
    ]);
    setStats(s);
    setPassedComponents(new Set((vrecs ?? []).filter((v) => v.status === 'passed').map((v) => v.component)));
  }, [candidateId]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const verifiedCount = passedComponents.size;
  const isFullyVerified = verifiedCount === 4;
  const firstName = stats?.fullName ? stats.fullName.split(' ')[0] : 'there';
  const progressPercent = (verifiedCount / 4) * 100;

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
                  <Text style={st.greeting}>{greeting()}</Text>
                  <Text style={st.userName}>{firstName}</Text>
                </View>
              </View>
              <View style={st.headerActions}>
                <Pressable style={st.iconBtn} onPress={toggleTheme} accessibilityRole="button" accessibilityLabel="Toggle theme">
                  <Ionicons name={mode === 'light' ? 'sunny-outline' : 'moon-outline'} size={20} color={T.textSecondary} />
                </Pressable>
                <Pressable style={st.iconBtn} onPress={() => supabase.auth.signOut()} accessibilityRole="button" accessibilityLabel="Sign out">
                  <Ionicons name="log-out-outline" size={20} color={T.textSecondary} />
                </Pressable>
              </View>
            </View>
          </View>

          {/* Verification score card */}
          <View style={st.scoreCard}>
            <View style={st.scoreHeader}>
              <View style={st.scoreLeft}>
                <View style={[st.scoreRing, isFullyVerified && st.scoreRingComplete]}>
                  <Text style={[st.scoreRingText, isFullyVerified && st.scoreRingTextComplete]}>{verifiedCount}/4</Text>
                </View>
                <View>
                  <Text style={st.scoreTitle}>{isFullyVerified ? 'Profile Verified' : 'Verification In Progress'}</Text>
                  <Text style={st.scoreSub}>
                    {isFullyVerified
                      ? 'All components complete — you are match-ready'
                      : `${4 - verifiedCount} component${4 - verifiedCount !== 1 ? 's' : ''} remaining · unverified profiles aren't matched`}
                  </Text>
                </View>
              </View>
              {isFullyVerified && <MaterialCommunityIcons name="decagram" size={28} color={T.emerald} />}
            </View>

            <View style={st.progressBarBg}>
              <View style={[st.progressBarFill, { width: `${progressPercent}%`, backgroundColor: isFullyVerified ? T.emerald : T.accent }]} />
            </View>

            {!isFullyVerified && (
              <Pressable style={st.verifyLink} onPress={() => router.push('/(candidate)/verification')}>
                <Ionicons name="shield-checkmark-outline" size={16} color={T.accent} />
                <Text style={st.verifyLinkText}>Continue Verification</Text>
                <Ionicons name="arrow-forward" size={14} color={T.accent} />
              </Pressable>
            )}
          </View>

          {/* Quick stats — real */}
          <View style={st.statsRow}>
            <View style={st.statCard}>
              <View style={[st.statIconWrap, { backgroundColor: T.accentBg }]}>
                <Ionicons name="shield-checkmark" size={16} color={T.accent} />
              </View>
              <Text style={st.statValue}>{verifiedCount}/4</Text>
              <Text style={st.statLabel}>Verified</Text>
            </View>
            <View style={st.statCard}>
              <View style={[st.statIconWrap, { backgroundColor: T.accentBg }]}>
                <Ionicons name="mail-unread" size={16} color={T.accent} />
              </View>
              <Text style={st.statValue}>{stats?.introsPending ?? 0}</Text>
              <Text style={st.statLabel}>To respond</Text>
            </View>
            <View style={st.statCard}>
              <View style={[st.statIconWrap, { backgroundColor: T.accentBg }]}>
                <Ionicons name="people" size={16} color={T.accent} />
              </View>
              <Text style={st.statValue}>{stats?.introsAccepted ?? 0}</Text>
              <Text style={st.statLabel}>Connected</Text>
            </View>
          </View>

          {/* Verification checklist */}
          <View style={st.section}>
            <View style={st.sectionRow}>
              <Text style={st.sectionTitle}>Verification Checklist</Text>
              <Pressable onPress={() => router.push('/(candidate)/verification')} style={st.seeAll}>
                <Text style={st.seeAllText}>View All</Text>
                <Ionicons name="arrow-forward" size={14} color={T.accent} />
              </Pressable>
            </View>

            {VERIFY_COMPONENTS.map((item) => {
              const done = passedComponents.has(item.key);
              return (
                <View key={item.key} style={st.checkItem}>
                  <View style={[st.checkIconWrap, done && st.checkIconDone]}>
                    <Ionicons name={item.icon} size={18} color={done ? T.emerald : T.accent} />
                  </View>
                  <Text style={[st.checkLabel, done && st.checkLabelDone]}>{item.label}</Text>
                  <View style={[st.checkStatus, done ? st.checkStatusDone : st.checkStatusPending]}>
                    <Text style={[st.checkStatusText, done ? st.checkStatusTextDone : st.checkStatusTextPending]}>
                      {done ? 'Done' : 'Pending'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Your introductions — real */}
          <View style={st.section}>
            <View style={st.sectionRow}>
              <Text style={st.sectionTitle}>Your Introductions</Text>
              <Pressable onPress={() => router.push('/(candidate)/opportunities')} style={st.seeAll}>
                <Text style={st.seeAllText}>View All</Text>
                <Ionicons name="arrow-forward" size={14} color={T.accent} />
              </Pressable>
            </View>

            {stats === null ? (
              <View style={st.introEmpty}><ActivityIndicator color={T.accent} /></View>
            ) : stats.recentIntros.length === 0 ? (
              <View style={st.introEmpty}>
                <Ionicons name="mail-outline" size={26} color={T.textMuted} />
                <Text style={st.introEmptyText}>
                  {isFullyVerified
                    ? "No introductions yet. When a company wants to connect, it'll show up here."
                    : 'Finish verification to become eligible for matching.'}
                </Text>
              </View>
            ) : (
              stats.recentIntros.map((intro) => {
                const meta = introStatusMeta(intro.status, T);
                const cfg = TIER_CONFIG[intro.roleTier];
                return (
                  <Pressable key={intro.id} style={st.introRow} onPress={() => router.push('/(candidate)/opportunities')}>
                    <View style={[st.introIcon, { backgroundColor: cfg.accent + '18' }]}>
                      <Ionicons name={cfg.icon as keyof typeof Ionicons.glyphMap} size={16} color={cfg.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.introTitle} numberOfLines={1}>
                        {intro.status === 'accepted' ? intro.counterpartyName : intro.roleTitle}
                      </Text>
                      <Text style={st.introSub} numberOfLines={1}>{cfg.label} · {relativeTime(intro.at)}</Text>
                    </View>
                    <View style={[st.introBadge, { backgroundColor: meta.bg }]}>
                      <Text style={[st.introBadgeText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>

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
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText: { fontSize: 13, fontWeight: '600', color: T.accent },

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

  introEmpty: { alignItems: 'center', gap: 8, paddingVertical: 28, backgroundColor: T.card, borderRadius: 14, borderWidth: 1, borderColor: T.border, paddingHorizontal: 20 },
  introEmptyText: { fontSize: 13, color: T.textMuted, textAlign: 'center', lineHeight: 18 },
  introRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.card, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 12, marginBottom: 10 },
  introIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  introTitle: { fontSize: 14, fontWeight: '600', color: T.textPrimary },
  introSub: { fontSize: 12, color: T.textSecondary, marginTop: 1 },
  introBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  introBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
});
