/**
 * Insights — real pipeline metrics only.
 * Company: roles, shortlisted candidates, introduction funnel, acceptance rate,
 *   introductions per week.
 * Candidate: introduction funnel, verification progress, profile completeness.
 * No fabricated metrics (profile views, search appearances, response times) —
 * none of those are tracked anywhere.
 */
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@/components/Themed';
import AppIcon, { AppIconName } from '@/components/AppIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette, DISPLAY_FONT_FAMILY } from '@/lib/theme';
import { useAuth } from '@/lib/useAuth';
import { getCompanyStats, getCandidateStats, CompanyStats, CandidateStats } from '@/lib/dashboardStats';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import ScreenFrame from '@/components/ScreenFrame';
import { SkeletonBlock, SkeletonCard } from '@/components/Skeleton';
import { FULL_VERIFICATION_THRESHOLD } from '@/lib/verification';
import PageHead from '@/components/PageHead';

type Persona = 'company' | 'candidate';

function BarChart({ data, T, barColor, height = 120 }: {
  data: { label: string; value: number }[]; T: ThemePalette; barColor: string; height?: number;
}) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height, paddingHorizontal: 4 }}>
      {data.map((d, i) => {
        const barH = Math.max((d.value / maxVal) * (height - 24), 4);
        return (
          <View key={i} style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: T.textPrimary, marginBottom: 4 }}>{d.value}</Text>
            <View style={{ width: '58%', height: barH, backgroundColor: barColor, borderRadius: 6, minWidth: 14 }} />
            <Text style={{ fontSize: 9, color: T.textMuted, marginTop: 4, fontWeight: '600' }}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function MetricCard({ icon, label, value, subtitle, color, bg, T }: {
  icon: AppIconName; label: string; value: string | number; subtitle?: string; color: string; bg: string; T: ThemePalette;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: T.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: T.border }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <AppIcon name={icon} size={18} color={color} />
      </View>
      <Text style={{ fontSize: 22, fontWeight: '800', color: T.textPrimary }}>{value}</Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color: T.textSecondary, marginTop: 2 }}>{label}</Text>
      {subtitle ? <Text style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>{subtitle}</Text> : null}
    </View>
  );
}

function FunnelRow({ label, value, of, color, T }: { label: string; value: number; of: number; color: string; T: ThemePalette }) {
  const pct = of > 0 ? Math.round((value / of) * 100) : 0;
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 13, color: T.textPrimary, fontWeight: '600' }}>{label}</Text>
        <Text style={{ fontSize: 13, color: T.textSecondary, fontWeight: '700' }}>{value}</Text>
      </View>
      <View style={{ height: 8, backgroundColor: T.surface, borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: color, width: `${Math.max(pct, value > 0 ? 6 : 0)}%` }} />
      </View>
    </View>
  );
}

function Card({ title, subtitle, children, T, style }: { title: string; subtitle?: string; children: React.ReactNode; T: ThemePalette; style?: object }) {
  return (
    <View style={[{ backgroundColor: T.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: T.border }, style]}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: T.textPrimary }}>{title}</Text>
      {subtitle ? <Text style={{ fontSize: 12, color: T.textSecondary, marginTop: 2, marginBottom: 14 }}>{subtitle}</Text> : <View style={{ height: 14 }} />}
      {children}
    </View>
  );
}

function CompanyAnalytics({ T, stats }: { T: ThemePalette; stats: CompanyStats }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
      <SwipeFadeContainer>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <MetricCard icon="briefcase" label="Open Roles" value={stats.openRoles} color={T.accent} bg={T.accentBg} T={T} />
          <MetricCard icon="people" label="Shortlisted" value={stats.shortlisted} subtitle="Awaiting your review" color={T.indigo} bg={T.indigoBg} T={T} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
          <MetricCard icon="paper-plane" label="Introductions" value={stats.introsSent} color={T.amber} bg={T.amberBg} T={T} />
          <MetricCard
            icon="checkmark-done-circle"
            label="Acceptance"
            value={stats.acceptanceRate === null ? 'N/A' : `${stats.acceptanceRate}%`}
            subtitle={stats.acceptanceRate === null ? 'No responses yet' : `${stats.introsAccepted} accepted`}
            color={T.emerald} bg={T.emeraldBg} T={T}
          />
        </View>

        <Card title="Introduction funnel" T={T} style={{ maxWidth: 480 }}>
          <FunnelRow label="Sent" value={stats.introsSent} of={stats.introsSent} color={T.accent} T={T} />
          <FunnelRow label="Accepted" value={stats.introsAccepted} of={stats.introsSent} color={T.emerald} T={T} />
          <FunnelRow label="Expired" value={stats.introsExpired} of={stats.introsSent} color={T.danger} T={T} />
        </Card>

        <Card title="Introductions per week" subtitle="Sent in each of the last 6 weeks" T={T}>
          <BarChart data={stats.introsByWeek} T={T} barColor={T.accent} />
        </Card>

        <Card title="Team" T={T}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <AppIcon name="people-circle-outline" size={22} color={T.textSecondary} />
            <Text style={{ fontSize: 14, color: T.textPrimary, fontWeight: '600' }}>
              {stats.teamSize} member{stats.teamSize === 1 ? '' : 's'} on this account
            </Text>
          </View>
        </Card>
      </SwipeFadeContainer>
    </ScrollView>
  );
}

