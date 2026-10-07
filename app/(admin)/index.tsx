import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import AppIcon, { AppIconName } from '@/components/AppIcon';
import AnimatedPressable from '@/components/AnimatedPressable';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import { useTheme, ThemePalette, DISPLAY_FONT_FAMILY } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import PageHead from '@/components/PageHead';

interface Overview {
  candidates: { pending: number; approved: number; rejected: number };
  companies: { pending: number; approved: number; rejected: number };
  assessmentRequests: number;
  cvReviewRequests: number;
  videoReviewRequests: number;
}

async function authedFetch(path: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(path, { headers: { Authorization: `Bearer ${token}` } });
}

export default function AdminOverviewScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const resp = await authedFetch('/api/admin-review?view=overview');
    if (resp.ok) setOverview(await resp.json());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={st.container}>
        <View style={st.centerFill}><ActivityIndicator color={T.accent} /></View>
      </SafeAreaView>
    );
  }

  const totalPending = (overview?.candidates.pending ?? 0) + (overview?.companies.pending ?? 0) + (overview?.assessmentRequests ?? 0) + (overview?.cvReviewRequests ?? 0) + (overview?.videoReviewRequests ?? 0);

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <PageHead title="Admin Overview" />
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        <SwipeFadeContainer axis="y" offset={16}>
          <Text style={st.headerTitle}>Overview</Text>
          <Text style={st.headerSub}>
            {totalPending === 0 ? 'Nothing waiting on review right now.' : `${totalPending} item${totalPending === 1 ? '' : 's'} waiting on review.`}
          </Text>
        </SwipeFadeContainer>

        <SwipeFadeContainer axis="y" offset={16} delay={200}>
          <StatCard
            T={T} st={st} icon="person-outline" colorKey="indigo" bgKey="indigoBg"
            title="Candidates"
            pending={overview?.candidates.pending ?? 0}
            approved={overview?.candidates.approved ?? 0}
            rejected={overview?.candidates.rejected ?? 0}
            onPress={() => router.push({ pathname: '/(admin)/candidates', params: { status: 'pending' } })}
          />
          <StatCard
            T={T} st={st} icon="business-outline" colorKey="accent" bgKey="accentBg"
            title="Companies"
            pending={overview?.companies.pending ?? 0}
            approved={overview?.companies.approved ?? 0}
            rejected={overview?.companies.rejected ?? 0}
            onPress={() => router.push({ pathname: '/(admin)/companies', params: { status: 'pending' } })}
          />
          <AnimatedPressable
            style={st.assessmentCard}
            onPress={() => router.push({ pathname: '/(admin)/candidates', params: { component: 'skills_assessment' } })}
          >
            <View style={[st.statIconWrap, { backgroundColor: T.amberBg }]}>
              <AppIcon name="shield-checkmark-outline" size={18} color={T.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.statTitle}>Skills Assessment Requests</Text>
              <Text style={st.statMeta}>{overview?.assessmentRequests ?? 0} awaiting internal review</Text>
            </View>
            <AppIcon name="chevron-forward" size={18} color={T.textMuted} />
          </AnimatedPressable>
          <AnimatedPressable
            style={st.assessmentCard}
            onPress={() => router.push({ pathname: '/(admin)/candidates', params: { component: 'cv_review' } })}
          >
            <View style={[st.statIconWrap, { backgroundColor: T.indigoBg }]}>
              <AppIcon name="document-text-outline" size={18} color={T.indigo} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.statTitle}>CV Review Requests</Text>
              <Text style={st.statMeta}>{overview?.cvReviewRequests ?? 0} awaiting internal review</Text>
            </View>
            <AppIcon name="chevron-forward" size={18} color={T.textMuted} />
          </AnimatedPressable>
          <AnimatedPressable
            style={st.assessmentCard}
            onPress={() => router.push({ pathname: '/(admin)/candidates', params: { component: 'video_intro' } })}
          >
            <View style={[st.statIconWrap, { backgroundColor: T.accentBg }]}>
              <AppIcon name="videocam-outline" size={18} color={T.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.statTitle}>Video Review Requests</Text>
              <Text style={st.statMeta}>{overview?.videoReviewRequests ?? 0} awaiting internal review</Text>
            </View>
            <AppIcon name="chevron-forward" size={18} color={T.textMuted} />
          </AnimatedPressable>
        </SwipeFadeContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ T, st, icon, colorKey, bgKey, title, pending, approved, rejected, onPress }: {
  T: ThemePalette; st: ReturnType<typeof makeStyles>; icon: AppIconName;
  colorKey: 'accent' | 'indigo'; bgKey: 'accentBg' | 'indigoBg';
  title: string; pending: number; approved: number; rejected: number; onPress: () => void;
}) {
  return (
    <AnimatedPressable style={st.statCard} onPress={onPress}>
      <View style={st.statCardHeader}>
        <View style={[st.statIconWrap, { backgroundColor: T[bgKey] }]}>
          <AppIcon name={icon} size={18} color={T[colorKey]} />
        </View>
        <Text style={st.statTitle}>{title}</Text>
        <AppIcon name="chevron-forward" size={18} color={T.textMuted} />
      </View>
      <View style={st.statRow}>
        <View style={st.statCell}>
          <Text style={[st.statNumber, { color: T.amber }]}>{pending}</Text>
          <Text style={st.statLabel}>Pending</Text>
        </View>
        <View style={st.statCell}>
          <Text style={[st.statNumber, { color: T.emerald }]}>{approved}</Text>
          <Text style={st.statLabel}>Approved</Text>
        </View>
        <View style={st.statCell}>
          <Text style={[st.statNumber, { color: T.danger }]}>{rejected}</Text>
          <Text style={st.statLabel}>Rejected</Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: T.textPrimary, fontFamily: DISPLAY_FONT_FAMILY, letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: T.textSecondary, marginTop: 4, marginBottom: 22 },

  statCard: {
    backgroundColor: T.card, borderRadius: 16, borderWidth: 1, borderColor: T.border,
    padding: 16, marginBottom: 12,
  },
  statCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  statIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: T.textPrimary },
  statMeta: { fontSize: 12, color: T.textSecondary, marginTop: 2 },
  statRow: { flexDirection: 'row' },
  statCell: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', color: T.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },

  assessmentCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: T.card, borderRadius: 16, borderWidth: 1, borderColor: T.border,
    padding: 16,
  },
});
