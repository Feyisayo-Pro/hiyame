import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import { useTheme, ThemePalette, DISPLAY_FONT_FAMILY } from '@/lib/theme';
import PageHead from '@/components/PageHead';

// Not built yet, deliberately — the user's own CRM is a separate system
// they'll connect later. This screen exists now so the nav entry and route
// are real; wiring it up is just plugging a real export/sync call where
// this placeholder sits once that CRM's API details are available.
export default function AdminCrmScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <PageHead title="CRM Sync" />
      <View style={st.header}>
        <Text style={st.headerTitle}>CRM Sync</Text>
        <Text style={st.headerSub}>Export candidate and company data to an external CRM</Text>
      </View>
      <View style={st.centerFill}>
        <View style={st.iconWrap}>
          <AppIcon name="sync-circle" size={24} color={T.textMuted} />
        </View>
        <Text style={st.comingTitle}>Coming soon</Text>
        <Text style={st.comingSub}>
          This will push candidate and company records straight to your CRM once it's connected — approvals,
          profile data, and verification status kept in sync automatically.
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
