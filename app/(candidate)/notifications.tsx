import { useCallback, useState, useMemo, useEffect } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import ScreenFrame from '@/components/ScreenFrame';
import { useTheme, ThemePalette } from '@/lib/theme';
import { useAuth } from '@/lib/useAuth';
import { getCandidateFeed, FeedItem, relativeTime } from '@/lib/dashboardStats';

const ICON: Record<FeedItem['kind'], keyof typeof Ionicons.glyphMap> = {
  intro_sent: 'mail-unread-outline',
  intro_accepted: 'people-outline',
  intro_declined: 'close-circle-outline',
  intro_expired: 'time-outline',
  verify_prompt: 'shield-checkmark-outline',
};

function tone(item: FeedItem, T: ThemePalette) {
  if (item.actionable) return { accent: T.accent, bg: T.accentBg, iconBg: T.accentBg20 };
  if (item.kind === 'intro_accepted') return { accent: T.emerald, bg: T.emeraldBg, iconBg: T.emeraldBg };
  if (item.kind === 'intro_expired') return { accent: T.danger, bg: T.dangerBg, iconBg: T.dangerBg };
  return { accent: T.textSecondary, bg: T.card, iconBg: T.surface };
}

export default function CandidateNotificationsScreen() {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const { candidateId } = useAuth();

  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!candidateId) { setItems([]); return; }
    setItems(await getCandidateFeed(candidateId));
  }, [candidateId]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const actionable = (items ?? []).filter((i) => i.actionable).length;

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <ScreenFrame>
      <View style={st.header}>
        <View style={st.headerLeft}>
          <Ionicons name="notifications" size={22} color={T.accent} />
          <Text style={st.headerTitle}>Alerts</Text>
          {actionable > 0 && (
            <View style={st.headerBadge}><Text style={st.headerBadgeText}>{actionable}</Text></View>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} colors={[T.accent]} />}
      >
        {items === null ? (
          <View style={st.empty}><ActivityIndicator color={T.accent} /></View>
        ) : items.length === 0 ? (
          <View style={st.empty}>
            <Ionicons name="notifications-outline" size={28} color={T.textMuted} />
            <Text style={st.emptyText}>Nothing yet. Introductions and verification updates show up here.</Text>
          </View>
        ) : (
          <SwipeFadeContainer>
            {items.map((item) => {
              const s = tone(item, T);
              return (
                <Pressable
                  key={item.id}
                  style={[st.card, { backgroundColor: s.bg, borderLeftColor: s.accent }]}
                  onPress={() => { if (item.href) router.push(item.href as any); }}
                >
                  <View style={st.row}>
                    <View style={[st.iconWrap, { backgroundColor: s.iconBg }]}>
                      <Ionicons name={ICON[item.kind]} size={18} color={s.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.title}>{item.title}</Text>
                      <Text style={st.body}>{item.body}</Text>
                      {item.at && new Date(item.at).getTime() > 0 ? (
                        <Text style={st.time}>{relativeTime(item.at)}</Text>
                      ) : null}
                    </View>
                  </View>
                  {item.actionable && (
                    <View style={st.actionRow}>
                      <Ionicons name="arrow-forward-circle" size={16} color={s.accent} />
                      <Text style={[st.actionText, { color: s.accent }]}>Action needed</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </SwipeFadeContainer>
        )}
      </ScrollView>
      </ScreenFrame>
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
  empty: { alignItems: 'center', gap: 10, paddingTop: 64, paddingHorizontal: 24 },
  emptyText: { fontSize: 13, color: T.textMuted, textAlign: 'center', lineHeight: 18 },
  card: { borderRadius: 14, borderLeftWidth: 3, padding: 16, marginTop: 12, borderWidth: 1, borderColor: T.border },
  row: { flexDirection: 'row', gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: T.textPrimary, marginBottom: 4 },
  body: { fontSize: 13, color: T.textSecondary, lineHeight: 18, marginBottom: 6 },
  time: { fontSize: 11, color: T.textMuted },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.border },
  actionText: { fontSize: 12, fontWeight: '700' },
});
