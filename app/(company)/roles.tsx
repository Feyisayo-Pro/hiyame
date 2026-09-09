import { useCallback, useEffect, useState, useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette } from '@/lib/theme';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { TIER_CONFIG, Tier } from '@/lib/mock-data';

// This screen replaces what used to be a Tinder-style swipe deck over an open
// candidate pool. Under the real architecture, matching is per-ROLE (a company
// posts a role, the matching engine scores candidates against it, producing a
// shortlist) — so the company's entry point is "my roles", not "swipe
// everyone". Tapping a role goes to its computed shortlist (shortlist.tsx).
// Role-creation UI doesn't exist yet — this screen only lists roles that
// already exist (today, that's the migrated Strivo roles for companies that
// came from that import; a fresh signup sees an empty list).

interface RoleListItem {
  id: string;
  title: string;
  tier: Tier;
  status: string;
  shortlistCount: number;
}

export default function CompanyRolesScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const { companyId } = useAuth();

  const [roles, setRoles] = useState<RoleListItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) {
      setRoles([]);
      return;
    }

    const { data: roleRows, error: roleErr } = await supabase
      .from('roles')
      .select('id, title, tier, status')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (roleErr) {
      console.warn('Failed to load roles:', roleErr.message);
      setRoles([]);
      return;
    }

    const roleIds = (roleRows ?? []).map((r) => r.id);
    const countByRole = new Map<string, number>();
    if (roleIds.length > 0) {
      const { data: scoreRows, error: scoreErr } = await supabase
        .from('match_scores')
        .select('role_id')
        .in('role_id', roleIds)
        .eq('is_alternate', false)
        .eq('excluded', false)
        .is('company_action', null);
      if (scoreErr) {
        console.warn('Failed to load shortlist counts:', scoreErr.message);
      } else {
        for (const row of scoreRows ?? []) {
          countByRole.set(row.role_id, (countByRole.get(row.role_id) ?? 0) + 1);
        }
      }
    }

    setRoles(
      (roleRows ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        tier: r.tier as Tier,
        status: r.status,
        shortlistCount: countByRole.get(r.id) ?? 0,
      })),
    );
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <View style={st.header}>
        <Text style={st.headerTitle}>My Roles</Text>
        <Text style={st.headerSub}>Tap a role to review its shortlist</Text>
      </View>

      {roles === null ? (
        <View style={st.centerFill}>
          <ActivityIndicator color={T.accent} />
        </View>
      ) : roles.length === 0 ? (
        <ScrollView
          contentContainerStyle={st.emptyScroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} colors={[T.accent]} />}
        >
          <View style={st.emptyIcon}>
            <Ionicons name="briefcase-outline" size={32} color={T.textMuted} />
          </View>
          <Text style={st.emptyTitle}>No roles yet</Text>
          <Text style={st.emptySub}>Roles you post will show up here with their computed shortlist.</Text>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={st.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} colors={[T.accent]} />}
        >
          {roles.map((role) => {
            const cfg = TIER_CONFIG[role.tier];
            return (
              <Pressable
                key={role.id}
                style={st.card}
                onPress={() => router.push({ pathname: '/(company)/shortlist', params: { roleId: role.id } })}
              >
                <View style={st.cardTop}>
                  <View style={[st.tierPill, { backgroundColor: cfg.accent + '14' }]}>
                    <Ionicons name={cfg.icon as keyof typeof Ionicons.glyphMap} size={12} color={cfg.accent} />
                    <Text style={[st.tierText, { color: cfg.accent }]}>{cfg.label.toUpperCase()}</Text>
                  </View>
                  <Text style={st.statusText}>{role.status}</Text>
                </View>
                <Text style={st.roleTitle}>{role.title}</Text>
                <View style={st.cardBottom}>
                  <Ionicons name="people-outline" size={14} color={T.textSecondary} />
                  <Text style={st.shortlistText}>
                    {role.shortlistCount} {role.shortlistCount === 1 ? 'candidate' : 'candidates'} shortlisted
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={T.textMuted} style={{ marginLeft: 'auto' }} />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.3 },
  headerSub: { fontSize: 14, color: T.textSecondary, marginTop: 4 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  emptyScroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: T.surface,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: T.textPrimary, marginBottom: 6 },
  emptySub: { fontSize: 14, color: T.textSecondary, textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: T.card, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: T.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  tierPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tierText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  statusText: { fontSize: 12, color: T.textMuted, fontWeight: '600', textTransform: 'capitalize' },
  roleTitle: { fontSize: 17, fontWeight: '700', color: T.textPrimary, marginBottom: 12 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shortlistText: { fontSize: 13, color: T.textSecondary, fontWeight: '500' },
});
