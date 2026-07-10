import React, { useMemo, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme, useThemeToggle, ThemePalette } from '@/lib/theme';
import { useSwipeStore, SwipeMatch } from '@/lib/swipeStore';
import { useSubscription } from '@/lib/subscriptionStore';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import { Text } from '@/components/Themed';

// ── Helpers ──

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function timeSince(dateIso: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateIso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + 'm ago';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + 'h ago';
  const days = Math.floor(hours / 24);
  if (days < 7) return days + 'd ago';
  const weeks = Math.floor(days / 7);
  return weeks + 'w ago';
}

type StatusMeta = { label: string; color: string; bg: string };

function getStatusMeta(status: SwipeMatch['status'], T: ThemePalette): StatusMeta {
  switch (status) {
    case 'new': return { label: 'NEW', color: T.emerald, bg: T.emeraldBg };
    case 'pending': return { label: 'PENDING', color: T.amber, bg: T.amberBg };
    case 'in_conversation': return { label: 'IN CONVERSATION', color: T.indigo, bg: T.indigoBg };
    case 'hired': return { label: 'HIRED', color: T.accent, bg: T.accentBg };
    default: return { label: status, color: T.textSecondary, bg: T.surface };
  }
}

// ── Config Modal ──

function ConfigModal({ visible, onClose, T }: { visible: boolean; onClose: () => void; T: ThemePalette }) {
  const { mode, toggleTheme } = useThemeToggle();
  const { config, tier } = useSubscription();
  const router = useRouter();

  const sections = [
    {
      title: 'ACCOUNT',
      items: [
        { icon: 'person-outline', label: 'Edit Profile', desc: 'Update company name, email, industry', onPress: () => { onClose(); router.push('/(company)/profile'); } },
        { icon: 'card-outline', label: 'Subscription & Billing', desc: config.name + ' Plan · Tap to manage', onPress: () => { onClose(); router.push('/(company)/subscriptions'); } },
        { icon: 'people-outline', label: 'Team Members', desc: 'Manage hiring managers', onPress: () => { onClose(); router.push('/(company)/team'); } },
      ],
    },
    {
      title: 'SUPPORT',
      items: [
        { icon: 'help-circle-outline', label: 'Help Center', onPress: () => {} },
        { icon: 'chatbubble-outline', label: 'Contact Support', onPress: () => {} },
        { icon: 'document-text-outline', label: 'Terms of Service', onPress: () => {} },
        { icon: 'shield-outline', label: 'Privacy Policy', onPress: () => {} },
      ],
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: T.overlay }}>
        <Pressable style={{ height: 60 }} onPress={onClose} />
        <View style={{ flex: 1, backgroundColor: T.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
            {/* Handle + Header */}
            <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: T.border }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: T.textPrimary }}>Settings</Text>
              <Pressable onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={20} color={T.textPrimary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Current Plan Banner */}
              <View style={{ marginHorizontal: 20, backgroundColor: T.accentBg, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: T.accent + '30' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialCommunityIcons name="crown-outline" size={18} color={T.accent} />
                    <Text style={{ fontSize: 16, fontWeight: '800', color: T.accent }}>{config.name} Plan</Text>
                  </View>
                  <View style={{ backgroundColor: T.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: T.textOnAccent }}>ACTIVE</Text>
                  </View>
                </View>
              </View>

              {/* Theme Toggle */}
              <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: T.border }}>
                  <Ionicons name={mode === 'light' ? 'sunny-outline' : 'moon-outline'} size={20} color={T.textSecondary} />
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: T.textPrimary }}>Dark Mode</Text>
                  <Switch value={mode === 'dark'} onValueChange={toggleTheme} trackColor={{ false: T.surface, true: T.accent }} thumbColor={T.white} />
                </View>
              </View>

              {/* Sections */}
              {sections.map((section) => (
                <View key={section.title} style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: T.textMuted, paddingHorizontal: 20, marginBottom: 8, letterSpacing: 0.3 }}>{section.title}</Text>
                  <View style={{ backgroundColor: T.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.border }}>
                    {section.items.map((item, i) => (
                      <Pressable
                        key={item.label}
                        onPress={item.onPress}
                        style={({ pressed }) => ({
                          flexDirection: 'row', alignItems: 'center', gap: 12,
                          paddingVertical: 14, paddingHorizontal: 16,
                          backgroundColor: pressed ? T.surfaceHover : 'transparent',
                          borderBottomWidth: i < section.items.length - 1 ? 1 : 0,
                          borderBottomColor: T.border,
                        })}
                      >
                        <Ionicons name={item.icon as any} size={20} color={T.textSecondary} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: T.textPrimary }}>{item.label}</Text>
                          {'desc' in item && item.desc ? <Text style={{ fontSize: 12, color: T.textSecondary, marginTop: 1 }}>{item.desc}</Text> : null}
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={T.textMuted} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}

              {/* Sign Out */}
              <Pressable
                onPress={() => { onClose(); router.replace('/(auth)/welcome'); }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginHorizontal: 20 }}
              >
                <Ionicons name="log-out-outline" size={18} color={T.danger} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: T.danger }}>Sign Out</Text>
              </Pressable>

              <View style={{ alignItems: 'center', paddingTop: 8 }}>
                <Text style={{ fontSize: 11, color: T.textMuted }}>hiyame v1.0.0</Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

