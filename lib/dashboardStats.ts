import { supabase } from './supabase';
import type { Tier } from './mock-data';

// Real numbers for the home dashboards, the Insights tab, and the notification
// feeds. Everything here is derived from rows that actually exist
// (companies / roles / match_scores / introductions / company_users /
// candidates / verification_records) — no fabricated views, search
// appearances, or response-time metrics, none of which are tracked.

// ── shared shapes ──────────────────────────────────────────────────────
export interface RecentIntro {
  id: string;
  status: 'sent' | 'accepted' | 'declined' | 'expired';
  roleTitle: string;
  roleTier: Tier;
  counterpartyName: string; // candidate name (company view) or company name (candidate view)
  at: string; // responded_at ?? sent_at
}

export interface FeedItem {
  id: string;
  kind: 'intro_sent' | 'intro_accepted' | 'intro_declined' | 'intro_expired' | 'verify_prompt';
  title: string;
  body: string;
  at: string;
  href?: string;
  actionable?: boolean;
}

// ── company ────────────────────────────────────────────────────────────
export interface CompanyStats {
  companyName: string;
  openRoles: number;
  shortlisted: number;
  introsSent: number;
  introsAccepted: number;
  introsExpired: number;
  teamSize: number;
  acceptanceRate: number | null; // 0-100, null if no responded intros
  recentIntros: RecentIntro[];
  introsByWeek: { label: string; value: number }[]; // last 6 weeks
}

export async function getCompanyStats(companyId: string): Promise<CompanyStats> {
  const [{ data: company }, { data: roles }, { data: team }] = await Promise.all([
    supabase.from('companies').select('legal_name, trading_name').eq('id', companyId).maybeSingle(),
    supabase.from('roles').select('id, title, tier, status').eq('company_id', companyId),
    supabase.from('company_users').select('id').eq('company_id', companyId),
  ]);

  const roleIds = (roles ?? []).map((r) => r.id);
  const roleById = new Map((roles ?? []).map((r) => [r.id, r]));

  let shortlisted = 0;
  let intros: any[] = [];
  if (roleIds.length > 0) {
    const [{ count: slCount }, { data: introRows }] = await Promise.all([
      supabase
        .from('match_scores')
        .select('id', { count: 'exact', head: true })
        .in('role_id', roleIds)
        .eq('excluded', false)
        .is('company_action', null),
      supabase
        .from('introductions')
        .select('id, role_id, candidate_id, status, sent_at, responded_at, candidates(full_name)')
        .in('role_id', roleIds)
        .order('sent_at', { ascending: false }),
    ]);
    shortlisted = slCount ?? 0;
    intros = introRows ?? [];
  }

  const introsSent = intros.length;
  const introsAccepted = intros.filter((i) => i.status === 'accepted').length;
  const introsExpired = intros.filter((i) => i.status === 'expired').length;
  const responded = intros.filter((i) => i.status === 'accepted' || i.status === 'declined').length;
  const acceptanceRate = responded > 0 ? Math.round((introsAccepted / responded) * 100) : null;

  return {
    companyName: company?.trading_name || company?.legal_name || 'Your company',
    openRoles: (roles ?? []).filter((r) => r.status === 'matching' || r.status === 'shortlisted').length,
    shortlisted,
    introsSent,
    introsAccepted,
    introsExpired,
    teamSize: (team ?? []).length,
    acceptanceRate,
    recentIntros: intros.slice(0, 6).map((i) => ({
      id: i.id,
      status: i.status,
      roleTitle: roleById.get(i.role_id)?.title ?? 'Role',
      roleTier: (roleById.get(i.role_id)?.tier as Tier) ?? 'corporate',
      counterpartyName: i.candidates?.full_name ?? 'Candidate',
      at: i.responded_at ?? i.sent_at,
    })),
    introsByWeek: bucketByWeek(intros.map((i) => i.sent_at)),
  };
}

