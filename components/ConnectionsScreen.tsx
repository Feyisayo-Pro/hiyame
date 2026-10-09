import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SkeletonCard } from '@/components/Skeleton';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppIcon from '@/components/AppIcon';
import { Text } from '@/components/Themed';
import { useTheme, ThemePalette, ELEVATION, DISPLAY_FONT_FAMILY, RADIUS } from '@/lib/theme';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { TIER_CONFIG, Tier } from '@/lib/mock-data';
import { getIntroductionContact, IntroductionContact } from '@/lib/introductionContact';
import ScreenFrame from '@/components/ScreenFrame';
import PageHead from '@/components/PageHead';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import AnimatedPressable from '@/components/AnimatedPressable';
import { openInNewTab } from '@/lib/openLink';

interface ShortlistedRow {
  roleId: string;
  roleTitle: string;
  candidateName: string;
  score: number;
  summary: string;
}

// The "Connections" tab — every accepted introduction for the signed-in user,
// across all roles, with the contact details revealed on acceptance
// (architecture doc §7.4). Replaces the old mock chat screen: the doc's
// communication model is direct email after an introduction, not in-app
// messaging.

interface Connection {
  introductionId: string;
  roleId: string;
  roleTitle: string;
  roleTier: Tier;
  respondedAt: string | null;
  contact: IntroductionContact | null;
  summary: string;
  candidateId: string | null;
  videoIntroUrl: string | null;
}

// One-line descriptor under a candidate's name — experience level + their
// top couple of skill tags, the closest real signal to "why this person" the
// data actually has (there's no free-text blurb anywhere in the schema).
function candidateSummary(experienceLevel: string | null, skillTags: string[] | null): string {
  const level = experienceLevel ? experienceLevel[0].toUpperCase() + experienceLevel.slice(1) : null;
  const skills = (skillTags ?? []).slice(0, 3).join(', ');
  if (level && skills) return `${level} · ${skills}`;
  return level ?? skills ?? 'No profile details yet';
}

// Groups a flat list by role so the screen reads as "Role A: these people /
// Role B: those people" instead of one undifferentiated pile spanning every
// job at once — preserves each group's first-seen order (both source lists
// already arrive pre-sorted: shortlisted by score, connections by response
// time), so within a role nothing gets silently re-ordered.
function groupByRole<T extends { roleId: string; roleTitle: string }>(rows: T[]): { roleId: string; roleTitle: string; items: T[] }[] {
  const groups: { roleId: string; roleTitle: string; items: T[] }[] = [];
  const index = new Map<string, number>();
  for (const row of rows) {
    let i = index.get(row.roleId);
    if (i === undefined) {
      i = groups.length;
      index.set(row.roleId, i);
      groups.push({ roleId: row.roleId, roleTitle: row.roleTitle, items: [] });
    }
    groups[i].items.push(row);
  }
  return groups;
}