function CandidateAnalytics({ T, stats }: { T: ThemePalette; stats: CandidateStats }) {
  const strengthColor = stats.profileCompletePct >= 80 ? T.emerald : T.amber;
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
      <SwipeFadeContainer>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <MetricCard icon="shield-checkmark" label="Verified" value={`${stats.verifiedCount}/4`} subtitle={stats.verifiedCount >= FULL_VERIFICATION_THRESHOLD ? 'Match-ready' : 'Incomplete'} color={T.accent} bg={T.accentBg} T={T} />
          <MetricCard icon="mail-unread" label="To respond" value={stats.introsPending} color={T.amber} bg={T.amberBg} T={T} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
          <MetricCard icon="people" label="Connected" value={stats.introsAccepted} color={T.emerald} bg={T.emeraldBg} T={T} />
          <MetricCard icon="albums" label="Total intros" value={stats.introsTotal} color={T.indigo} bg={T.indigoBg} T={T} />
        </View>

        <Card title="Profile strength" subtitle="A fuller profile scores better in matching" T={T}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, height: 8, backgroundColor: T.surface, borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: strengthColor, width: `${stats.profileCompletePct}%` }} />
            </View>
            <Text style={{ fontSize: 14, fontWeight: '800', color: strengthColor }}>{stats.profileCompletePct}%</Text>
          </View>
        </Card>

        <Card title="Introduction funnel" T={T} style={{ maxWidth: 480 }}>
          <FunnelRow label="Received" value={stats.introsTotal} of={stats.introsTotal} color={T.accent} T={T} />
          <FunnelRow label="Accepted" value={stats.introsAccepted} of={stats.introsTotal} color={T.emerald} T={T} />
          <FunnelRow label="Awaiting your reply" value={stats.introsPending} of={stats.introsTotal} color={T.amber} T={T} />
        </Card>

        {stats.verifiedCount < 4 ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: T.accentBg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: T.accent + '30' }}>
            <AppIcon name="information-circle" size={18} color={T.accent} />
            <Text style={{ flex: 1, fontSize: 13, color: T.textPrimary, lineHeight: 18 }}>
              Unverified profiles don't enter matching. Complete all 4 verification components to start receiving introductions.
            </Text>
          </View>
        ) : null}
      </SwipeFadeContainer>
    </ScrollView>
  );
}

// Previews this screen's real shape (2 rows of metric cards + 2 content
// cards) instead of a bare centered spinner — same reasoning as the
// Skeleton component's own doc comment: the loading state should preview
// the layout, not just say "wait".
function AnalyticsSkeleton() {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <SkeletonCard style={{ flex: 1, height: 96 }} />
        <SkeletonCard style={{ flex: 1, height: 96 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
        <SkeletonCard style={{ flex: 1, height: 96 }} />
        <SkeletonCard style={{ flex: 1, height: 96 }} />
      </View>
      <SkeletonBlock width="100%" height={140} radius={16} style={{ marginBottom: 16 }} />
      <SkeletonBlock width="100%" height={160} radius={16} />
    </View>
  );
}

export default function AnalyticsScreen({ persona = 'company' }: { persona?: Persona }) {
  const T = useTheme();
  const { companyId, candidateId } = useAuth();

  // Real cache + real error state — before this, a failed fetch here left
  // `company`/`candidate` at null forever (the skeleton spins indefinitely,
  // no retry, no distinction between "still loading" and "the request
  // actually failed"). Same de-dupe benefit as Home: tabbing away and back
  // to Insights within 30s reuses the cache instead of refetching.
  const companyQuery = useQuery({
    queryKey: ['companyStats', companyId],
    queryFn: () => getCompanyStats(companyId!),
    enabled: persona === 'company' && !!companyId,
  });
  const candidateQuery = useQuery({
    queryKey: ['candidateStats', candidateId],
    queryFn: () => getCandidateStats(candidateId!),
    enabled: persona === 'candidate' && !!candidateId,
  });
  const { data: company, isError: companyErrored, refetch: refetchCompany } = companyQuery;
  const { data: candidate, isError: candidateErrored, refetch: refetchCandidate } = candidateQuery;

  const ready = persona === 'company' ? company : candidate;
  const errored = persona === 'company' ? companyErrored : candidateErrored;
  const retry = persona === 'company' ? refetchCompany : refetchCandidate;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['top', 'left', 'right']}>
      <PageHead title="Insights" />
      <ScreenFrame>
      <View style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: T.textPrimary, fontFamily: DISPLAY_FONT_FAMILY }}>Insights</Text>
        <Text style={{ fontSize: 12, color: T.textSecondary }}>
          {persona === 'company' ? 'Your hiring pipeline' : 'Your introductions & profile'}
        </Text>
      </View>

      {errored ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 }}>
          <AppIcon name="cloud-offline-outline" size={28} color={T.textMuted} />
          <Text style={{ fontSize: 14, color: T.textSecondary, textAlign: 'center' }}>Couldn't load your insights.</Text>
          <Pressable onPress={() => retry()} style={{ backgroundColor: T.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}>
            <Text style={{ color: T.textOnAccent, fontWeight: '700', fontSize: 13 }}>Retry</Text>
          </Pressable>
        </View>
      ) : !ready ? (
        <AnalyticsSkeleton />
      ) : persona === 'company' ? (
        <CompanyAnalytics T={T} stats={company as CompanyStats} />
      ) : (
        <CandidateAnalytics T={T} stats={candidate as CandidateStats} />
      )}
      </ScreenFrame>
    </SafeAreaView>
  );
}