export async function getCompanyFeed(companyId: string): Promise<FeedItem[]> {
  const { data: roles } = await supabase.from('roles').select('id, title').eq('company_id', companyId);
  const roleIds = (roles ?? []).map((r) => r.id);
  const roleById = new Map((roles ?? []).map((r) => [r.id, r.title]));
  if (roleIds.length === 0) return [];

  const { data: intros } = await supabase
    .from('introductions')
    .select('id, role_id, status, sent_at, responded_at, candidates(full_name)')
    .in('role_id', roleIds)
    .order('sent_at', { ascending: false })
    .limit(40);

  const items: FeedItem[] = [];
  for (const i of (intros ?? []) as any[]) {
    const role = roleById.get(i.role_id) ?? 'a role';
    const who = i.candidates?.full_name ?? 'A candidate';
    if (i.status === 'accepted') {
      items.push({ id: i.id + ':acc', kind: 'intro_accepted', title: `${who} accepted your introduction`, body: `For ${role}. Their contact details are in Connections.`, at: i.responded_at ?? i.sent_at, href: '/(company)/messages' });
    } else if (i.status === 'declined') {
      items.push({ id: i.id + ':dec', kind: 'intro_declined', title: `${who} declined your introduction`, body: `For ${role}. The shortlist seat is free again.`, at: i.responded_at ?? i.sent_at });
    } else if (i.status === 'expired') {
      items.push({ id: i.id + ':exp', kind: 'intro_expired', title: `An introduction expired`, body: `${who} didn't respond in time for ${role}.`, at: i.sent_at });
    } else {
      items.push({ id: i.id + ':snt', kind: 'intro_sent', title: `Introduction sent`, body: `Waiting on ${who} to respond for ${role}.`, at: i.sent_at });
    }
  }
  return items.sort((a, b) => +new Date(b.at) - +new Date(a.at));
}

// ── candidate ──────────────────────────────────────────────────────────
export interface CandidateStats {
  fullName: string;
  introsPending: number;
  introsAccepted: number;
  introsTotal: number;
  verifiedCount: number; // passed verification_records components, 0-4
  profileCompletePct: number; // 0-100
  recentIntros: RecentIntro[];
}

const PROFILE_FIELDS = ['full_name', 'phone', 'location', 'experience_level', 'remote_preference', 'availability_date'];

export async function getCandidateStats(candidateId: string): Promise<CandidateStats> {
  const [{ data: cand }, { data: intros }, { data: vrecs }] = await Promise.all([
    supabase.from('candidates').select('full_name, phone, location, experience_level, remote_preference, availability_date, skill_tags, tier_preferences').eq('id', candidateId).maybeSingle(),
    supabase.from('introductions').select('id, role_id, status, sent_at, responded_at').eq('candidate_id', candidateId).order('sent_at', { ascending: false }),
    supabase.from('verification_records').select('component, status').eq('candidate_id', candidateId),
  ]);

  const introRows = intros ?? [];
  // A candidate can only read a role row via RLS once the introduction is
  // accepted (roles_select_via_accepted_introduction). For still-pending ones
  // the title/tier come from get_introduction_preview (SECURITY DEFINER,
  // company identity stays masked).
  const roleById = new Map<string, { title: string; tier: Tier; company_id: string }>();
  const companyName = new Map<string, string>();

  const acceptedRoleIds = [...new Set(introRows.filter((i) => i.status === 'accepted').map((i) => i.role_id))];
  if (acceptedRoleIds.length > 0) {
    const { data: roles } = await supabase.from('roles').select('id, title, tier, company_id').in('id', acceptedRoleIds);
    for (const r of roles ?? []) roleById.set(r.id, r as any);
    const companyIds = [...new Set((roles ?? []).map((r) => r.company_id))];
    if (companyIds.length > 0) {
      const { data: cos } = await supabase.from('companies').select('id, legal_name, trading_name').in('id', companyIds);
      for (const c of cos ?? []) companyName.set(c.id, (c as any).trading_name || (c as any).legal_name || 'A company');
    }
  }

  const previewByIntro = new Map<string, { title: string; tier: Tier }>();
  await Promise.all(
    introRows
      .filter((i) => i.status !== 'accepted')
      .map(async (i) => {
        const { data } = await supabase.rpc('get_introduction_preview', { p_introduction_id: i.id }).maybeSingle<any>();
        if (data) previewByIntro.set(i.id, { title: data.role_title, tier: data.role_tier });
      }),
  );

  const passed = new Set((vrecs ?? []).filter((v) => v.status === 'passed').map((v) => v.component));

  const populated = PROFILE_FIELDS.filter((f) => {
    const v = (cand as any)?.[f];
    return v !== null && v !== undefined && v !== '';
  }).length;
  const hasSkills = ((cand as any)?.skill_tags ?? []).length > 0 ? 1 : 0;
  const hasTierPref = ((cand as any)?.tier_preferences ?? []).length > 0 ? 1 : 0;
  const profileCompletePct = Math.round(((populated + hasSkills + hasTierPref) / (PROFILE_FIELDS.length + 2)) * 100);

  return {
    fullName: (cand as any)?.full_name ?? 'there',
    introsPending: introRows.filter((i) => i.status === 'sent').length,
    introsAccepted: introRows.filter((i) => i.status === 'accepted').length,
    introsTotal: introRows.length,
    verifiedCount: passed.size,
    profileCompletePct,
    recentIntros: introRows.slice(0, 6).map((i) => {
      const joined = roleById.get(i.role_id);
      const preview = previewByIntro.get(i.id);
      return {
        id: i.id,
        status: i.status,
        roleTitle: joined?.title ?? preview?.title ?? 'A role',
        roleTier: (joined?.tier ?? preview?.tier ?? 'corporate') as Tier,
        counterpartyName: i.status === 'accepted'
          ? companyName.get(joined?.company_id ?? '') ?? 'A company'
          : 'A company',
        at: i.responded_at ?? i.sent_at,
      };
    }),
  };
}

