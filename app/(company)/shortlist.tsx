import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette, RADIUS, ELEVATION, ICON } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { TIER_CONFIG, Tier } from '@/lib/mock-data';
import { notify } from '@/lib/notify';
import { requestMatching } from '@/lib/requestMatching';
import { getIntroductionContact, IntroductionContact } from '@/lib/introductionContact';
import ContactReveal from '@/components/ContactReveal';
import { notifyIntroduction } from '@/lib/requestNotify';
import { useIsDesktopWeb } from '@/components/TopNav';

// Response-window hours per tier (architecture doc §7.4).
const RESPONSE_WINDOW_HOURS: Record<Tier, number> = {
  corporate: 72,
  short_term: 48,
  gig: 24,
};

interface CandidateCard {
  matchScoreId: string;
  candidateId: string;
  score: number;
  isAlternate: boolean;
  verified: boolean | null;
  fullName: string;
  photoUrl: string | null;
  skillTags: string[];
  location: string | null;
  experienceLevel: string | null;
  rateMin: number | null;
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

interface IntroducedCard {
  introductionId: string;
  candidateId: string;
  fullName: string;
  status: string;
  contact: IntroductionContact | null;
}

type MatchingState = 'idle' | 'running' | 'unavailable';

export default function ShortlistScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const isDesktop = useIsDesktopWeb();
  const { roleId } = useLocalSearchParams<{ roleId: string }>();

  const [roleTitle, setRoleTitle] = useState<string | null>(null);
  const [roleTier, setRoleTier] = useState<Tier | null>(null);
  const [matchingRanAt, setMatchingRanAt] = useState<string | null>(null);
  const [cards, setCards] = useState<CandidateCard[] | null>(null);
  const [introduced, setIntroduced] = useState<IntroducedCard[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [matchingState, setMatchingState] = useState<MatchingState>('idle');
  const autoTriggeredFor = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!roleId) return;

    const { data: role } = await supabase
      .from('roles')
      .select('title, tier, matching_ran_at')
      .eq('id', roleId)
      .maybeSingle();
    setRoleTitle(role?.title ?? null);
    setRoleTier((role?.tier as Tier) ?? null);
    setMatchingRanAt(role?.matching_ran_at ?? null);

    const { data: intros } = await supabase
      .from('introductions')
      .select('id, candidate_id, status, candidates(full_name)')
      .eq('role_id', roleId);
    const introducedIds = new Set((intros ?? []).map((i) => i.candidate_id));
    const introducedCards: IntroducedCard[] = [];
    for (const i of (intros ?? []) as any[]) {
      const contact = i.status === 'accepted' ? await getIntroductionContact(i.id) : null;
      introducedCards.push({
        introductionId: i.id,
        candidateId: i.candidate_id,
        fullName: contact?.candidateName ?? i.candidates?.full_name ?? 'Candidate',
        status: i.status,
        contact,
      });
    }
    setIntroduced(introducedCards);

    const { data: scores, error } = await supabase
      .from('match_scores')
      .select('id, candidate_id, score, is_alternate, company_action, score_breakdown, candidates(full_name, photo_url, skill_tags, location, experience_level, rate_min)')
      .eq('role_id', roleId)
      .eq('excluded', false)
      .order('score', { ascending: false });
    if (error) {
      console.warn('Failed to load shortlist:', error.message);
      setCards([]);
      return;
    }