export default function ConnectionsScreen({ persona }: { persona: 'candidate' | 'company' }) {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const { candidateId, companyId } = useAuth();

  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Company-only: match_scores rows for the company's own roles that haven't
  // been introduced yet — the same "shortlist" data app/(company)/shortlist.tsx
  // shows per-role, aggregated here across every role so Connections is a
  // real overview of both accepted connections AND who's still shortlisted,
  // not just the former.
  const [activeTab, setActiveTab] = useState<'accepted' | 'shortlisted'>('accepted');
  const [shortlisted, setShortlisted] = useState<ShortlistedRow[] | null>(null);

  const loadShortlisted = useCallback(async () => {
    if (persona !== 'company' || !companyId) return;
    // Same "still on the shortlist" definition app/(company)/shortlist.tsx
    // itself uses: not skipped, and not already introduced — reused here
    // rather than invented fresh, so the two screens never disagree.
    const [scoresRes, introsRes] = await Promise.all([
      supabase
        .from('match_scores')
        .select('candidate_id, score, company_action, candidates(full_name, experience_level, skill_tags), roles!inner(id, title, company_id)')
        .eq('roles.company_id', companyId)
        .order('score', { ascending: false }),
      supabase.from('introductions').select('role_id, candidate_id, roles!inner(company_id)').eq('roles.company_id', companyId),
    ]);
    if (scoresRes.error) {
      console.warn('Failed to load shortlisted candidates:', scoresRes.error.message);
      setShortlisted([]);
      return;
    }
    const introducedKeys = new Set((introsRes.data ?? []).map((i: any) => `${i.role_id}:${i.candidate_id}`));
    setShortlisted(
      (scoresRes.data ?? [])
        .filter((row: any) => row.company_action !== 'skipped' && !introducedKeys.has(`${row.roles.id}:${row.candidate_id}`))
        .map((row: any) => ({
          roleId: row.roles.id,
          roleTitle: row.roles.title,
          candidateName: row.candidates?.full_name ?? 'Candidate',
          score: row.score,
          summary: candidateSummary(row.candidates?.experience_level ?? null, row.candidates?.skill_tags ?? null),
        }))
    );
  }, [persona, companyId]);

  const load = useCallback(async () => {
    const scopeId = persona === 'candidate' ? candidateId : companyId;
    if (!scopeId) {
      setConnections([]);
      return;
    }

    // Company-side RLS already scopes introductions to the caller's company;
    // candidate-side needs the explicit candidate_id filter. candidates(...)
    // is only meaningful to a company viewer (RLS hides it from candidates
    // reading someone else's row anyway); companies(...) is the candidate
    // viewer's equivalent one-line signal, the same industry/size band shown
    // pre-acceptance on the Introductions screen.
    let query = supabase
      .from('introductions')
      .select('id, role_id, candidate_id, responded_at, roles(title, tier, companies(industry, size_range)), candidates(experience_level, skill_tags, video_intro_url)')
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
      const summary = persona === 'company'
        ? candidateSummary(row.candidates?.experience_level ?? null, row.candidates?.skill_tags ?? null)
        : [row.roles?.companies?.industry, row.roles?.companies?.size_range].filter(Boolean).join(' · ') || 'Company details unavailable';
      rows.push({
        introductionId: row.id,
        roleId: row.role_id,
        roleTitle: row.roles?.title ?? 'Role',
        roleTier: (row.roles?.tier as Tier) ?? 'corporate',
        respondedAt: row.responded_at,
        contact,
        summary,
        candidateId: row.candidate_id ?? null,
        videoIntroUrl: row.candidates?.video_intro_url ?? null,
      });
    }
    setConnections(rows);
  }, [persona, candidateId, companyId]);

  useEffect(() => {
    load();
    loadShortlisted();
  }, [load, loadShortlisted]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([load(), loadShortlisted()]);
    setRefreshing(false);
  }, [load, loadShortlisted]);

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <PageHead title="Connections" />
      <ScreenFrame>
      <View style={st.header}>
        <Text style={st.headerTitle}>Connections</Text>
        <Text style={st.headerSub}>
          {persona === 'candidate'
            ? 'Companies you’ve been introduced to'
            : activeTab === 'accepted'
            ? 'Candidates who accepted your introduction'
            : 'Candidates matched to your roles, not yet introduced'}
        </Text>
      </View>

      {persona === 'company' && (
        <View style={st.tabRow}>
          <AnimatedPressable style={[st.tab, activeTab === 'accepted' && st.tabActive]} onPress={() => setActiveTab('accepted')}>
            <Text style={[st.tabText, activeTab === 'accepted' && st.tabTextActive]}>Accepted ({connections?.length ?? 0})</Text>
          </AnimatedPressable>
          <AnimatedPressable style={[st.tab, activeTab === 'shortlisted' && st.tabActive]} onPress={() => setActiveTab('shortlisted')}>
            <Text style={[st.tabText, activeTab === 'shortlisted' && st.tabTextActive]}>Shortlisted ({shortlisted?.length ?? 0})</Text>
          </AnimatedPressable>
        </View>
      )}

      {activeTab === 'shortlisted' && persona === 'company' ? (
        shortlisted === null ? (
          <View style={st.scroll}>
            <SkeletonCard style={{ marginBottom: 18, minHeight: 80 }} />
            <SkeletonCard style={{ minHeight: 80 }} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={st.scroll}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} colors={[T.accent]} />}
          >
            {shortlisted.length === 0 ? (
              <View style={st.emptyBlock}>
                <AppIcon name="people-outline" size={28} color={T.textMuted} />
                <Text style={st.emptyTitle}>No shortlisted candidates yet</Text>
                <Text style={st.emptySub}>Once a role finishes matching, ranked candidates show up here until you introduce or skip them.</Text>
              </View>
            ) : (
              groupByRole(shortlisted).map((group) => (
                <View key={group.roleId} style={st.roleSection}>
                  <Text style={st.roleSectionTitle}>{group.roleTitle} ({group.items.length})</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.hScroll}>
                    {group.items.map((s, i) => (
                      <SwipeFadeContainer key={`${s.roleId}-${s.candidateName}-${i}`} axis="x" offset={14} duration={240} delay={Math.min(i, 8) * 40} style={st.hCard}>
                        <AnimatedPressable style={st.block} onPress={() => router.push({ pathname: '/(company)/shortlist', params: { roleId: s.roleId } })}>
                          <View style={st.blockHead}>
                            <Text style={st.roleTitle} numberOfLines={1}>{s.candidateName}</Text>
                            <View style={[st.tierPill, { backgroundColor: T.accent + '14' }]}>
                              <Text style={[st.tierText, { color: T.accent }]}>{Math.round(s.score)}% MATCH</Text>
                            </View>
                          </View>
                          <Text style={st.pendingText} numberOfLines={2}>{s.summary}</Text>
                        </AnimatedPressable>
                      </SwipeFadeContainer>
                    ))}
                  </ScrollView>
                </View>
              ))
            )}
          </ScrollView>
        )
      ) : connections === null ? (
        <View style={st.scroll}>
          <SkeletonCard style={{ marginBottom: 18, minHeight: 140 }} />
          <SkeletonCard style={{ marginBottom: 18, minHeight: 140 }} />
          <SkeletonCard style={{ minHeight: 140 }} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={st.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} colors={[T.accent]} />}
        >
          {connections.length === 0 ? (
            <View style={st.emptyBlock}>
              <AppIcon name="people-outline" size={28} color={T.textMuted} />
              <Text style={st.emptyTitle}>No connections yet</Text>
              <Text style={st.emptySub}>
                {persona === 'candidate'
                  ? 'When you accept an introduction, it shows up here while you wait on an interview.'
                  : 'When a candidate accepts your introduction, they show up here so you can set an interview.'}
              </Text>
            </View>
          ) : (
            groupByRole(connections).map((group) => (
              <View key={group.roleId} style={st.roleSection}>
                <Text style={st.roleSectionTitle}>{group.roleTitle} ({group.items.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.hScroll}>
                  {group.items.map((c, i) => {
                    const cfg = TIER_CONFIG[c.roleTier];
                    return (
                      <SwipeFadeContainer key={c.introductionId} axis="x" offset={14} duration={240} delay={Math.min(i, 8) * 40} style={st.hCard}>
                        <View style={st.block}>
                          <View style={st.blockHead}>
                            <Text style={st.roleTitle} numberOfLines={1}>
                              {persona === 'company' ? (c.contact?.candidateName ?? 'Candidate') : (c.contact?.companyName ?? c.roleTitle)}
                            </Text>
                            <View style={[st.tierPill, { backgroundColor: cfg.accent + '14' }]}>
                              <Text style={[st.tierText, { color: cfg.accent }]}>{cfg.label.toUpperCase()}</Text>
                            </View>
                          </View>
                          <Text style={st.pendingText} numberOfLines={2}>{c.summary}</Text>
                          {persona === 'candidate' ? (
                            <View style={st.statusRow}>
                              <AppIcon name="time-outline" size={14} color={T.amber} />
                              <Text style={st.statusText}>Awaiting interview</Text>
                            </View>
                          ) : (
                            <View style={st.connActions}>
                              <AnimatedPressable
                                style={st.connActionBtn}
                                onPress={() => router.push({ pathname: '/(company)/interviews', params: { candidateId: c.candidateId ?? '', roleId: c.roleId } })}
                                accessibilityRole="button"
                                accessibilityLabel={`Set an interview with ${c.contact?.candidateName ?? 'this candidate'}`}
                              >
                                <AppIcon name="calendar-outline" size={14} color={T.textOnAccent} />
                                <Text style={st.connActionTextPrimary}>Set Interview Now</Text>
                              </AnimatedPressable>
                              {c.videoIntroUrl ? (
                                <AnimatedPressable
                                  style={[st.connActionBtn, st.connActionBtnSecondary]}
                                  onPress={() => openInNewTab(c.videoIntroUrl!)}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Watch ${c.contact?.candidateName ?? 'candidate'}'s introduction video`}
                                >
                                  <AppIcon name="videocam-outline" size={14} color={T.textPrimary} />
                                  <Text style={st.connActionTextSecondary}>Watch Introduction Video</Text>
                                </AnimatedPressable>
                              ) : (
                                <Text style={st.noVideoText}>No introduction video uploaded yet.</Text>
                              )}
                            </View>
                          )}
                        </View>
                      </SwipeFadeContainer>
                    );
                  })}
                </ScrollView>
              </View>
            ))
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
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 16 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  tabActive: { backgroundColor: T.accentBg, borderColor: T.accent },
  tabText: { fontSize: 13, fontWeight: '700', color: T.textSecondary },
  tabTextActive: { color: T.accentDim },
  headerTitle: { fontSize: 24, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.3, fontFamily: DISPLAY_FONT_FAMILY },
  headerSub: { fontSize: 14, color: T.textSecondary, marginTop: 4 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  emptyBlock: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: T.textPrimary, marginTop: 12, marginBottom: 6 },
  emptySub: { fontSize: 13, color: T.textSecondary, textAlign: 'center', lineHeight: 19 },
  roleSection: { marginBottom: 22 },
  roleSectionTitle: { fontSize: 13, fontWeight: '800', color: T.textMuted, letterSpacing: 0.3, marginBottom: 10 },
  hScroll: { gap: 12, paddingRight: 20, paddingBottom: 2 },
  hCard: { width: 260 },
  block: {
    backgroundColor: T.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: T.border, height: '100%', ...ELEVATION.card,
  },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  roleTitle: { fontSize: 15, fontWeight: '700', color: T.textPrimary, flexShrink: 1 },
  tierPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7 },
  tierText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
  pendingText: { fontSize: 13, color: T.textSecondary },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.amberBg, borderRadius: RADIUS.chip, paddingHorizontal: 10, paddingVertical: 6, marginTop: 10, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontWeight: '700', color: T.amber },
  connActions: { gap: 8, marginTop: 10 },
  connActionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 36, borderRadius: RADIUS.control, backgroundColor: T.accentSolid,
  },
  connActionTextPrimary: { fontSize: 12.5, fontWeight: '700', color: T.textOnAccent },
  connActionBtnSecondary: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  connActionTextSecondary: { fontSize: 12.5, fontWeight: '700', color: T.textPrimary },
  noVideoText: { fontSize: 11.5, color: T.textMuted, textAlign: 'center' },
});
