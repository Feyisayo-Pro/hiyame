import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Themed';
import { useTheme, ThemePalette } from '@/lib/theme';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { TIER_CONFIG, Tier } from '@/lib/mock-data';
import { getIntroductionContact, IntroductionContact } from '@/lib/introductionContact';
import ContactReveal from '@/components/ContactReveal';
import ScreenFrame from '@/components/ScreenFrame';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';

// The "Connections" tab — every accepted introduction for the signed-in user,
// across all roles, with the contact details revealed on acceptance
// (architecture doc §7.4). Replaces the old mock chat screen: the doc's
// communication model is direct email after an introduction, not in-app
// messaging.

interface Connection {
  introductionId: string;
  roleTitle: string;
  roleTier: Tier;
  respondedAt: string | null;
  contact: IntroductionContact | null;
}

export default function ConnectionsScreen({ persona }: { persona: 'candidate' | 'company' }) {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const { candidateId, companyId } = useAuth();

  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const scopeId = persona === 'candidate' ? candidateId : companyId;
    if (!scopeId) {
      setConnections([]);
      return;
    }

    // Company-side RLS already scopes introductions to the caller's company;
    // candidate-side needs the explicit candidate_id filter.
    let query = supabase
      .from('introductions')
      .select('id, role_id, responded_at, roles(title, tier)')
      .eq('status', 'accepted')
      .order('responded_at', { ascending: false });
    if (persona === 'candidate') query = query.eq('candidate_id', candidateId);

    const { data, error } = await query;
    if (error) {
      console.warn('Failed to load connections:', error.message);
      setConnections([]);
      return;
    }

    const rows: Connection[] = [];
    for (const row of (data ?? []) as any[]) {
      const contact = await getIntroductionContact(row.id);
      rows.push({
        introductionId: row.id,
        roleTitle: row.roles?.title ?? 'Role',
        roleTier: (row.roles?.tier as Tier) ?? 'corporate',
        respondedAt: row.responded_at,
        contact,
      });
    }
    setConnections(rows);
  }, [persona, candidateId, companyId]);

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
      <ScreenFrame>
      <View style={st.header}>
        <Text style={st.headerTitle}>Connections</Text>
        <Text style={st.headerSub}>
          {persona === 'candidate'
            ? 'Companies you’ve been introduced to'
            : 'Candidates who accepted your introduction'}
        </Text>
      </View>

      {connections === null ? (
        <View style={st.centerFill}>
          <ActivityIndicator color={T.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={st.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} colors={[T.accent]} />}
        >
          {connections.length === 0 ? (
            <View style={st.emptyBlock}>
              <Ionicons name="people-outline" size={28} color={T.textMuted} />
              <Text style={st.emptyTitle}>No connections yet</Text>
              <Text style={st.emptySub}>
                {persona === 'candidate'
                  ? 'When you accept an introduction, the company’s contact details show up here.'
                  : 'When a candidate accepts your introduction, their contact details show up here.'}
              </Text>
            </View>
          ) : (
            connections.map((c, i) => {
              const cfg = TIER_CONFIG[c.roleTier];
              return (
                <SwipeFadeContainer key={c.introductionId} axis="y" offset={14} duration={240} delay={Math.min(i, 8) * 40}>
                  <View style={st.block}>
                    <View style={st.blockHead}>
                      <Text style={st.roleTitle} numberOfLines={1}>{c.roleTitle}</Text>
                      <View style={[st.tierPill, { backgroundColor: cfg.accent + '14' }]}>
                        <Text style={[st.tierText, { color: cfg.accent }]}>{cfg.label.toUpperCase()}</Text>
                      </View>
                    </View>
                    {c.contact ? (
                      <ContactReveal contact={c.contact} viewer={persona} />
                    ) : (
                      <Text style={st.pendingText}>Contact details unavailable.</Text>
                    )}
                  </View>
                </SwipeFadeContainer>
              );
            })
          )}
        </ScrollView>
      )}
      </ScreenFrame>
    </SafeAreaView>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.3 },
  headerSub: { fontSize: 14, color: T.textSecondary, marginTop: 4 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  emptyBlock: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: T.textPrimary, marginTop: 12, marginBottom: 6 },
  emptySub: { fontSize: 13, color: T.textSecondary, textAlign: 'center', lineHeight: 19 },
  block: { marginBottom: 18 },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  roleTitle: { fontSize: 15, fontWeight: '700', color: T.textPrimary, flexShrink: 1 },
  tierPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7 },
  tierText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
  pendingText: { fontSize: 13, color: T.textSecondary },
});
