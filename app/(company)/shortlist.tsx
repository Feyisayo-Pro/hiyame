import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Image, Modal, ScrollView, StyleSheet, View, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '@/lib/goBack';
import { Text } from '@/components/Themed';
import AppIcon, { AppIconName } from '@/components/AppIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette, RADIUS, ELEVATION, ICON } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { TIER_CONFIG, Tier, RESPONSE_WINDOW_HOURS } from '@/lib/mock-data';
import { initials } from '@/lib/format';
import { notify } from '@/lib/notify';
import { requestMatching } from '@/lib/requestMatching';
import { getRoleBoostSuggestions } from '@/lib/aiAssist';
import { getIntroductionContact, IntroductionContact } from '@/lib/introductionContact';
import ContactReveal from '@/components/ContactReveal';
import ScreenFrame from '@/components/ScreenFrame';
import PageHead from '@/components/PageHead';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import { DURATION } from '@/lib/motion';
import AnimatedPressable from '@/components/AnimatedPressable';
import { notifyIntroduction } from '@/lib/requestNotify';
import { useIsDesktopWeb, useIsWideDesktopWeb } from '@/components/TopNav';
import { formatNaira } from '@/lib/currency';
import { SkeletonCard } from '@/components/Skeleton';
import { useAuth } from '@/lib/useAuth';
import { useAccountStatus } from '@/lib/useAccountStatus';
import PendingAccountBlock from '@/components/PendingAccountBlock';


interface VerificationDetail { identity: boolean; video: boolean; cv: boolean; assessment: boolean }
interface CandidateCard {
  // Opaque unique id used for the React key + busy-tracking only — a
  // match_scores.id for matched/alternate cards, an introductions.id for
  // applicant cards (see introductionId below, which the accept/reject
  // handlers actually act on for those).
  matchScoreId: string;
  candidateId: string;
  introductionId: string | null;
  score: number | null;
  isAlternate: boolean;
  verified: boolean | null;
  verificationDetail: VerificationDetail | null;
  fullName: string;
  photoUrl: string | null;
  skillTags: string[];
  summary: string | null;
  location: string | null;
  remotePreference: string | null;
  experienceLevel: string | null;
  rateMin: number | null;
  ratePreferred: number | null;
  rateMax: number | null;
  availabilityDate: string | null;
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
  const isWideDesktop = useIsWideDesktopWeb();
  const gridItemStyle = isWideDesktop ? st.gridItemThird : isDesktop && st.gridItemHalf;
  const { roleId } = useLocalSearchParams<{ roleId: string }>();
  const { companyId } = useAuth();
  const companyStatus = useAccountStatus('companies', companyId);

  const [roleTitle, setRoleTitle] = useState<string | null>(null);
  const [roleTier, setRoleTier] = useState<Tier | null>(null);
  const [matchingRanAt, setMatchingRanAt] = useState<string | null>(null);
  const [cards, setCards] = useState<CandidateCard[] | null>(null);
  const [applicants, setApplicants] = useState<CandidateCard[]>([]);
  const [introduced, setIntroduced] = useState<IntroducedCard[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailCard, setDetailCard] = useState<CandidateCard | null>(null);
  const [matchingState, setMatchingState] = useState<MatchingState>('idle');
  const [boostSuggestions, setBoostSuggestions] = useState<string[] | null>(null);
  const [boostLoading, setBoostLoading] = useState(false);
  const autoTriggeredFor = useRef<string | null>(null);