// ── Screen ──

export default function CompanyDashboardScreen() {
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const router = useRouter();
  const { matches, metrics } = useSwipeStore();
  const { tier, config, trialDaysLeft } = useSubscription();
  const [showConfig, setShowConfig] = useState(false);

  const greeting = useMemo(() => getGreeting(), []);
  const showUpgradeBar = tier === 'scout' || tier === 'hire';

  const metricCards = [
    { key: 'swiped', label: 'Profiles Swiped', value: metrics.profilesSwiped, icon: 'swap-horizontal' as const, color: T.accent, bg: T.accentBg },
    { key: 'matches', label: 'Active Matches', value: metrics.activeMatches, icon: 'heart' as const, color: T.emerald, bg: T.emeraldBg },
    { key: 'conversation', label: 'In Conversation', value: metrics.inConversation, icon: 'chatbubbles' as const, color: T.indigo, bg: T.indigoBg },
    { key: 'hired', label: 'Hired', value: metrics.hired, icon: 'checkmark-done-circle' as const, color: T.amber, bg: T.amberBg },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SwipeFadeContainer direction="left" triggerKey="header">
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.companyName}>Vertex Global</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.planBadge}>
                <MaterialCommunityIcons name="crown-outline" size={14} color={T.accent} style={{ marginRight: 4 }} />
                <Text style={styles.planBadgeText}>{config.name}</Text>
              </View>
              <Pressable onPress={() => setShowConfig(true)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="settings-outline" size={20} color={T.textSecondary} />
              </Pressable>
            </View>
          </View>
        </SwipeFadeContainer>

        {/* Active plan banner */}
        <SwipeFadeContainer direction="left" triggerKey="planBanner" delay={150}>
          <Pressable
            style={({ pressed }) => [styles.planBanner, pressed && styles.planBannerPressed]}
            onPress={() => router.push('/(company)/subscriptions')}
          >
            <View style={styles.planBannerIconWrap}>
              <MaterialCommunityIcons name="crown-outline" size={20} color={T.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.planBannerTitle}>Active Plan: {config.name}</Text>
              <Text style={styles.planBannerSubtitle}>Tap to view or upgrade your subscription</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={T.accent} />
          </Pressable>
        </SwipeFadeContainer>

        {/* Subscription status bar */}
        {showUpgradeBar && (
          <SwipeFadeContainer direction="left" triggerKey="statusbar" delay={180}>
            <View style={styles.statusBar}>
              <View style={styles.statusBarLeft}>
                <Ionicons name="time-outline" size={16} color={T.accent} />
                <Text style={styles.statusBarText}>
                  {trialDaysLeft > 0 ? trialDaysLeft + ' day' + (trialDaysLeft === 1 ? '' : 's') + ' left in trial' : 'Trial ended'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setShowConfig(true); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.upgradeLink}>Upgrade</Text>
              </TouchableOpacity>
            </View>
          </SwipeFadeContainer>
        )}

        {/* Metrics Grid */}
        <SwipeFadeContainer direction="left" triggerKey="metrics" delay={210}>
          <View style={styles.metricsGrid}>
            {metricCards.map((m) => (
              <View key={m.key} style={styles.metricCard}>
                <View style={[styles.metricIconWrap, { backgroundColor: m.bg }]}>
                  <Ionicons name={m.icon} size={20} color={m.color} />
                </View>
                <Text style={styles.metricValue}>{m.value}</Text>
                <Text style={styles.metricLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
        </SwipeFadeContainer>

        {/* Recent Matches */}
        <SwipeFadeContainer direction="left" triggerKey="matches" delay={240}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Matches</Text>
            <TouchableOpacity onPress={() => router.push('/(company)/matches' as any)}>
              <Text style={styles.sectionLink}>See all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.matchesList}>
            {matches.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={28} color={T.textMuted} />
                <Text style={styles.emptyStateText}>No matches yet</Text>
              </View>
            ) : (
              matches.slice(0, 6).map((match) => {
                const statusMeta = getStatusMeta(match.status, T);
                return (
                  <Pressable
                    key={match.candidateId + '-' + match.matchedAt}
                    style={({ pressed }) => [styles.matchRow, pressed && styles.matchRowPressed]}
                    onPress={() => router.push('/(company)/matches' as any)}
                  >
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarInitials}>{match.candidateInitials}</Text>
                    </View>
                    <View style={styles.matchInfo}>
                      <Text style={styles.matchName} numberOfLines={1}>{match.candidateName}</Text>
                      <Text style={styles.matchTitle} numberOfLines={1}>{match.candidateTitle}</Text>
                    </View>
                    <View style={styles.matchMeta}>
                      <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                      </View>
                      <Text style={styles.matchTime}>{timeSince(match.matchedAt)}</Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </SwipeFadeContainer>

        {/* Quick Actions */}
        <SwipeFadeContainer direction="left" triggerKey="actions" delay={270}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/(company)/roles')} activeOpacity={0.85}>
              <View style={[styles.quickActionIconWrap, { backgroundColor: T.accentBg }]}>
                <Ionicons name="albums-outline" size={22} color={T.accent} />
              </View>
              <Text style={styles.quickActionTitle}>Review Candidates</Text>
              <Text style={styles.quickActionSubtitle}>Discover new talent</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/(company)/messages')} activeOpacity={0.85}>
              <View style={[styles.quickActionIconWrap, { backgroundColor: T.indigoBg }]}>
                <Ionicons name="chatbubbles-outline" size={22} color={T.indigo} />
              </View>
              <Text style={styles.quickActionTitle}>Open Chat</Text>
              <Text style={styles.quickActionSubtitle}>Message matches</Text>
            </TouchableOpacity>
          </View>
        </SwipeFadeContainer>

        {/* ATS / HRMS Integration & Developer Webhooks — Enterprise-gated */}
        <SwipeFadeContainer direction="left" triggerKey="ats-gate" delay={300}>
          <Text style={styles.sectionTitle}>Enterprise Tools</Text>
          <Pressable
            disabled={tier === 'scale'}
            onPress={() => router.push('/(company)/subscriptions')}
            style={styles.atsGateWrap}
          >
            <View style={[styles.atsRow, tier !== 'scale' && styles.atsRowLocked]} pointerEvents={tier !== 'scale' ? 'none' : 'auto'}>
              <View style={styles.atsIconWrap}>
                <MaterialCommunityIcons name="sync-circle" size={20} color={T.emerald} />
              </View>
              <View style={styles.atsTextBlock}>
                <Text style={styles.atsTitle}>ATS / HRMS Integration</Text>
                <Text style={styles.atsSubtitle}>Sync candidates & webhooks with your ATS</Text>
              </View>
              <View style={styles.atsToggle}>
                <View style={styles.atsToggleTrack}>
                  <View style={styles.atsToggleThumb} />
                </View>
              </View>
            </View>
            {tier !== 'scale' && (
              <View style={styles.enterpriseRibbon}>
                <Ionicons name="lock-closed" size={11} color={T.textOnAccent} />
                <Text style={styles.enterpriseRibbonText}>ENTERPRISE TIER ONLY</Text>
              </View>
            )}
          </Pressable>
        </SwipeFadeContainer>

        {/* Scale tier extras */}
        {tier === 'scale' && (
          <SwipeFadeContainer direction="left" triggerKey="scale-extras" delay={330}>
            <TouchableOpacity style={styles.talentPoolsCard} activeOpacity={0.85}>
              <View style={[styles.quickActionIconWrap, { backgroundColor: T.amberBg }]}>
                <MaterialCommunityIcons name="account-group-outline" size={22} color={T.amber} />
              </View>
              <View style={styles.talentPoolsTextBlock}>
                <Text style={styles.quickActionTitle}>Talent Pools</Text>
                <Text style={styles.quickActionSubtitle}>Organize candidates into custom hiring pools</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
            </TouchableOpacity>
          </SwipeFadeContainer>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Config Modal */}
      <ConfigModal visible={showConfig} onClose={() => setShowConfig(false)} T={T} />
    </SafeAreaView>
  );
}

// ── Styles ──

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1, backgroundColor: T.bg },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerTextBlock: { flex: 1 },
  greeting: { fontSize: 15, color: T.textPrimary, fontWeight: '600' },
  companyName: { fontSize: 22, color: T.textPrimary, fontWeight: '800', marginTop: 2 },
  planBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.accentBg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: T.accent + '30' },
  planBadgeText: { fontSize: 12, fontWeight: '700', color: T.accent },
  planBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.accentBg, borderRadius: 16, borderWidth: 1, borderColor: T.accent + '30', padding: 14, marginBottom: 16 },
  planBannerPressed: { backgroundColor: T.accentBg20 },
  planBannerIconWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: T.card, alignItems: 'center', justifyContent: 'center' },
  planBannerTitle: { fontSize: 14, fontWeight: '700', color: T.textPrimary },
  planBannerSubtitle: { fontSize: 12, color: T.textSecondary, marginTop: 2 },
  statusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.accentBg, borderRadius: 14, borderWidth: 1, borderColor: T.accent + '30', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20 },
  statusBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBarText: { fontSize: 13, color: T.textPrimary, fontWeight: '600', marginLeft: 6 },
  upgradeLink: { fontSize: 13, color: T.accent, fontWeight: '700' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  metricCard: { width: '48%', backgroundColor: T.card, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 16, marginBottom: 12 },
  metricIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  metricValue: { fontSize: 24, fontWeight: '700', color: T.textPrimary, marginBottom: 2 },
  metricLabel: { fontSize: 12, color: T.textSecondary, fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: T.textPrimary, marginBottom: 12 },
  sectionLink: { fontSize: 13, fontWeight: '600', color: T.accent },
  matchesList: { marginBottom: 24 },
  matchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 12, marginBottom: 10 },
  matchRowPressed: { backgroundColor: T.cardElevated },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: T.border },
  avatarInitials: { fontSize: 14, fontWeight: '700', color: T.accent },
  matchInfo: { flex: 1, marginRight: 8 },
  matchName: { fontSize: 14, fontWeight: '600', color: T.textPrimary, marginBottom: 2 },
  matchTitle: { fontSize: 12, color: T.textSecondary },
  matchMeta: { alignItems: 'flex-end' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  matchTime: { fontSize: 11, color: T.textMuted },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, backgroundColor: T.card, borderRadius: 14, borderWidth: 1, borderColor: T.border },
  emptyStateText: { marginTop: 8, fontSize: 13, color: T.textMuted },
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  quickActionCard: { width: '48%', backgroundColor: T.card, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 16 },
  quickActionIconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  quickActionTitle: { fontSize: 14, fontWeight: '700', color: T.textPrimary, marginBottom: 4 },
  quickActionSubtitle: { fontSize: 12, color: T.textSecondary },
  atsGateWrap: { position: 'relative', marginBottom: 12 },
  atsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 0 },
  atsRowLocked: { opacity: 0.4 },
  enterpriseRibbon: { position: 'absolute', top: -8, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.accent, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  enterpriseRibbonText: { fontSize: 9, fontWeight: '800', color: T.textOnAccent, letterSpacing: 0.3 },
  atsIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: T.emeraldBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  atsTextBlock: { flex: 1 },
  atsTitle: { fontSize: 14, fontWeight: '600', color: T.textPrimary, marginBottom: 2 },
  atsSubtitle: { fontSize: 12, color: T.textSecondary },
  atsToggle: { marginLeft: 8 },
  atsToggleTrack: { width: 44, height: 26, borderRadius: 13, backgroundColor: T.accent, justifyContent: 'center', paddingHorizontal: 2 },
  atsToggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: T.white },
  talentPoolsCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: T.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: T.border, marginBottom: 24 },
  talentPoolsTextBlock: { flex: 1 },
});
