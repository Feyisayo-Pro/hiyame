import { useCallback, useEffect, useState, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { TIER_CONFIG, Tier } from '@/lib/mock-data';
import { notify } from '@/lib/notify';

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
  fullName: string;
  skillTags: string[];
  location: string | null;
  experienceLevel: string | null;
  rateMin: number | null;
}

interface IntroducedCard {
  candidateId: string;
  fullName: string;
  status: string;
}

export default function ShortlistScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const { roleId } = useLocalSearchParams<{ roleId: string }>();

  const [roleTitle, setRoleTitle] = useState<string | null>(null);
  const [roleTier, setRoleTier] = useState<Tier | null>(null);
  const [cards, setCards] = useState<CandidateCard[] | null>(null);
  const [introduced, setIntroduced] = useState<IntroducedCard[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!roleId) return;

    const { data: role } = await supabase.from('roles').select('title, tier').eq('id', roleId).maybeSingle();
    setRoleTitle(role?.title ?? null);
    setRoleTier((role?.tier as Tier) ?? null);

    const { data: intros } = await supabase
      .from('introductions')
      .select('candidate_id, status, candidates(full_name)')
      .eq('role_id', roleId);
    const introducedIds = new Set((intros ?? []).map((i) => i.candidate_id));
    setIntroduced(
      (intros ?? []).map((i: any) => ({
        candidateId: i.candidate_id,
        fullName: i.candidates?.full_name ?? 'Candidate',
        status: i.status,
      })),
    );

    const { data: scores, error } = await supabase
      .from('match_scores')
      .select('id, candidate_id, score, is_alternate, company_action, candidates(full_name, skill_tags, location, experience_level, rate_min)')
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
        fullName: s.candidates?.full_name ?? 'Candidate',
        skillTags: s.candidates?.skill_tags ?? [],
        location: s.candidates?.location ?? null,
        experienceLevel: s.candidates?.experience_level ?? null,
        rateMin: s.candidates?.rate_min ?? null,
      }));
    setCards(rows);
  }, [roleId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAccept = async (card: CandidateCard) => {
    if (!roleId || !roleTier) return;
    setBusyId(card.matchScoreId);
    const { error } = await supabase.from('introductions').insert({
      role_id: roleId,
      candidate_id: card.candidateId,
      response_window_hours: RESPONSE_WINDOW_HOURS[roleTier],
    });
    setBusyId(null);
    if (error) {
      notify('Could not send introduction', error.message);
      return;
    }
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

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <View style={st.header}>
        <Pressable style={st.backButton} onPress={() => router.back()}>
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
      </View>

      {cards === null ? (
        <View style={st.centerFill}>
          <ActivityIndicator color={T.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={st.scroll}>
          {active.length === 0 && alternates.length === 0 && (
            <View style={st.emptyBlock}>
              <Ionicons name="search" size={28} color={T.textMuted} />
              <Text style={st.emptyTitle}>No candidates yet</Text>
              <Text style={st.emptySub}>
                Either no candidates match this role yet, or the matching engine hasn't been run for it. Check back later.
              </Text>
            </View>
          )}

          {active.length > 0 && (
            <>
              <Text style={st.sectionLabel}>SHORTLIST</Text>
              {active.map((c) => (
                <CandidateCardView key={c.matchScoreId} T={T} st={st} card={c} busy={busyId === c.matchScoreId}
                  onAccept={() => handleAccept(c)} onSkip={() => handleAction(c, 'skipped')} onSave={() => handleAction(c, 'saved')} />
              ))}
            </>
          )}

          {alternates.length > 0 && (
            <>
              <Text style={st.sectionLabel}>ALTERNATES</Text>
              {alternates.map((c) => (
                <CandidateCardView key={c.matchScoreId} T={T} st={st} card={c} busy={busyId === c.matchScoreId}
                  onAccept={() => handleAccept(c)} onSkip={() => handleAction(c, 'skipped')} onSave={() => handleAction(c, 'saved')} />
              ))}
            </>
          )}

          {introduced.length > 0 && (
            <>
              <Text style={st.sectionLabel}>INTRODUCED</Text>
              {introduced.map((i) => (
                <View key={i.candidateId} style={st.introducedRow}>
                  <Text style={st.introducedName}>{i.fullName}</Text>
                  <Text style={st.introducedStatus}>{i.status}</Text>
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
  return (
    <View style={st.card}>
      <View style={st.cardTop}>
        <Text style={st.candidateName}>{card.fullName}</Text>
        <View style={st.scoreRing}>
          <Text style={st.scoreText}>{card.score}%</Text>
        </View>
      </View>
      {card.location && (
        <View style={st.metaRow}>
          <Ionicons name="location-outline" size={12} color={T.textSecondary} />
          <Text style={st.metaText}>{card.location}</Text>
        </View>
      )}
      <View style={st.skillsRow}>
        {card.skillTags.slice(0, 4).map((s) => (
          <View key={s} style={st.skillChip}>
            <Text style={st.skillText}>{s}</Text>
          </View>
        ))}
      </View>
      <View style={st.actionsRow}>
        <Pressable style={[st.actionBtn, st.skipBtn]} onPress={onSkip} disabled={busy}>
          <Ionicons name="close" size={18} color={T.danger} />
        </Pressable>
        <Pressable style={[st.actionBtn, st.saveBtn]} onPress={onSave} disabled={busy}>
          <Ionicons name="bookmark-outline" size={16} color={T.accent} />
        </Pressable>
        <Pressable style={[st.actionBtn, st.acceptBtn]} onPress={onAccept} disabled={busy}>
          <Ionicons name="checkmark" size={18} color={T.emerald} />
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
  headerTitle: { fontSize: 20, fontWeight: '800', color: T.textPrimary, marginBottom: 6 },
  tierPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tierText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: T.textMuted, letterSpacing: 0.5, marginTop: 16, marginBottom: 10 },
  emptyBlock: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: T.textPrimary, marginTop: 12, marginBottom: 6 },
  emptySub: { fontSize: 13, color: T.textSecondary, textAlign: 'center', lineHeight: 19 },
  card: { backgroundColor: T.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: T.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  candidateName: { fontSize: 16, fontWeight: '700', color: T.textPrimary, flex: 1 },
  scoreRing: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: T.emerald, alignItems: 'center', justifyContent: 'center' },
  scoreText: { fontSize: 11, fontWeight: '800', color: T.emerald },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  metaText: { fontSize: 12, color: T.textSecondary },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  skillChip: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  skillText: { fontSize: 11, color: T.textSecondary, fontWeight: '500' },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 12, borderWidth: 1.5 },
  skipBtn: { width: 44, backgroundColor: T.dangerBg, borderColor: T.danger },
  saveBtn: { width: 44, backgroundColor: T.accentBg, borderColor: T.accent },
  acceptBtn: { flex: 1, backgroundColor: T.emeraldBg, borderColor: T.emerald },
  acceptText: { fontSize: 14, fontWeight: '700', color: T.emerald },
  introducedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.border },
  introducedName: { fontSize: 14, fontWeight: '600', color: T.textPrimary },
  introducedStatus: { fontSize: 12, color: T.textMuted, fontWeight: '600', textTransform: 'capitalize' },
});