  const handleGetAiSuggestions = async () => {
    if (!roleId) return;
    setBoostLoading(true);
    try {
      const suggestions = await getRoleBoostSuggestions(roleId);
      setBoostSuggestions(suggestions);
    } catch (err) {
      notify('Could not get suggestions', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBoostLoading(false);
    }
  };

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
      .select('id, candidate_id, status, initiated_by, candidates(full_name)')
      .eq('role_id', roleId);
    // Disqualifies a candidate from the algorithmic shortlist either way —
    // already applied, or already sent an intro, no need to show them twice.
    const introducedIds = new Set((intros ?? []).map((i) => i.candidate_id));
    const introducedCards: IntroducedCard[] = [];
    // Company-initiated rows only — a candidate-initiated 'sent' row (an
    // application still awaiting the company's decision) belongs in the
    // dedicated APPLICANTS section below instead, with its own richer card
    // and accept/reject actions, not this flat name+status row. Once
    // accepted, either origin reads identically from here on (contact
    // reveal doesn't care how the connection started), so this only needs
    // to exclude the 'sent'-and-candidate-initiated case specifically.
    for (const i of (intros ?? []) as any[]) {
      if (i.status === 'sent' && i.initiated_by === 'candidate') continue;
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
      .select('id, candidate_id, score, is_alternate, company_action, score_breakdown, candidates(full_name, photo_url, skill_tags, summary, location, remote_preference, experience_level, rate_min, rate_preferred, rate_max, availability_date)')
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
        introductionId: null,
        score: s.score,
        isAlternate: s.is_alternate,
        verified: typeof s.score_breakdown?.verified === 'boolean' ? s.score_breakdown.verified : null,
        verificationDetail: s.score_breakdown?.verificationDetail ?? null,
        fullName: s.candidates?.full_name ?? 'Candidate',
        photoUrl: s.candidates?.photo_url ?? null,
        skillTags: s.candidates?.skill_tags ?? [],
        summary: s.candidates?.summary ?? null,
        location: s.candidates?.location ?? null,
        remotePreference: s.candidates?.remote_preference ?? null,
        experienceLevel: s.candidates?.experience_level ?? null,
        rateMin: s.candidates?.rate_min ?? null,
        ratePreferred: s.candidates?.rate_preferred ?? null,
        rateMax: s.candidates?.rate_max ?? null,
        availabilityDate: s.candidates?.availability_date ?? null,
      }));
    setCards(rows);

    // Applicants — candidates who applied directly to this role rather
    // than being matched. No match_scores row exists for these (they never
    // went through the pipeline), so verification detail is built from
    // verification_records directly (readable here via the new
    // verification_records_select_via_company_applicant policy) instead of
    // the pre-computed score_breakdown.verificationDetail matched cards use.
    const { data: applications } = await supabase
      .from('introductions')
      .select('id, candidate_id, candidates(full_name, photo_url, skill_tags, summary, location, remote_preference, experience_level, rate_min, rate_preferred, rate_max, availability_date)')
      .eq('role_id', roleId)
      .eq('initiated_by', 'candidate')
      .eq('status', 'sent');

    const applicationRows = applications ?? [];
    const applicantIds = applicationRows.map((a: any) => a.candidate_id);
    const { data: vrecs } = applicantIds.length
      ? await supabase.from('verification_records').select('candidate_id, component, status').in('candidate_id', applicantIds)
      : { data: [] as any[] };
    const vrByCandidate = new Map<string, Set<string>>();
    for (const v of vrecs ?? []) {
      if (v.status !== 'passed') continue;
      const set = vrByCandidate.get(v.candidate_id) ?? new Set<string>();
      set.add(v.component);
      vrByCandidate.set(v.candidate_id, set);
    }

    setApplicants(applicationRows.map((a: any) => {
      const passed = vrByCandidate.get(a.candidate_id) ?? new Set<string>();
      return {
        matchScoreId: a.id,
        candidateId: a.candidate_id,
        introductionId: a.id,
        score: null,
        isAlternate: false,
        verified: null,
        verificationDetail: {
          identity: passed.has('identity'),
          video: passed.has('video_intro'),
          cv: passed.has('cv_review'),
          assessment: passed.has('skills_assessment'),
        },
        fullName: a.candidates?.full_name ?? 'Candidate',
        photoUrl: a.candidates?.photo_url ?? null,
        skillTags: a.candidates?.skill_tags ?? [],
        summary: a.candidates?.summary ?? null,
        location: a.candidates?.location ?? null,
        remotePreference: a.candidates?.remote_preference ?? null,
        experienceLevel: a.candidates?.experience_level ?? null,
        rateMin: a.candidates?.rate_min ?? null,
        ratePreferred: a.candidates?.rate_preferred ?? null,
        rateMax: a.candidates?.rate_max ?? null,
        availabilityDate: a.candidates?.availability_date ?? null,
      };
    }));
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

  const handleApplicantDecision = async (card: CandidateCard, decision: 'accepted' | 'declined') => {
    if (!card.introductionId) return;
    setBusyId(card.matchScoreId);
    const { error } = await supabase
      .from('introductions')
      .update({ status: decision, responded_at: new Date().toISOString() })
      .eq('id', card.introductionId);
    setBusyId(null);
    if (error) {
      notify('Something went wrong', error.message);
      return;
    }
    if (decision === 'accepted') void notifyIntroduction(card.introductionId, 'accepted');
    await load();
  };

  const cfg = roleTier ? TIER_CONFIG[roleTier] : null;
  const active = (cards ?? []).filter((c) => !c.isAlternate);
  const alternates = (cards ?? []).filter((c) => c.isAlternate);
  const hasAnyCards = active.length > 0 || alternates.length > 0;
  const running = matchingState === 'running';

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <PageHead title="Shortlist" />
      <ScreenFrame>
      <View style={st.header}>
        <AnimatedPressable style={st.backButton} onPress={() => goBack(router, '/(company)/roles')} hitSlop={2} accessibilityRole="button" accessibilityLabel="Go back">
          <AppIcon name="arrow-back" size={20} color={T.textPrimary} />
        </AnimatedPressable>
        <View style={{ flex: 1 }}>
          <Text style={st.headerTitle} numberOfLines={1}>{roleTitle ?? 'Shortlist'}</Text>
          {cfg && (
            <View style={[st.tierPill, { backgroundColor: cfg.accent + '14', alignSelf: 'flex-start' }]}>
              <Text style={[st.tierText, { color: cfg.accent }]}>{cfg.label.toUpperCase()}</Text>
            </View>
          )}
        </View>
        <AnimatedPressable
          style={st.rerunButton}
          onPress={runMatching}
          disabled={running}
          accessibilityRole="button"
          accessibilityLabel="Re-run matching"
        >
          {running ? (
            <ActivityIndicator size="small" color={T.accent} />
          ) : (
            <AppIcon name="refresh" size={18} color={T.accent} />
          )}
        </AnimatedPressable>
      </View>

      {companyStatus !== 'pending' && companyStatus !== 'rejected' && roleId && (
        boostSuggestions === null ? (
          <AnimatedPressable style={st.boostButton} onPress={handleGetAiSuggestions} disabled={boostLoading} accessibilityRole="button" accessibilityLabel="Get AI suggestions to boost this role">
            {boostLoading ? (
              <ActivityIndicator size="small" color={T.accent} />
            ) : (
              <AppIcon name="sparkles-outline" size={16} color={T.accent} />
            )}
            <Text style={st.boostButtonText}>{boostLoading ? 'Thinking…' : 'Get AI Suggestions to Boost This Role'}</Text>
          </AnimatedPressable>
        ) : (
          <View style={st.boostCard}>
            <View style={st.boostCardHeader}>
              <View style={st.boostCardHeaderLeft}>
                <AppIcon name="sparkles-outline" size={16} color={T.accent} />
                <Text style={st.boostCardTitle}>AI Suggestions to Boost This Role</Text>
              </View>
              <AnimatedPressable onPress={() => setBoostSuggestions(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Dismiss suggestions">
                <AppIcon name="close" size={16} color={T.textMuted} />
              </AnimatedPressable>
            </View>
            {boostSuggestions.map((s, i) => (
              <View key={i} style={st.boostSuggestionRow}>
                <View style={st.boostSuggestionDot} />
                <Text style={st.boostSuggestionText}>{s}</Text>
              </View>
            ))}
          </View>
        )
      )}

      {companyStatus === 'pending' || companyStatus === 'rejected' ? (
        <PendingAccountBlock status={companyStatus} action="view your shortlist" />
      ) : cards === null ? (
        <ScrollView contentContainerStyle={st.scroll}>
          <View style={st.grid}>
            <View style={[st.gridItem, gridItemStyle]}><SkeletonCard /></View>
            <View style={[st.gridItem, gridItemStyle]}><SkeletonCard /></View>
            <View style={[st.gridItem, gridItemStyle]}><SkeletonCard /></View>
            <View style={[st.gridItem, gridItemStyle]}><SkeletonCard /></View>
          </View>
        </ScrollView>
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
              <AppIcon name="cloud-offline-outline" size={28} color={T.textMuted} />
              <Text style={st.emptyTitle}>Matching runs on the live site</Text>
              <Text style={st.emptySub}>The matching service isn’t available in local preview. Open this role on the deployed site to build its shortlist.</Text>
            </View>
          )}

          {!hasAnyCards && !running && matchingState !== 'unavailable' && matchingRanAt !== null && (
            <View style={st.emptyBlock}>
              <AppIcon name="search" size={28} color={T.textMuted} />
              <Text style={st.emptyTitle}>No candidates matched yet</Text>
              <Text style={st.emptySub}>No one in the pool cleared the bar for this role. Widening the skills or rate range, then re-running, may surface more.</Text>
              <AnimatedPressable style={st.rerunPill} onPress={runMatching}>
                <AppIcon name="refresh" size={15} color={T.textOnAccent} />
                <Text style={st.rerunPillText}>Re-run matching</Text>
              </AnimatedPressable>
            </View>
          )}

          {applicants.length > 0 && (
            <>
              <Text style={st.sectionLabel}>APPLICANTS</Text>
              <View style={st.grid}>
                {applicants.map((c, i) => (
                  <View key={c.matchScoreId} style={[st.gridItem, gridItemStyle]}>
                    <SwipeFadeContainer axis="y" offset={16} duration={DURATION.stagger} delay={Math.min(i, 8) * 45}>
                      <CandidateCardView T={T} st={st} card={c} busy={busyId === c.matchScoreId}
                        onAccept={() => handleApplicantDecision(c, 'accepted')} onSkip={() => handleApplicantDecision(c, 'declined')} onSave={() => {}} onOpenDetail={() => setDetailCard(c)} />
                    </SwipeFadeContainer>
                  </View>
                ))}
              </View>
            </>
          )}

          {active.length > 0 && (
            <>
              <Text style={st.sectionLabel}>SHORTLIST</Text>
              <View style={st.grid}>
                {active.map((c, i) => (
                  <View key={c.matchScoreId} style={[st.gridItem, gridItemStyle]}>
                    <SwipeFadeContainer axis="y" offset={16} duration={DURATION.stagger} delay={Math.min(i, 8) * 45}>
                      <CandidateCardView T={T} st={st} card={c} busy={busyId === c.matchScoreId}
                        onAccept={() => handleAccept(c)} onSkip={() => handleAction(c, 'skipped')} onSave={() => handleAction(c, 'saved')} onOpenDetail={() => setDetailCard(c)} />
                    </SwipeFadeContainer>
                  </View>
                ))}
              </View>
            </>
          )}

          {alternates.length > 0 && (
            <>
              <Text style={st.sectionLabel}>ALTERNATES</Text>
              <View style={st.grid}>
                {alternates.map((c, i) => (
                  <View key={c.matchScoreId} style={[st.gridItem, gridItemStyle]}>
                    <SwipeFadeContainer axis="y" offset={16} duration={DURATION.stagger} delay={Math.min(i, 8) * 45}>
                      <CandidateCardView T={T} st={st} card={c} busy={busyId === c.matchScoreId}
                        onAccept={() => handleAccept(c)} onSkip={() => handleAction(c, 'skipped')} onSave={() => handleAction(c, 'saved')} onOpenDetail={() => setDetailCard(c)} />
                    </SwipeFadeContainer>
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
      </ScreenFrame>

      <CandidateDetailModal
        T={T} st={st}
        card={detailCard}
        busy={detailCard != null && busyId === detailCard.matchScoreId}
        onClose={() => setDetailCard(null)}
        onAccept={() => {
          if (!detailCard) return;
          if (detailCard.introductionId) handleApplicantDecision(detailCard, 'accepted');
          else handleAccept(detailCard);
          setDetailCard(null);
        }}
        onSkip={() => {
          if (!detailCard) return;
          if (detailCard.introductionId) handleApplicantDecision(detailCard, 'declined');
          else handleAction(detailCard, 'skipped');
          setDetailCard(null);
        }}
        onSave={() => { if (detailCard && !detailCard.introductionId) { handleAction(detailCard, 'saved'); setDetailCard(null); } }}
      />
    </SafeAreaView>
  );
}

function rateRangeText(card: CandidateCard): string | null {
  const { rateMin, ratePreferred, rateMax } = card;
  const low = ratePreferred ?? rateMin;
  const high = rateMax && rateMax !== low ? rateMax : null;
  if (low && high) return `${formatNaira(low)}–${formatNaira(high)}`;
  if (low) return `from ${formatNaira(low)}`;
  return null;
}

function verifiedCount(detail: VerificationDetail | null): number | null {
  if (!detail) return null;
  return [detail.identity, detail.video, detail.cv, detail.assessment].filter(Boolean).length;
}

function CandidateCardView({ T, st, card, busy, onAccept, onSkip, onSave, onOpenDetail }: {
  T: ThemePalette; st: ReturnType<typeof makeStyles>; card: CandidateCard; busy: boolean;
  onAccept: () => void; onSkip: () => void; onSave: () => void; onOpenDetail: () => void;
}) {
  const meta = [
    card.experienceLevel,
    card.location,
    rateRangeText(card),
  ].filter(Boolean).join('  ·  ');
  const vCount = verifiedCount(card.verificationDetail);

  return (
    <View style={st.card}>
      <AnimatedPressable style={st.cardHeader} onPress={onOpenDetail} accessibilityRole="button" accessibilityLabel={`View ${card.fullName}'s full profile`}>
        {card.score !== null ? (
          <View style={st.scoreRing}>
            <Text style={st.scoreText}>{card.score}%</Text>
          </View>
        ) : (
          <View style={st.appliedPill}>
            <Text style={st.appliedPillText}>Applied</Text>
          </View>
        )}

        {card.photoUrl ? (
          <Image source={{ uri: card.photoUrl }} style={st.photo} resizeMode="cover" />
        ) : (
          <View style={[st.photo, st.photoFallback]}>
            <Text style={st.photoInitials}>{initials(card.fullName)}</Text>
          </View>
        )}

        <Text style={st.candidateName} numberOfLines={1}>{card.fullName}</Text>

        <View style={st.badgeRow}>
          {vCount !== null ? (
            <View style={[st.badge, vCount === 4 ? st.badgeVerified : st.badgeUnverified]}>
              <AppIcon name={vCount === 4 ? 'shield-checkmark' : 'shield-outline'} size={ICON.xs} color={vCount === 4 ? T.emerald : T.textMuted} />
              <Text style={[st.badgeText, { color: vCount === 4 ? T.emerald : T.textMuted }]}>{vCount}/4 verified</Text>
            </View>
          ) : card.verified === true ? (
            <View style={[st.badge, st.badgeVerified]}>
              <AppIcon name="shield-checkmark" size={ICON.xs} color={T.emerald} />
              <Text style={[st.badgeText, { color: T.emerald }]}>Verified</Text>
            </View>
          ) : card.verified === false ? (
            <View style={[st.badge, st.badgeUnverified]}>
              <AppIcon name="shield-outline" size={ICON.xs} color={T.textMuted} />
              <Text style={[st.badgeText, { color: T.textMuted }]}>Not yet verified</Text>
            </View>
          ) : null}
        </View>

        {meta ? <Text style={st.metaText} numberOfLines={1}>{meta}</Text> : null}
      </AnimatedPressable>

      <View style={st.cardSkillsRow}>
        {card.skillTags.slice(0, 4).map((s) => (
          <View key={s} style={st.skillChip}>
            <Text style={st.skillText}>{s}</Text>
          </View>
        ))}
        {card.skillTags.length > 4 && (
          <View style={st.skillChip}>
            <Text style={st.skillText}>+{card.skillTags.length - 4}</Text>
          </View>
        )}
      </View>

      <AnimatedPressable style={st.viewProfileBtn} onPress={onOpenDetail} accessibilityRole="button" accessibilityLabel={`View ${card.fullName}'s full profile — experience, skills, summary`}>
        <Text style={st.viewProfileText}>View Full Profile</Text>
        <AppIcon name="arrow-forward" size={13} color={T.accentDim} />
      </AnimatedPressable>

      <View style={st.actionsRow}>
        <AnimatedPressable style={st.iconActionBtn} onPress={onSkip} disabled={busy} accessibilityRole="button" accessibilityLabel={card.score !== null ? `Skip ${card.fullName}` : `Reject ${card.fullName}'s application`}>
          <AppIcon name="close" size={ICON.sm} color={T.danger} />
        </AnimatedPressable>
        {card.score !== null && (
          <AnimatedPressable style={st.iconActionBtn} onPress={onSave} disabled={busy} accessibilityRole="button" accessibilityLabel={`Save ${card.fullName}`}>
            <AppIcon name="bookmark-outline" size={ICON.sm} color={T.accent} />
          </AnimatedPressable>
        )}
        <AnimatedPressable style={st.acceptBtn} onPress={onAccept} disabled={busy} accessibilityRole="button" accessibilityLabel={card.score !== null ? `Accept ${card.fullName}` : `Accept ${card.fullName}'s application`}>
          <AppIcon name="checkmark" size={ICON.sm} color={T.white} />
          <Text style={st.acceptText}>Accept</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const VERIFICATION_LABELS: { key: keyof VerificationDetail; label: string }[] = [
  { key: 'identity', label: 'Identity' },
  { key: 'video', label: 'Video Intro' },
  { key: 'cv', label: 'CV / Portfolio' },
  { key: 'assessment', label: 'Skills Assessment' },
];

// Tap-to-expand detail behind the compact grid card — "prevents client
// overwhelm" was explicit in the request that drove this: the grid stays
// scannable, the full picture (every skill, bio, availability, per-
// component verification) is opt-in here rather than crammed into every
// card in the grid.
interface ExperiencePreview { id: string; jobTitle: string; startDate: string | null; endDate: string | null; isCurrent: boolean; description: string | null }
interface EducationPreview { id: string; institution: string; qualification: string; fieldOfStudy: string | null; startDate: string | null; endDate: string | null }
interface CertificationPreview { id: string; name: string; issuingOrganization: string | null; issueDate: string | null; expiryDate: string | null }

function yearOf(d: string | null): string {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '' : String(date.getFullYear());
}

function CandidateDetailModal({ T, st, card, busy, onClose, onAccept, onSkip, onSave }: {
  T: ThemePalette; st: ReturnType<typeof makeStyles>; card: CandidateCard | null; busy: boolean;
  onClose: () => void; onAccept: () => void; onSkip: () => void; onSave: () => void;
}) {
  const [cvLoading, setCvLoading] = useState(false);
  const [experience, setExperience] = useState<ExperiencePreview[]>([]);
  const [education, setEducation] = useState<EducationPreview[]>([]);
  const [certifications, setCertifications] = useState<CertificationPreview[]>([]);

  useEffect(() => {
    if (!card) {
      setExperience([]); setEducation([]); setCertifications([]);
      return;
    }
    let alive = true;
    setCvLoading(true);
    (async () => {
      const [expRes, eduRes, certRes] = await Promise.all([
        supabase.rpc('get_candidate_experience_preview', { p_candidate_id: card.candidateId }),
        supabase.from('candidate_education').select('id, institution, qualification, field_of_study, start_date, end_date').eq('candidate_id', card.candidateId).order('start_date', { ascending: false }),
        supabase.rpc('get_candidate_certifications_preview', { p_candidate_id: card.candidateId }),
      ]);
      if (!alive) return;
      setExperience((expRes.data ?? []).map((r: any) => ({ id: r.id, jobTitle: r.job_title, startDate: r.start_date, endDate: r.end_date, isCurrent: r.is_current, description: r.description })));
      setEducation((eduRes.data ?? []).map((r: any) => ({ id: r.id, institution: r.institution, qualification: r.qualification, fieldOfStudy: r.field_of_study, startDate: r.start_date, endDate: r.end_date })));
      setCertifications((certRes.data ?? []).map((r: any) => ({ id: r.id, name: r.name, issuingOrganization: r.issuing_organization, issueDate: r.issue_date, expiryDate: r.expiry_date })));
      setCvLoading(false);
    })();
    return () => { alive = false; };
  }, [card?.candidateId]);

  return (
    <Modal visible={card != null} animationType="slide" transparent onRequestClose={onClose}>
      <View style={st.detailOverlay}>
        <View style={st.detailCard}>
          {card && (
            <>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={st.detailHeaderRow}>
                  <AnimatedPressable onPress={onClose} hitSlop={11} accessibilityRole="button" accessibilityLabel="Close">
                    <AppIcon name="close" size={22} color={T.textMuted} />
                  </AnimatedPressable>
                </View>

                <View style={st.detailProfileRow}>
                  {card.photoUrl ? (
                    <Image source={{ uri: card.photoUrl }} style={st.detailPhoto} resizeMode="cover" />
                  ) : (
                    <View style={[st.detailPhoto, st.photoFallback]}>
                      <Text style={st.detailPhotoInitials}>{initials(card.fullName)}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={st.detailName} numberOfLines={1}>{card.fullName}</Text>
                    {card.score !== null ? (
                      <View style={st.detailScoreRing}>
                        <Text style={st.scoreText}>{card.score}% match</Text>
                      </View>
                    ) : (
                      <View style={st.appliedPill}>
                        <Text style={st.appliedPillText}>Applied directly</Text>
                      </View>
                    )}
                  </View>
                </View>

                {card.summary && <Text style={st.detailSummary}>{card.summary}</Text>}

                <View style={st.detailFactRow}>
                  <DetailFact T={T} st={st} icon="briefcase-outline" label="Experience" value={card.experienceLevel} />
                  <DetailFact T={T} st={st} icon="location-outline" label="Location" value={card.location} />
                  <DetailFact T={T} st={st} icon="globe-outline" label="Remote preference" value={card.remotePreference} />
                  <DetailFact T={T} st={st} icon="cash-outline" label="Rate" value={rateRangeText(card)} />
                  <DetailFact T={T} st={st} icon="calendar-outline" label="Availability" value={card.availabilityDate ? new Date(card.availabilityDate).toLocaleDateString() : null} />
                </View>

                <Text style={st.detailSectionLabel}>SKILLS</Text>
                <View style={st.skillsRow}>
                  {card.skillTags.map((s) => (
                    <View key={s} style={st.skillChip}>
                      <Text style={st.skillText}>{s}</Text>
                    </View>
                  ))}
                  {card.skillTags.length === 0 && <Text style={st.detailEmptyText}>No skills listed.</Text>}
                </View>

                <Text style={st.detailSectionLabel}>VERIFICATION</Text>
                <View style={st.skillsRow}>
                  {VERIFICATION_LABELS.map(({ key, label }) => {
                    const passed = card.verificationDetail?.[key] === true;
                    return (
                      <View key={key} style={[st.badge, passed ? st.badgeVerified : st.badgeUnverified]}>
                        {passed && <AppIcon name="checkmark" size={ICON.xs} color={T.emerald} />}
                        <Text style={[st.badgeText, { color: passed ? T.emerald : T.textMuted }]}>{label}</Text>
                      </View>
                    );
                  })}
                  {!card.verificationDetail && (
                    <Text style={st.detailEmptyText}>Not available until matching next re-runs for this role.</Text>
                  )}
                </View>

                <Text style={st.detailSectionLabel}>WORK EXPERIENCE</Text>
                {cvLoading ? (
                  <ActivityIndicator size="small" color={T.textMuted} />
                ) : experience.length === 0 ? (
                  <Text style={st.detailEmptyText}>No experience listed yet.</Text>
                ) : (
                  experience.map((e) => (
                    <View key={e.id} style={st.cvEntry}>
                      <Text style={st.cvEntryTitle}>{e.jobTitle}</Text>
                      <Text style={st.cvEntryMeta}>
                        Previous employer · {yearOf(e.startDate) || '?'}–{e.isCurrent ? 'Present' : (yearOf(e.endDate) || '?')}
                      </Text>
                      {e.description && <Text style={st.cvEntryDesc}>{e.description}</Text>}
                    </View>
                  ))
                )}

                <Text style={st.detailSectionLabel}>EDUCATION</Text>
                {cvLoading ? (
                  <ActivityIndicator size="small" color={T.textMuted} />
                ) : education.length === 0 ? (
                  <Text style={st.detailEmptyText}>No education listed yet.</Text>
                ) : (
                  education.map((e) => (
                    <View key={e.id} style={st.cvEntry}>
                      <Text style={st.cvEntryTitle}>{e.qualification}{e.fieldOfStudy ? ` · ${e.fieldOfStudy}` : ''}</Text>
                      <Text style={st.cvEntryMeta}>{e.institution} · {yearOf(e.startDate) || '?'}–{yearOf(e.endDate) || '?'}</Text>
                    </View>
                  ))
                )}

                <Text style={st.detailSectionLabel}>CERTIFICATIONS</Text>
                {cvLoading ? (
                  <ActivityIndicator size="small" color={T.textMuted} />
                ) : certifications.length === 0 ? (
                  <Text style={st.detailEmptyText}>No certifications listed yet.</Text>
                ) : (
                  certifications.map((c) => (
                    <View key={c.id} style={st.cvEntry}>
                      <Text style={st.cvEntryTitle}>{c.name}</Text>
                      <Text style={st.cvEntryMeta}>{c.issuingOrganization ?? 'Issuer not specified'}{c.issueDate ? ` · ${yearOf(c.issueDate)}` : ''}</Text>
                    </View>
                  ))
                )}
              </ScrollView>

              <View style={[st.actionsRow, { marginTop: 16 }]}>
                <AnimatedPressable style={st.iconActionBtn} onPress={onSkip} disabled={busy} accessibilityRole="button" accessibilityLabel={card.score !== null ? `Skip ${card.fullName}` : `Reject ${card.fullName}'s application`}>
                  <AppIcon name="close" size={ICON.sm} color={T.danger} />
                </AnimatedPressable>
                {card.score !== null && (
                  <AnimatedPressable style={st.iconActionBtn} onPress={onSave} disabled={busy} accessibilityRole="button" accessibilityLabel={`Save ${card.fullName}`}>
                    <AppIcon name="bookmark-outline" size={ICON.sm} color={T.accent} />
                  </AnimatedPressable>
                )}
                <AnimatedPressable style={st.acceptBtn} onPress={onAccept} disabled={busy} accessibilityRole="button" accessibilityLabel={card.score !== null ? `Accept ${card.fullName}` : `Accept ${card.fullName}'s application`}>
                  <AppIcon name="checkmark" size={ICON.sm} color={T.white} />
                  <Text style={st.acceptText}>Accept</Text>
                </AnimatedPressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function DetailFact({ T, st, icon, label, value }: { T: ThemePalette; st: ReturnType<typeof makeStyles>; icon: AppIconName; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={st.detailFact} accessibilityLabel={`${label}: ${value}`}>
      <AppIcon name={icon} size={14} color={T.textMuted} />
      <Text style={st.detailFactText} numberOfLines={1}>{value}</Text>
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
  rerunPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.pill, marginTop: 16 },
  rerunPillText: { fontSize: 13, fontWeight: '700', color: T.textOnAccent },
  boostButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: T.accentBg, borderWidth: 1, borderColor: T.accent + '40',
    borderRadius: RADIUS.card, paddingVertical: 12, marginHorizontal: 20, marginBottom: 16,
  },
  boostButtonText: { fontSize: 13, fontWeight: '700', color: T.accentDim },
  boostCard: {
    backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderRadius: RADIUS.card,
    padding: 16, marginHorizontal: 20, marginBottom: 16, ...ELEVATION.card,
  },
  boostCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  boostCardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  boostCardTitle: { fontSize: 14, fontWeight: '700', color: T.textPrimary },
  boostSuggestionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  boostSuggestionDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: T.accent, marginTop: 7 },
  boostSuggestionText: { flex: 1, fontSize: 13, color: T.textSecondary, lineHeight: 19 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 4 },
  gridItem: { width: '100%' },
  gridItemHalf: { width: '48.5%' },
  gridItemThird: { width: '32%' },
  card: { flex: 1, backgroundColor: T.card, borderRadius: RADIUS.card, padding: 18, borderWidth: 1, borderColor: T.border, ...ELEVATION.card },
  cardHeader: { alignItems: 'center', marginBottom: 14, gap: 8 },
  photo: { width: 128, height: 128, borderRadius: 32, backgroundColor: T.surface, marginTop: 4 },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  photoInitials: { fontSize: 36, fontWeight: '800', color: T.accentDim, letterSpacing: -0.5 },
  candidateName: { fontSize: 17, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.3, textAlign: 'center' },
  scoreRing: { minWidth: 46, height: 26, borderRadius: RADIUS.chip, backgroundColor: T.emeraldBg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  appliedPill: { minHeight: 26, borderRadius: RADIUS.chip, backgroundColor: T.indigoBg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  appliedPillText: { fontSize: 11, fontWeight: '800', color: T.indigo, letterSpacing: -0.1 },
  scoreText: { fontSize: 12, fontWeight: '800', color: T.emerald, letterSpacing: -0.2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.chip },
  badgeVerified: { backgroundColor: T.emeraldBg },
  badgeUnverified: { backgroundColor: T.surface },
  badgeText: { fontSize: 10.5, fontWeight: '700', textTransform: 'capitalize', letterSpacing: 0.1 },
  metaText: { fontSize: 12.5, color: T.textSecondary, fontWeight: '500', textAlign: 'center' },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  cardSkillsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: 14 },
  skillChip: { backgroundColor: T.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.chip },
  skillText: { fontSize: 11.5, color: T.textSecondary, fontWeight: '600' },
  viewProfileBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: RADIUS.control, backgroundColor: T.surface, marginBottom: 12 },
  viewProfileText: { fontSize: 13, fontWeight: '700', color: T.accentDim, letterSpacing: -0.1 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 'auto' },
  iconActionBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.control, backgroundColor: T.surface },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 42, borderRadius: RADIUS.control, backgroundColor: T.accent },
  acceptText: { fontSize: 14, fontWeight: '700', color: T.white, letterSpacing: -0.1 },
  introducedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.border },
  introducedCard: { marginBottom: 12 },
  introducedName: { fontSize: 14, fontWeight: '600', color: T.textPrimary },
  introducedStatus: { fontSize: 12, color: T.textMuted, fontWeight: '600', textTransform: 'capitalize' },

  detailOverlay: { flex: 1, backgroundColor: T.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
  detailCard: { width: '100%', maxWidth: 480, maxHeight: '86%', backgroundColor: T.card, borderRadius: 20, padding: 20 },
  detailHeaderRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
  detailProfileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  detailPhoto: { width: 76, height: 76, borderRadius: 20, backgroundColor: T.surface },
  detailPhotoInitials: { fontSize: 24, fontWeight: '800', color: T.accentDim, letterSpacing: -0.5 },
  detailName: { fontSize: 19, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.3, marginBottom: 6 },
  detailScoreRing: { alignSelf: 'flex-start', minHeight: 26, borderRadius: RADIUS.chip, backgroundColor: T.emeraldBg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  detailSummary: { fontSize: 13.5, color: T.textSecondary, lineHeight: 20, marginBottom: 16 },
  detailFactRow: { gap: 8, marginBottom: 18 },
  detailFact: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailFactText: { fontSize: 13, color: T.textSecondary, fontWeight: '500', flexShrink: 1 },
  detailSectionLabel: { fontSize: 11, fontWeight: '700', color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  detailEmptyText: { fontSize: 12.5, color: T.textMuted },
  cvEntry: { marginBottom: 12 },
  cvEntryTitle: { fontSize: 13.5, fontWeight: '700', color: T.textPrimary, marginBottom: 2 },
  cvEntryMeta: { fontSize: 12, color: T.textMuted, marginBottom: 4 },
  cvEntryDesc: { fontSize: 12.5, color: T.textSecondary, lineHeight: 18 },
});
