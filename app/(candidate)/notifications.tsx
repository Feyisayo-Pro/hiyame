import { useCallback, useState, useMemo} from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import { useTheme, ThemePalette } from '@/lib/theme';

type AlertType = 'action' | 'info' | 'success';

interface Alert {
  id: string;
  type: AlertType;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const MOCK_ALERTS: Alert[] = [
  {
    id: '1',
    type: 'action',
    icon: 'videocam-outline',
    title: 'Upload Video Introduction',
    body: 'Record and upload your 60-second video introduction to unlock Short-Term roles.',
    time: '2 hours ago',
    read: false,
  },
  {
    id: '2',
    type: 'action',
    icon: 'id-card-outline',
    title: 'Complete Identity Verification',
    body: 'Submit your government-issued ID to begin the verification process.',
    time: '5 hours ago',
    read: false,
  },
  {
    id: '3',
    type: 'info',
    icon: 'shield-checkmark-outline',
    title: 'Verification System Active',
    body: 'Your 4-step verification checklist is ready. Complete all steps to become match-eligible.',
    time: '1 day ago',
    read: true,
  },
  {
    id: '4',
    type: 'success',
    icon: 'person-circle-outline',
    title: 'Profile Created Successfully',
    body: 'Your candidate profile has been initialized. Start verifying to unlock opportunities.',
    time: '1 day ago',
    read: true,
  },
];

function getAlertStyles(type: AlertType, read: boolean, T: ThemePalette) {
  if (!read && type === 'action') return { bg: T.dangerBg, accent: T.danger, iconBg: T.dangerBg };
  if (!read && type === 'info') return { bg: T.accentBg, accent: T.accent, iconBg: T.accentBg20 };
  if (type === 'success') return { bg: T.emeraldBg, accent: T.emerald, iconBg: T.emeraldBg };
  return { bg: T.card, accent: T.textSecondary, iconBg: T.border };
}

export default function CandidateNotificationsScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);

  const [refreshing, setRefreshing] = useState(false);
  const unreadCount = MOCK_ALERTS.filter((a) => !a.read).length;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={st.header}>
        <View style={st.headerLeft}>
          <Ionicons name="notifications" size={22} color={T.accent} />
          <Text style={st.headerTitle}>Alerts</Text>
          {unreadCount > 0 && (
            <View style={st.headerBadge}>
              <Text style={st.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <Pressable style={st.markRead}>
          <Text style={st.markReadText}>Mark all read</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} colors={[T.accent]} />}
      >
        <SwipeFadeContainer>
        {MOCK_ALERTS.map((alert) => {
          const s = getAlertStyles(alert.type, alert.read, T);
          return (
            <Pressable
              key={alert.id}
              style={[st.alertCard, { backgroundColor: s.bg, borderLeftColor: s.accent }]}
              onPress={() => {
                if (alert.type === 'action') router.push('/(candidate)/verification');
              }}
            >
              <View style={st.alertRow}>
                <View style={[st.alertIconWrap, { backgroundColor: s.iconBg }]}>
                  <Ionicons name={alert.icon} size={18} color={s.accent} />
                </View>
                <View style={st.alertContent}>
                  <View style={st.alertTitleRow}>
                    <Text style={st.alertTitle}>{alert.title}</Text>
                    {!alert.read && <View style={st.unreadDot} />}
                  </View>
                  <Text style={st.alertBody}>{alert.body}</Text>
                  <Text style={st.alertTime}>{alert.time}</Text>
                </View>
              </View>
              {alert.type === 'action' && !alert.read && (
                <View style={st.actionRow}>
                  <Ionicons name="arrow-forward-circle" size={16} color={T.danger} />
                  <Text style={st.actionText}>Action Required</Text>
                </View>
              )}
            </Pressable>
          );
        })}
        </SwipeFadeContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: T.textPrimary },
  headerBadge: { backgroundColor: T.danger, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  headerBadgeText: { fontSize: 11, fontWeight: '700', color: T.white },
  markRead: {},
  markReadText: { fontSize: 13, fontWeight: '600', color: T.accent },

  alertCard: { borderRadius: 14, borderLeftWidth: 3, padding: 16, marginTop: 12, borderWidth: 1, borderColor: T.border },
  alertRow: { flexDirection: 'row', gap: 12 },
  alertIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  alertContent: { flex: 1 },
  alertTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  alertTitle: { fontSize: 14, fontWeight: '700', color: T.textPrimary, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.danger },
  alertBody: { fontSize: 13, color: T.textSecondary, lineHeight: 18, marginBottom: 6 },
  alertTime: { fontSize: 11, color: T.textMuted },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.border },
  actionText: { fontSize: 12, fontWeight: '700', color: T.danger },
});