    const rows = (scores ?? [])
      .filter((s: any) => s.company_action !== 'skipped' && !introducedIds.has(s.candidate_id))
      .map((s: any) => ({
        matchScoreId: s.id,
        candidateId: s.candidate_id,
        score: s.score,
        isAlternate: s.is_alternate,
        verified: typeof s.score_breakdown?.verified === 'boolean' ? s.score_breakdown.verified : null,
        fullName: s.candidates?.full_name ?? 'Candidate',
        photoUrl: s.candidates?.photo_url ?? null,
        skillTags: s.candidates?.skill_tags ?? [],
        location: s.candidates?.location ?? null,
        experienceLevel: s.candidates?.experience_level ?? null,
        rateMin: s.candidates?.rate_min ?? null,
      }));
    setCards(rows);
  }, [roleId]);

  const runMatching = useCallback(async () => {
    if (!roleId) return;
    setMatchingState('running');
    const outcome = await requestMatching(roleId);
    if (outcome.ok) {
      setMatchingState('idle');
      await load();
    } else if (outcome.reason === 'unavailable') {
      setMatchingState('unavailable');
    } else {
      setMatchingState('idle');
      notify('Matching didn’t run', outcome.message);
    }
  }, [roleId, load]);

  useEffect(() => {
    load();
  }, [load]);

  // First time a never-matched role's shortlist is opened, kick off the run.
  useEffect(() => {
    if (!roleId || cards === null) return;
    if (matchingRanAt !== null) return;
    if (autoTriggeredFor.current === roleId) return;
    autoTriggeredFor.current = roleId;
    runMatching();
  }, [roleId, cards, matchingRanAt, runMatching]);

  const handleAccept = async (card: CandidateCard) => {
    if (!roleId || !roleTier) return;
    setBusyId(card.matchScoreId);
    const { data: created, error } = await supabase
      .from('introductions')
      .insert({
        role_id: roleId,
        candidate_id: card.candidateId,
        response_window_hours: RESPONSE_WINDOW_HOURS[roleTier],
      })
      .select('id')
      .single();
    setBusyId(null);
    if (error) {
      notify('Could not send introduction', error.message);
      return;
    }
    if (created?.id) void notifyIntroduction(created.id, 'sent');
    await load();
  };

  const handleAction = async (card: CandidateCard, action: 'skipped' | 'saved') => {
    setBusyId(card.matchScoreId);
    const { error } = await supabase
      .from('match_scores')
      .update({ company_action: action, company_action_at: new Date().toISOString() })
      .eq('id', card.matchScoreId);
    setBusyId(null);
    if (error) {
      notify('Something went wrong', error.message);
      return;
    }
    await load();
  };

  const cfg = roleTier ? TIER_CONFIG[roleTier] : null;
  const active = (cards ?? []).filter((c) => !c.isAlternate);
  const alternates = (cards ?? []).filter((c) => c.isAlternate);
  const hasAnyCards = active.length > 0 || alternates.length > 0;
  const running = matchingState === 'running';

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <View style={st.header}>
        <Pressable style={st.backButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={20} color={T.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={st.headerTitle} numberOfLines={1}>{roleTitle ?? 'Shortlist'}</Text>
          {cfg && (
            <View style={[st.tierPill, { backgroundColor: cfg.accent + '14', alignSelf: 'flex-start' }]}>
              <Text style={[st.tierText, { color: cfg.accent }]}>{cfg.label.toUpperCase()}</Text>
            </View>
          )}
        </View>
        <Pressable
          style={st.rerunButton}
          onPress={runMatching}
          disabled={running}
          accessibilityRole="button"
          accessibilityLabel="Re-run matching"
        >
          {running ? (
            <ActivityIndicator size="small" color={T.accent} />
          ) : (
            <Ionicons name="refresh" size={18} color={T.accent} />
          )}
        </Pressable>
      </View>

      {cards === null ? (
        <View style={st.centerFill}>
          <ActivityIndicator color={T.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={st.scroll}>
          {!hasAnyCards && running && (
            <View style={st.emptyBlock}>
              <ActivityIndicator color={T.accent} />
              <Text style={st.emptyTitle}>Finding candidates…</Text>
              <Text style={st.emptySub}>Scoring the candidate pool against this role. This usually takes a few seconds.</Text>
            </View>
          )}

          {!hasAnyCards && !running && matchingState === 'unavailable' && (
            <View style={st.emptyBlock}>
              <Ionicons name="cloud-offline-outline" size={28} color={T.textMuted} />
              <Text style={st.emptyTitle}>Matching runs on the live site</Text>
              <Text style={st.emptySub}>The matching service isn’t available in local preview. Open this role on the deployed site to build its shortlist.</Text>
            </View>
          )}

          {!hasAnyCards && !running && matchingState !== 'unavailable' && matchingRanAt !== null && (
            <View style={st.emptyBlock}>
              <Ionicons name="search" size={28} color={T.textMuted} />
              <Text style={st.emptyTitle}>No candidates matched yet</Text>
              <Text style={st.emptySub}>No one in the pool cleared the bar for this role. Widening the skills or rate range, then re-running, may surface more.</Text>
              <Pressable style={st.rerunPill} onPress={runMatching}>
                <Ionicons name="refresh" size={15} color={T.textOnAccent} />
                <Text style={st.rerunPillText}>Re-run matching</Text>
              </Pressable>
            </View>
          )}

          {active.length > 0 && (
            <>
              <Text style={st.sectionLabel}>SHORTLIST</Text>
              <View style={st.grid}>
                {active.map((c) => (
                  <View key={c.matchScoreId} style={[st.gridItem, isDesktop && st.gridItemHalf]}>
                    <CandidateCardView T={T} st={st} card={c} busy={busyId === c.matchScoreId}
                      onAccept={() => handleAccept(c)} onSkip={() => handleAction(c, 'skipped')} onSave={() => handleAction(c, 'saved')} />
                  </View>
                ))}
              </View>
            </>
          )}

          {alternates.length > 0 && (
            <>
              <Text style={st.sectionLabel}>ALTERNATES</Text>
              <View style={st.grid}>
                {alternates.map((c) => (
                  <View key={c.matchScoreId} style={[st.gridItem, isDesktop && st.gridItemHalf]}>
                    <CandidateCardView T={T} st={st} card={c} busy={busyId === c.matchScoreId}
                      onAccept={() => handleAccept(c)} onSkip={() => handleAction(c, 'skipped')} onSave={() => handleAction(c, 'saved')} />
                  </View>
                ))}
              </View>
            </>
          )}

          {introduced.length > 0 && (
            <>
              <Text style={st.sectionLabel}>INTRODUCED</Text>
              {introduced.map((i) => (
                <View key={i.introductionId} style={i.contact ? st.introducedCard : st.introducedRow}>
                  {i.contact ? (
                    <ContactReveal contact={i.contact} viewer="company" />
                  ) : (
                    <>
                      <Text style={st.introducedName}>{i.fullName}</Text>
                      <Text style={st.introducedStatus}>{i.status}</Text>
                    </>
                  )}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function CandidateCardView({ T, st, card, busy, onAccept, onSkip, onSave }: {
  T: ThemePalette; st: ReturnType<typeof makeStyles>; card: CandidateCard; busy: boolean;
  onAccept: () => void; onSkip: () => void; onSave: () => void;
}) {
  const meta = [
    card.experienceLevel,
    card.location,
    card.rateMin ? `from $${card.rateMin.toLocaleString()}` : null,
  ].filter(Boolean).join('  ·  ');

  return (
    <View style={st.card}>
      <View style={st.profileRow}>
        {card.photoUrl ? (
          <Image source={{ uri: card.photoUrl }} style={st.photo} />
        ) : (
          <View style={[st.photo, st.photoFallback]}>
            <Text style={st.photoInitials}>{initials(card.fullName)}</Text>
          </View>
        )}

        <View style={st.profileBody}>
          <View style={st.nameRow}>
            <Text style={st.candidateName} numberOfLines={1}>{card.fullName}</Text>
            <View style={st.scoreRing}>
              <Text style={st.scoreText}>{card.score}%</Text>
            </View>
          </View>

          <View style={st.badgeRow}>
            {card.verified === true && (
              <View style={[st.badge, st.badgeVerified]}>
                <Ionicons name="shield-checkmark" size={ICON.xs} color={T.emerald} />
                <Text style={[st.badgeText, { color: T.emerald }]}>Verified</Text>
              </View>
            )}
            {card.verified === false && (
              <View style={[st.badge, st.badgeUnverified]}>
                <Ionicons name="shield-outline" size={ICON.xs} color={T.textMuted} />
                <Text style={[st.badgeText, { color: T.textMuted }]}>Not yet verified</Text>
              </View>
            )}
          </View>

          {meta ? <Text style={st.metaText} numberOfLines={1}>{meta}</Text> : null}
        </View>
      </View>

      <View style={st.skillsRow}>
        {card.skillTags.slice(0, 5).map((s) => (
          <View key={s} style={st.skillChip}>
            <Text style={st.skillText}>{s}</Text>
          </View>
        ))}
      </View>

      <View style={st.actionsRow}>
        <Pressable style={[st.actionBtn, st.skipBtn]} onPress={onSkip} disabled={busy} accessibilityRole="button" accessibilityLabel={`Skip ${card.fullName}`}>
          <Ionicons name="close" size={ICON.md} color={T.danger} />
        </Pressable>
        <Pressable style={[st.actionBtn, st.saveBtn]} onPress={onSave} disabled={busy} accessibilityRole="button" accessibilityLabel={`Save ${card.fullName}`}>
          <Ionicons name="bookmark-outline" size={ICON.sm} color={T.accent} />
        </Pressable>
        <Pressable style={[st.actionBtn, st.acceptBtn]} onPress={onAccept} disabled={busy} accessibilityRole="button" accessibilityLabel={`Accept ${card.fullName}`}>
          <Ionicons name="checkmark" size={ICON.md} color={T.white} />
          <Text style={st.acceptText}>Accept</Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.card, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  rerunButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.accentBg, borderWidth: 1, borderColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: T.textPrimary, marginBottom: 6 },
  tierPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tierText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: T.textMuted, letterSpacing: 0.5, marginTop: 16, marginBottom: 10 },
  emptyBlock: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, gap: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: T.textPrimary, marginTop: 12, marginBottom: 6 },
  emptySub: { fontSize: 13, color: T.textSecondary, textAlign: 'center', lineHeight: 19 },
  rerunPill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: T.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 50, marginTop: 16 },
  rerunPillText: { fontSize: 13, fontWeight: '700', color: T.textOnAccent },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  gridItem: { width: '100%' },
  gridItemHalf: { width: '48.5%' },
  card: { flex: 1, backgroundColor: T.card, borderRadius: RADIUS.card, padding: 18, marginBottom: 0, borderWidth: 1, borderColor: T.border, ...ELEVATION.card },
  profileRow: { flexDirection: 'row', gap: 14, marginBottom: 14 },
  photo: { width: 68, height: 68, borderRadius: 18, backgroundColor: T.surface },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  photoInitials: { fontSize: 22, fontWeight: '800', color: T.accent, letterSpacing: -0.5 },
  profileBody: { flex: 1, minWidth: 0, gap: 7, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  candidateName: { flex: 1, fontSize: 17, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.3 },
  scoreRing: { minWidth: 46, height: 26, borderRadius: RADIUS.chip, backgroundColor: T.emeraldBg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  scoreText: { fontSize: 12, fontWeight: '800', color: T.emerald, letterSpacing: -0.2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.chip },
  badgeVerified: { backgroundColor: T.emeraldBg },
  badgeUnverified: { backgroundColor: T.surface },
  badgeText: { fontSize: 10.5, fontWeight: '700', textTransform: 'capitalize', letterSpacing: 0.1 },
  metaText: { fontSize: 12.5, color: T.textSecondary, fontWeight: '500' },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  skillChip: { backgroundColor: T.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.chip },
  skillText: { fontSize: 11.5, color: T.textSecondary, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 'auto' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 42, borderRadius: RADIUS.control },
  skipBtn: { width: 44, backgroundColor: T.surface },
  saveBtn: { width: 44, backgroundColor: T.accentBg },
  acceptBtn: { flex: 1, backgroundColor: T.accent },
  acceptText: { fontSize: 14, fontWeight: '700', color: T.white, letterSpacing: -0.1 },
  introducedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.border },
  introducedCard: { marginBottom: 12 },
  introducedName: { fontSize: 14, fontWeight: '600', color: T.textPrimary },
  introducedStatus: { fontSize: 12, color: T.textMuted, fontWeight: '600', textTransform: 'capitalize' },
});
