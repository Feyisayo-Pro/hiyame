import { useCallback, useEffect, useState, useMemo } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette, ELEVATION, DISPLAY_FONT_FAMILY, RADIUS } from '@/lib/theme';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { TIER_CONFIG, Tier, RESPONSE_WINDOW_HOURS } from '@/lib/mock-data';
import { notify } from '@/lib/notify';
import { initials } from '@/lib/format';
import { formatNaira } from '@/lib/currency';
import { getIntroductionContact, IntroductionContact } from '@/lib/introductionContact';
import ContactReveal from '@/components/ContactReveal';
import ScreenFrame from '@/components/ScreenFrame';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import { DURATION } from '@/lib/motion';
import PageHead from '@/components/PageHead';
import AnimatedPressable from '@/components/AnimatedPressable';
import { notifyIntroduction } from '@/lib/requestNotify';
import { useIsDesktopWeb, useIsWideDesktopWeb } from '@/components/TopNav';
import { useAccountStatus } from '@/lib/useAccountStatus';
import PendingAccountBlock from '@/components/PendingAccountBlock';

// Two ways into an introduction now (2026-10-08): a company's shortlist
// Accept creates one (company-initiated — this screen's original purpose,
// below), or a candidate applies directly to an open role (this screen's
// new "Open Roles" section, top). Blind matching (company identity hidden
// until accept) applies ONLY to the company-initiated path — enforced
// server-side by get_introduction_preview(), not by anything client-side
// here. A candidate's own application shows the real company throughout:
// they chose it, there's nothing to hide from them.

interface PendingIntro {
  introductionId: string;
  status: string;
  sentAt: string;
  responseWindowHours: number;
  roleTitle: string;
  roleFunction: string | null;
  roleTier: Tier;
  companyIndustry: string | null;
  companySizeRange: string | null;
  expired: boolean;
}

// Matches get_introduction_preview()'s RETURNS TABLE columns exactly — no
// generated Supabase types exist in this project, so .rpc() calls are
// otherwise untyped.
interface IntroductionPreviewRow {
  introduction_id: string;
  status: string;
  sent_at: string;
  response_window_hours: number;
  role_title: string;
  role_function: string | null;
  role_tier: Tier;
  company_industry: string | null;
  company_size_range: string | null;
}

interface AcceptedIntro {
  introductionId: string;
  roleTitle: string;
  roleTier: Tier;
  companyName: string;
  contact: IntroductionContact | null;
}

interface OpenRole {
  id: string;
  title: string;
  tier: Tier;
  mustHaveSkills: string[];
  locationType: string | null;
  rateMin: number | null;
  rateMax: number | null;
  companyName: string;
  companyLogoUrl: string | null;
}

// A candidate's own application, awaiting the company's decision — distinct
// from PendingIntro (company-initiated, blind, candidate decides) even
// though both currently sit at status 'sent': this one shows the real
// company since the candidate already knows it, and there's no
// accept/decline action — the company is the one deciding.
interface MyApplication {
  introductionId: string;
  roleTitle: string;
  roleTier: Tier;
  companyName: string;
  sentAt: string;
}