export async function getCandidateFeed(candidateId: string): Promise<FeedItem[]> {
  const stats = await getCandidateStats(candidateId);
  const items: FeedItem[] = [];

  for (const i of stats.recentIntros) {
    if (i.status === 'accepted') {
      items.push({ id: i.id + ':acc', kind: 'intro_accepted', title: `You're connected with ${i.counterpartyName}`, body: `Your introduction for ${i.roleTitle} is confirmed — contact details are in Connections.`, at: i.at, href: '/(candidate)/messages' });
    } else if (i.status === 'declined') {
      items.push({ id: i.id + ':dec', kind: 'intro_declined', title: `You declined an introduction`, body: `For ${i.roleTitle}.`, at: i.at });
    } else if (i.status === 'expired') {
      items.push({ id: i.id + ':exp', kind: 'intro_expired', title: `An introduction expired`, body: `You didn't respond in time for ${i.roleTitle}.`, at: i.at });
    } else {
      items.push({ id: i.id + ':snt', kind: 'intro_sent', title: `A company wants to connect`, body: `Review the introduction for ${i.roleTitle} and respond before it expires.`, at: i.at, href: '/(candidate)/opportunities', actionable: true });
    }
  }

  if (stats.verifiedCount < 4) {
    items.push({
      id: 'verify-prompt',
      kind: 'verify_prompt',
      title: 'Finish verification to get matched',
      body: `${stats.verifiedCount} of 4 components complete. Unverified profiles don't enter matching.`,
      at: new Date(0).toISOString(),
      href: '/(candidate)/verification',
      actionable: true,
    });
  }

  return items.sort((a, b) => +new Date(b.at) - +new Date(a.at));
}

// ── util ───────────────────────────────────────────────────────────────
function bucketByWeek(isoDates: string[]): { label: string; value: number }[] {
  const weeks: { label: string; value: number }[] = [];
  const now = new Date();
  for (let w = 5; w >= 0; w--) {
    const end = new Date(now.getTime() - w * 7 * 864e5);
    const start = new Date(end.getTime() - 7 * 864e5);
    const count = isoDates.filter((d) => {
      const t = new Date(d).getTime();
      return t > start.getTime() && t <= end.getTime();
    }).length;
    weeks.push({ label: w === 0 ? 'now' : `-${w}w`, value: count });
  }
  return weeks;
}

export function relativeTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 0) return '';
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}
