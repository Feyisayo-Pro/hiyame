import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import { useTheme, ThemePalette, DISPLAY_FONT_FAMILY } from '@/lib/theme';
import PageHead from '@/components/PageHead';

// Scheduling assessment interviews (Hiyame's internal team running a real
// skills-assessment session with a candidate, not the old auto-graded quiz)
// is the next phase of the admin rework — this tab exists now so the nav is
// complete, filled in once the assessment_interviews table + API land.
export default function AdminInterviewsScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <PageHead title="Assessment Interviews" />
      <View style={st.header}>
        <Text style={st.headerTitle}>Assessment Interviews</Text>
        <Text style={st.headerSub}>Scheduling for skills-assessment sessions</Text>
      </View>
      <View style={st.centerFill}>
        <View style={st.iconWrap}>
          <AppIcon name="calendar-outline" size={24} color={T.textMuted} />
        </View>
        <Text style={st.comingTitle}>Coming next</Text>
        <Text style={st.comingSub}>
          Scheduling real assessment-interview sessions with candidates is being built next — for now, mark a
          skills-assessment request passed or failed directly from the Candidates tab.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: T.textPrimary, fontFamily: DISPLAY_FONT_FAMILY },
  headerSub: { fontSize: 13, color: T.textMuted, marginTop: 2 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  iconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  comingTitle: { fontSize: 15, fontWeight: '700', color: T.textPrimary },
  comingSub: { fontSize: 13, color: T.textSecondary, textAlign: 'center', lineHeight: 19 },
});