export default function OpportunitiesScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const { candidateId } = useAuth();
  const candidateStatus = useAccountStatus('candidates', candidateId);
  const isDesktop = useIsDesktopWeb();
  const isWideDesktop = useIsWideDesktopWeb();
  const gridItemStyle = isWideDesktop ? st.gridItemThird : isDesktop && st.gridItemHalf;

  const [pending, setPending] = useState<PendingIntro[] | null>(null);
  const [accepted, setAccepted] = useState<AcceptedIntro[]>([]);
  const [myApplications, setMyApplications] = useState<MyApplication[]>([]);
  const [openRoles, setOpenRoles] = useState<OpenRole[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!candidateId) {
      setPending([]);
      setOpenRoles([]);
      return;
    }

    const { data: intros, error } = await supabase
      .from('introductions')
      .select('id, role_id, status, sent_at, response_window_hours, initiated_by')
      .eq('candidate_id', candidateId)
      .order('sent_at', { ascending: false });
    if (error) {
      console.warn('Failed to load introductions:', error.message);
      setPending([]);
      setOpenRoles([]);
      return;
    }

    // Applied roles are excluded from the Open Roles browse list below
    // regardless of status — already sent, accepted, or declined, none of
    // those should show as "apply again".
    const appliedRoleIds = new Set((intros ?? []).map((i) => i.role_id));

    // Company-initiated 'sent' rows go through the blind preview (the
    // candidate doesn't know who this is yet, decides accept/decline here).
    // Candidate-initiated 'sent' rows are the candidate's own applications —
    // they already know the company, there's nothing to decide, the
    // company is the one reviewing. Same 'sent' status, different meaning
    // by origin — see this file's own top comment.
    const sentRows = (intros ?? []).filter((i) => i.status === 'sent' && i.initiated_by === 'company');
    const appliedRows = (intros ?? []).filter((i) => i.status === 'sent' && i.initiated_by === 'candidate');
    const acceptedRows = (intros ?? []).filter((i) => i.status === 'accepted');

    const applications: MyApplication[] = [];
    for (const row of appliedRows) {
      const { data: role } = await supabase.from('roles').select('title, tier, company_id').eq('id', row.role_id).maybeSingle();
      if (!role) continue;
      const { data: company } = await supabase.from('companies').select('legal_name, trading_name').eq('id', role.company_id).maybeSingle();
      applications.push({
        introductionId: row.id,
        roleTitle: role.title,
        roleTier: role.tier as Tier,
        companyName: company?.trading_name || company?.legal_name || 'Company',
        sentAt: row.sent_at,
      });
    }
    setMyApplications(applications);

    const { data: liveRoles } = await supabase
      .from('roles')
      .select('id, title, tier, required_skills, location_type, rate_min, rate_max, companies(legal_name, trading_name, logo_url)')
      .order('created_at', { ascending: false });
    setOpenRoles(
      (liveRoles ?? [])
        .filter((r: any) => !appliedRoleIds.has(r.id))
        .map((r: any) => ({
          id: r.id,
          title: r.title,
          tier: r.tier as Tier,
          mustHaveSkills: r.required_skills?.must_have ?? [],
          locationType: r.location_type,
          rateMin: r.rate_min,
          rateMax: r.rate_max,
          companyName: r.companies?.trading_name || r.companies?.legal_name || 'Company',
          companyLogoUrl: r.companies?.logo_url ?? null,
        }))
    );

    const previews: PendingIntro[] = [];
    for (const row of sentRows) {
      const { data: preview, error: previewErr } = await supabase
        .rpc('get_introduction_preview', { p_introduction_id: row.id })
        .maybeSingle<IntroductionPreviewRow>();
      if (previewErr || !preview) continue;
      const deadline = new Date(preview.sent_at).getTime() + preview.response_window_hours * 60 * 60 * 1000;
      previews.push({
        introductionId: preview.introduction_id,
        status: preview.status,
        sentAt: preview.sent_at,
        responseWindowHours: preview.response_window_hours,
        roleTitle: preview.role_title,
        roleFunction: preview.role_function,
        roleTier: preview.role_tier,
        companyIndustry: preview.company_industry,
        companySizeRange: preview.company_size_range,
        expired: Date.now() > deadline,
      });
    }
    setPending(previews);

    const acceptedDetails: AcceptedIntro[] = [];
    if (acceptedRows.length > 0) {
      const { data: fullIntros } = await supabase
        .from('introductions')
        .select('id, role_id')
        .in('id', acceptedRows.map((r) => r.id));
      for (const intro of fullIntros ?? []) {
        const { data: role } = await supabase.from('roles').select('title, tier, company_id').eq('id', intro.role_id).maybeSingle();
        if (!role) continue;
        const { data: company } = await supabase.from('companies').select('legal_name').eq('id', role.company_id).maybeSingle();
        const contact = await getIntroductionContact(intro.id);
        acceptedDetails.push({
          introductionId: intro.id,
          roleTitle: role.title,
          roleTier: role.tier as Tier,
          companyName: contact?.companyName ?? company?.legal_name ?? 'Company',
          contact,
        });
      }
    }
    setAccepted(acceptedDetails);
  }, [candidateId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const respond = async (introductionId: string, status: 'accepted' | 'declined') => {
    setBusyId(introductionId);
    const { error } = await supabase
      .from('introductions')
      .update({ status, responded_at: new Date().toISOString() })
      .eq('id', introductionId);
    setBusyId(null);
    if (error) {
      notify('Something went wrong', error.message);
      return;
    }
    if (status === 'accepted') void notifyIntroduction(introductionId, 'accepted');
    await load();
  };

  const apply = async (role: OpenRole) => {
    if (!candidateId) return;
    setApplyingId(role.id);
    const { data: created, error } = await supabase
      .from('introductions')
      .insert({
        role_id: role.id,
        candidate_id: candidateId,
        initiated_by: 'candidate',
        response_window_hours: RESPONSE_WINDOW_HOURS[role.tier],
      })
      .select('id')
      .single();
    setApplyingId(null);
    if (error) {
      notify('Could not apply', error.message);
      return;
    }
    notify('Application sent', `${role.companyName} will review your application for ${role.title}.`);
    if (created?.id) void notifyIntroduction(created.id, 'sent');
    await load();
  };

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <PageHead title="Jobs" />
      <ScreenFrame>
      <View style={st.header}>
        <Text style={st.headerTitle}>Jobs</Text>
        <Text style={st.headerSub}>Apply directly, or respond to introductions from companies</Text>
      </View>

      {candidateStatus === 'pending' || candidateStatus === 'rejected' ? (
        <PendingAccountBlock status={candidateStatus} action="browse and apply to roles" />
      ) : pending === null || openRoles === null ? (
        <View style={st.centerFill}>
          <ActivityIndicator color={T.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={st.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} colors={[T.accent]} />}
        >
          {pending.length === 0 && accepted.length === 0 && openRoles.length === 0 && myApplications.length === 0 && (
            <View style={st.emptyBlock}>
              <AppIcon name="mail-outline" size={28} color={T.textMuted} />
              <Text style={st.emptyTitle}>Nothing here yet</Text>
              <Text style={st.emptySub}>
                Open roles you can apply to, and introductions companies send you, both show up here. Complete verification to become eligible for matching.
              </Text>
            </View>
          )}

          {openRoles.length > 0 && (
            <>
              <Text style={st.sectionLabel}>OPEN ROLES</Text>
              <View style={st.grid}>
                {openRoles.map((role, i) => {
                  const cfg = TIER_CONFIG[role.tier];
                  const rate = role.rateMin || role.rateMax
                    ? [role.rateMin && `from ${formatNaira(role.rateMin)}`, role.rateMax && `up to ${formatNaira(role.rateMax)}`].filter(Boolean).join(' · ')
                    : null;
                  return (
                    <SwipeFadeContainer key={role.id} axis="y" offset={16} duration={DURATION.stagger} delay={Math.min(i, 8) * 40} style={[st.gridItem, gridItemStyle]}>
                      <View style={st.card}>
                        <View style={st.companyRow}>
                          {role.companyLogoUrl ? (
                            <Image source={{ uri: role.companyLogoUrl }} style={st.companyLogo} resizeMode="cover" />
                          ) : (
                            <View style={[st.companyLogo, st.companyLogoFallback]}>
                              <Text style={st.companyLogoInitials}>{initials(role.companyName)}</Text>
                            </View>
                          )}
                          <Text style={st.companyName} numberOfLines={1}>{role.companyName}</Text>
                        </View>
                        <Text style={st.roleTitle}>{role.title}</Text>
                        <View style={[st.tierPill, { backgroundColor: cfg.accent + '14' }]}>
                          <Text style={[st.tierText, { color: cfg.accent }]}>{cfg.label.toUpperCase()}</Text>
                        </View>
                        {role.mustHaveSkills.length > 0 && (
                          <View style={st.skillsRow}>
                            {role.mustHaveSkills.slice(0, 4).map((s) => (
                              <View key={s} style={st.skillChip}>
                                <Text style={st.skillText}>{s}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                        <Text style={st.metaText}>
                          {[role.locationType, rate].filter(Boolean).join('  ·  ')}
                        </Text>
                        <AnimatedPressable
                          style={[st.applyBtn, applyingId === role.id && { opacity: 0.7 }]}
                          onPress={() => apply(role)}
                          disabled={applyingId === role.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Apply to ${role.title} at ${role.companyName}`}
                        >
                          {applyingId === role.id ? (
                            <ActivityIndicator color={T.textOnAccent} size="small" />
                          ) : (
                            <Text style={st.applyBtnText}>Apply</Text>
                          )}
                        </AnimatedPressable>
                      </View>
                    </SwipeFadeContainer>
                  );
                })}
              </View>
            </>
          )}

          {myApplications.length > 0 && (
            <>
              <Text style={st.sectionLabel}>MY APPLICATIONS</Text>
              <View style={st.grid}>
                {myApplications.map((a) => {
                  const cfg = TIER_CONFIG[a.roleTier];
                  return (
                    <View key={a.introductionId} style={[st.gridItem, gridItemStyle]}>
                      <View style={st.card}>
                        <View style={[st.tierPill, { backgroundColor: cfg.accent + '14', alignSelf: 'flex-start', marginBottom: 8 }]}>
                          <Text style={[st.tierText, { color: cfg.accent }]}>{cfg.label.toUpperCase()}</Text>
                        </View>
                        <Text style={st.roleTitle}>{a.roleTitle}</Text>
                        <View style={st.metaRow}>
                          <AppIcon name="business-outline" size={14} color={T.textSecondary} />
                          <Text style={st.metaText}>{a.companyName}</Text>
                        </View>
                        <View style={st.statusPill}>
                          <Text style={st.statusPillText}>Awaiting response</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {pending.filter((p) => !p.expired).length > 0 && <Text style={st.sectionLabel}>INTRODUCTIONS</Text>}
          <View style={st.grid}>
            {pending.filter((p) => !p.expired).map((intro, i) => {
              const cfg = TIER_CONFIG[intro.roleTier];
              const hoursLeft = (new Date(intro.sentAt).getTime() + intro.responseWindowHours * 60 * 60 * 1000 - Date.now()) / (60 * 60 * 1000);
              const deadlineText = hoursLeft < 1 ? 'Less than 1 hour left' : `${Math.round(hoursLeft)}h left to respond`;
              return (
                <SwipeFadeContainer key={intro.introductionId} axis="y" offset={16} duration={DURATION.stagger} delay={Math.min(i, 8) * 40} style={[st.gridItem, gridItemStyle]}>
                  <View style={st.card}>
                    <View style={st.lockedRow}>
                      <View style={st.lockIcon}>
                        <AppIcon name="lock-closed" size={14} color={T.textMuted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={st.lockedLabel}>Company identity revealed after you accept</Text>
                        <Text style={st.metaText}>{intro.companyIndustry ?? 'Unknown industry'} · {intro.companySizeRange ?? 'Size not specified'}</Text>
                      </View>
                    </View>
                    <Text style={st.roleTitle}>{intro.roleTitle}</Text>
                    <View style={[st.tierPill, { backgroundColor: cfg.accent + '14' }]}>
                      <Text style={[st.tierText, { color: cfg.accent }]}>{cfg.label.toUpperCase()}</Text>
                    </View>
                    <Text style={st.deadlineText}>{deadlineText}</Text>
                    <View style={st.actionsRow}>
                      <AnimatedPressable style={[st.actionBtn, st.declineBtn]} onPress={() => respond(intro.introductionId, 'declined')} disabled={busyId === intro.introductionId} accessibilityRole="button" accessibilityLabel={`Decline introduction for ${intro.roleTitle}`}>
                        <AppIcon name="close" size={17} color={T.textSecondary} />
                        <Text style={st.declineText}>Decline</Text>
                      </AnimatedPressable>
                      <AnimatedPressable style={[st.actionBtn, st.acceptBtn]} onPress={() => respond(intro.introductionId, 'accepted')} disabled={busyId === intro.introductionId} accessibilityRole="button" accessibilityLabel={`Accept introduction for ${intro.roleTitle}`}>
                        <AppIcon name="checkmark" size={18} color={T.textOnAccent} />
                        <Text style={st.acceptText}>Accept</Text>
                      </AnimatedPressable>
                    </View>
                  </View>
                </SwipeFadeContainer>
              );
            })}
          </View>

          {accepted.length > 0 && (
            <>
              <Text style={st.sectionLabel}>ACCEPTED</Text>
              <View style={st.grid}>
                {accepted.map((a) => {
                  const cfg = TIER_CONFIG[a.roleTier];
                  return (
                    <View key={a.introductionId} style={[st.gridItem, gridItemStyle]}>
                      <View style={st.card}>
                        <View style={[st.tierPill, { backgroundColor: cfg.accent + '14', alignSelf: 'flex-start', marginBottom: 8 }]}>
                          <Text style={[st.tierText, { color: cfg.accent }]}>{cfg.label.toUpperCase()}</Text>
                        </View>
                        <Text style={st.roleTitle}>{a.roleTitle}</Text>
                        {a.contact ? (
                          <View style={{ marginTop: 6 }}>
                            <ContactReveal contact={a.contact} viewer="candidate" />
                          </View>
                        ) : (
                          <View style={st.metaRow}>
                            <AppIcon name="business-outline" size={14} color={T.textSecondary} />
                            <Text style={st.metaText}>{a.companyName}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
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
  headerTitle: { fontSize: 24, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.3, fontFamily: DISPLAY_FONT_FAMILY },
  headerSub: { fontSize: 14, color: T.textSecondary, marginTop: 4 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: T.textMuted, letterSpacing: 0.5, marginTop: 8, marginBottom: 10 },
  emptyBlock: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: T.textPrimary, marginTop: 12, marginBottom: 6 },
  emptySub: { fontSize: 13, color: T.textSecondary, textAlign: 'center', lineHeight: 19 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  gridItem: { width: '100%' },
  gridItemHalf: { width: '48.5%' },
  gridItemThird: { width: '32%' },
  card: { backgroundColor: T.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: T.border, ...ELEVATION.card },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  lockIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  lockedLabel: { fontSize: 11, color: T.textMuted, fontWeight: '600', marginBottom: 2 },
  roleTitle: { fontSize: 17, fontWeight: '700', color: T.textPrimary, marginBottom: 8 },
  tierPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 10 },
  tierText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  deadlineText: { fontSize: 12, color: T.amber, fontWeight: '600', marginBottom: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: T.textSecondary },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 12 },
  // Decline reads as the secondary option (ghost outline, muted text) so
  // Accept — the one the business wants taken — is the clear primary CTA
  // (solid fill) instead of the two looking like equally-weighted choices.
  declineBtn: { backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.border },
  declineText: { fontSize: 14, fontWeight: '700', color: T.textSecondary },
  acceptBtn: { backgroundColor: T.emerald, ...ELEVATION.card },
  acceptText: { fontSize: 14, fontWeight: '700', color: T.textOnAccent },

  companyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  companyLogo: { width: 32, height: 32, borderRadius: 10, backgroundColor: T.surface },
  companyLogoFallback: { alignItems: 'center', justifyContent: 'center' },
  companyLogoInitials: { fontSize: 12, fontWeight: '800', color: T.accentDim },
  companyName: { flex: 1, fontSize: 13, fontWeight: '700', color: T.textSecondary },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  skillChip: { backgroundColor: T.surface, paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.chip },
  skillText: { fontSize: 11, color: T.textSecondary, fontWeight: '600' },
  applyBtn: { backgroundColor: T.accentSolid, borderRadius: 12, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  applyBtnText: { fontSize: 14, fontWeight: '700', color: T.textOnAccent },
  statusPill: { alignSelf: 'flex-start', backgroundColor: T.amberBg, paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.chip, marginTop: 8 },
  statusPillText: { fontSize: 11, fontWeight: '700', color: T.amber },
});
