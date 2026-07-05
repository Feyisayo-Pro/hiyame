/**
 * AnalyticsScreen -- dual-persona analytics dashboard.
 * Company: talent visibility, profiles reviewed, match conversion, response rates.
 * Candidate: profile strength, views, match metrics, search appearances.
 */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette } from '@/lib/theme';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';

type Persona = 'company' | 'candidate';

// == Bar Chart Component ==

function BarChart({
  data,
  T,
  barColor,
  height = 120,
}: {
  data: { label: string; value: number }[];
  T: ThemePalette;
  barColor: string;
  height?: number;
}) {
  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height, paddingHorizontal: 4 }}>
      {data.map((d, i) => {
        const barH = Math.max((d.value / maxVal) * (height - 24), 4);
        return (
          <View key={i} style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: T.textPrimary, marginBottom: 4 }}>{d.value}</Text>
            <View style={{ width: '60%', height: barH, backgroundColor: barColor, borderRadius: 6, minWidth: 16 }} />
            <Text style={{ fontSize: 9, color: T.textMuted, marginTop: 4, fontWeight: '600' }}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// == Progress Ring (simplified as a progress bar) ==

function ProgressRing({ value, maxValue, label, color, T }: { value: number; maxValue: number; label: string; color: string; T: ThemePalette }) {
  const pct = Math.min((value / maxValue) * 100, 100);
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 4, borderColor: T.surface, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <View style={{ position: 'absolute', width: 56, height: 56, borderRadius: 28, borderWidth: 4, borderColor: color, borderTopColor: pct > 25 ? color : 'transparent', borderRightColor: pct > 50 ? color : 'transparent', borderBottomColor: pct > 75 ? color : 'transparent', borderLeftColor: pct > 0 ? color : 'transparent' }} />
        <Text style={{ fontSize: 14, fontWeight: '800', color: T.textPrimary }}>{value}</Text>
      </View>
      <Text style={{ fontSize: 10, fontWeight: '600', color: T.textMuted, marginTop: 6, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

// == Metric Card ==

function MetricCard({ icon, label, value, subtitle, color, bg, T }: {
  icon: string; label: string; value: string | number; subtitle?: string; color: string; bg: string; T: ThemePalette;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: T.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: T.border }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={{ fontSize: 22, fontWeight: '800', color: T.textPrimary }}>{value}</Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color: T.textSecondary, marginTop: 2 }}>{label}</Text>
      {subtitle && <Text style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>{subtitle}</Text>}
    </View>
  );
}

// == Company Analytics ==

function CompanyAnalytics({ T }: { T: ThemePalette }) {
  const weeklyData = [
    { label: 'Mon', value: 12 },
    { label: 'Tue', value: 18 },
    { label: 'Wed', value: 25 },
    { label: 'Thu', value: 15 },
    { label: 'Fri', value: 30 },
    { label: 'Sat', value: 8 },
    { label: 'Sun', value: 5 },
  ];

  const conversionData = [
    { label: 'Wk 1', value: 12 },
    { label: 'Wk 2', value: 18 },
    { label: 'Wk 3', value: 22 },
    { label: 'Wk 4', value: 28 },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
      <SwipeFadeContainer>
        {/* Top Metrics */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <MetricCard icon="eye" label="Profile Views" value={342} subtitle="+18% this week" color={T.accent} bg={T.accentBg} T={T} />
          <MetricCard icon="swap-horizontal" label="Reviewed" value={89} subtitle="This month" color={T.indigo} bg={T.indigoBg} T={T} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
          <MetricCard icon="heart" label="Match Rate" value="32%" subtitle="Industry avg: 24%" color={T.emerald} bg={T.emeraldBg} T={T} />
          <MetricCard icon="chatbubbles" label="Response" value="87%" subtitle="Avg 2.4hr reply" color={T.amber} bg={T.amberBg} T={T} />
        </View>

        {/* Weekly Talent Visibility */}
        <View style={{ backgroundColor: T.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: T.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: T.textPrimary }}>Talent Visibility</Text>
              <Text style={{ fontSize: 12, color: T.textSecondary }}>Profiles that viewed your roles this week</Text>
            </View>
            <View style={{ backgroundColor: T.emeraldBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: T.emerald }}>+18%</Text>
            </View>
          </View>
          <BarChart data={weeklyData} T={T} barColor={T.accent} />
        </View>

        {/* Match Conversion */}
        <View style={{ backgroundColor: T.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: T.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: T.textPrimary }}>Match Conversions</Text>
              <Text style={{ fontSize: 12, color: T.textSecondary }}>Matches progressing to interviews</Text>
            </View>
            <View style={{ backgroundColor: T.accentBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: T.accent }}>32%</Text>
            </View>
          </View>
          <BarChart data={conversionData} T={T} barColor={T.emerald} />
        </View>

        {/* Pipeline Summary */}
        <View style={{ backgroundColor: T.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: T.border }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: T.textPrimary, marginBottom: 16 }}>Pipeline Summary</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <ProgressRing value={12} maxValue={50} label="Matched" color={T.accent} T={T} />
            <ProgressRing value={5} maxValue={12} label="Interviewing" color={T.indigo} T={T} />
            <ProgressRing value={2} maxValue={5} label="Offers Sent" color={T.amber} T={T} />
            <ProgressRing value={1} maxValue={2} label="Hired" color={T.emerald} T={T} />
          </View>
        </View>
      </SwipeFadeContainer>
    </ScrollView>
  );
}

// == Candidate Analytics ==

function CandidateAnalytics({ T }: { T: ThemePalette }) {
  const searchData = [
    { label: 'Mon', value: 8 },
    { label: 'Tue', value: 14 },
    { label: 'Wed', value: 11 },
    { label: 'Thu', value: 19 },
    { label: 'Fri', value: 22 },
    { label: 'Sat', value: 6 },
    { label: 'Sun', value: 3 },
  ];

  // Profile strength breakdown
  const strengthItems = [
    { label: 'Profile Photo', done: true },
    { label: 'Professional Title', done: true },
    { label: 'Skills (5+)', done: true },
    { label: 'Work Experience', done: true },
    { label: 'ID Verification', done: false },
    { label: 'Portfolio Links', done: false },
  ];
  const strengthPct = Math.round((strengthItems.filter(s => s.done).length / strengthItems.length) * 100);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
      <SwipeFadeContainer>
        {/* Profile Strength */}
        <View style={{ backgroundColor: T.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: T.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: T.textPrimary }}>Profile Strength</Text>
              <Text style={{ fontSize: 12, color: T.textSecondary }}>Complete your profile to get more matches</Text>
            </View>
            <View style={{ backgroundColor: strengthPct >= 80 ? T.emeraldBg : T.amberBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: strengthPct >= 80 ? T.emerald : T.amber }}>{strengthPct}%</Text>
            </View>
          </View>
          {/* Progress bar */}
          <View style={{ height: 8, backgroundColor: T.surface, borderRadius: 4, marginBottom: 12 }}>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: strengthPct >= 80 ? T.emerald : T.amber, width: (strengthPct + '%') as any }} />
          </View>
          {/* Checklist */}
          {strengthItems.map((item) => (
            <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
              <Ionicons name={item.done ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={item.done ? T.emerald : T.textMuted} />
              <Text style={{ fontSize: 13, color: item.done ? T.textPrimary : T.textMuted, fontWeight: item.done ? '500' : '400' }}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Top Metrics */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <MetricCard icon="eye" label="Profile Views" value={156} subtitle="+23% this week" color={T.accent} bg={T.accentBg} T={T} />
          <MetricCard icon="heart" label="Matches" value={8} subtitle="3 new this week" color={T.emerald} bg={T.emeraldBg} T={T} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
          <MetricCard icon="search" label="Appearances" value={47} subtitle="In search results" color={T.indigo} bg={T.indigoBg} T={T} />
          <MetricCard icon="briefcase" label="Applied" value={5} subtitle="2 in review" color={T.amber} bg={T.amberBg} T={T} />
        </View>

        {/* Search Appearances Chart */}
        <View style={{ backgroundColor: T.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: T.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: T.textPrimary }}>Search Appearances</Text>
              <Text style={{ fontSize: 12, color: T.textSecondary }}>How often you appear in employer searches</Text>
            </View>
            <View style={{ backgroundColor: T.emeraldBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: T.emerald }}>+23%</Text>
            </View>
          </View>
          <BarChart data={searchData} T={T} barColor={T.accent} />
        </View>

        {/* Match Activity */}
        <View style={{ backgroundColor: T.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: T.border }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: T.textPrimary, marginBottom: 16 }}>Match Activity</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <ProgressRing value={8} maxValue={20} label="Matches" color={T.accent} T={T} />
            <ProgressRing value={3} maxValue={8} label="In Chat" color={T.indigo} T={T} />
            <ProgressRing value={1} maxValue={3} label="Interviews" color={T.amber} T={T} />
            <ProgressRing value={1} maxValue={1} label="Offers" color={T.emerald} T={T} />
          </View>
        </View>
      </SwipeFadeContainer>
    </ScrollView>
  );
}

// == Main Export ==

export default function AnalyticsScreen({ persona = 'company' }: { persona?: Persona }) {
  const T = useTheme();
  const [tab, setTab] = useState<'overview' | 'pipeline'>('overview');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border }}>
        <View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: T.textPrimary }}>Analytics</Text>
          <Text style={{ fontSize: 12, color: T.textSecondary }}>
            {persona === 'company' ? 'Hiring performance metrics' : 'Your career insights'}
          </Text>
        </View>
        <View style={{ backgroundColor: T.accentBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="trending-up" size={16} color={T.accent} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: T.accent }}>This Week</Text>
        </View>
      </View>

      {persona === 'company' ? <CompanyAnalytics T={T} /> : <CandidateAnalytics T={T} />}
    </SafeAreaView>
  );
}
