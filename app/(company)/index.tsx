import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Modal,
  Switch,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import AppIcon from '@/components/AppIcon';

import { useTheme, useThemeToggle, ThemePalette, ELEVATION, DISPLAY_FONT_FAMILY, TYPE, SPACING, RADIUS } from '@/lib/theme';
import { useSubscription } from '@/lib/subscriptionStore';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { getCompanyStats, CompanyStats, relativeTime } from '@/lib/dashboardStats';
import { TIER_CONFIG } from '@/lib/mock-data';
import { initials } from '@/lib/format';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import ScreenFrame from '@/components/ScreenFrame';
import { Text } from '@/components/Themed';
import { SkeletonRow } from '@/components/Skeleton';
import PageHead from '@/components/PageHead';
import { useAccountStatus } from '@/lib/useAccountStatus';
import AnimatedPressable from '@/components/AnimatedPressable';

// ── Helpers ──

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

type StatusMeta = { label: string; color: string; bg: string };

function getIntroStatusMeta(status: string, T: ThemePalette): StatusMeta {
  switch (status) {
    case 'sent': return { label: 'PENDING', color: T.amber, bg: T.amberBg };
    case 'accepted': return { label: 'ACCEPTED', color: T.emerald, bg: T.emeraldBg };
    case 'declined': return { label: 'DECLINED', color: T.textSecondary, bg: T.surface };
    case 'expired': return { label: 'EXPIRED', color: T.danger, bg: T.dangerBg };
    default: return { label: status.toUpperCase(), color: T.textSecondary, bg: T.surface };
  }
}

// ── Config Modal ──

function makeConfigModalStyles(T: ThemePalette) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: T.overlay },
    dismiss: { height: 60 },
    sheet: { flex: 1, backgroundColor: T.bg, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet },
    safe: { flex: 1 },
    handleWrap: { alignItems: 'center', paddingTop: SPACING.sm, paddingBottom: SPACING.xs },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: T.border },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
    headerTitle: { ...TYPE.title, color: T.textPrimary },
    closeBtn: { width: 36, height: 36, borderRadius: RADIUS.control, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingBottom: SPACING.xxxl + SPACING.sm },

    planBanner: {
      marginHorizontal: SPACING.xl, backgroundColor: T.accentBg, borderRadius: RADIUS.card,
      padding: SPACING.lg, marginBottom: SPACING.xl, borderWidth: 1, borderColor: T.accent + '30',
    },
    planBannerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    planBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    planName: { ...TYPE.heading, fontWeight: '800', color: T.accentDim },
    planBadge: { backgroundColor: T.accent, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.chip },
    planBadgeText: { ...TYPE.caption, fontWeight: '800', color: T.textOnAccent },

    themeRowWrap: { marginHorizontal: SPACING.xl, marginBottom: SPACING.xl },
    themeRow: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: T.card,
      borderRadius: RADIUS.card, padding: SPACING.lg, borderWidth: 1, borderColor: T.border, ...ELEVATION.card,
    },
    themeRowLabel: { flex: 1, ...TYPE.bodyStrong, color: T.textPrimary },

    section: { marginBottom: SPACING.xl },
    sectionTitle: { ...TYPE.overline, color: T.textMuted, paddingHorizontal: SPACING.xl, marginBottom: SPACING.sm },
    sectionBody: { backgroundColor: T.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.border },
    row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg },
    rowDivider: { borderBottomWidth: 1, borderBottomColor: T.border },
    rowPressed: { backgroundColor: T.surfaceHover },
    rowText: { flex: 1 },
    rowLabel: { ...TYPE.bodyStrong, color: T.textPrimary },
    rowDesc: { ...TYPE.caption, color: T.textSecondary, marginTop: 1 },

    signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: SPACING.lg, marginHorizontal: SPACING.xl },
    signOutText: { ...TYPE.bodyStrong, color: T.danger },

    versionWrap: { alignItems: 'center', paddingTop: SPACING.sm },
    versionText: { ...TYPE.caption, color: T.textMuted },
  });
}

function ConfigModal({ visible, onClose, T }: { visible: boolean; onClose: () => void; T: ThemePalette }) {
  const { mode, toggleTheme } = useThemeToggle();
  const { config, tier } = useSubscription();
  const router = useRouter();
  const cs = useMemo(() => makeConfigModalStyles(T), [T]);

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
      <View style={cs.backdrop}>
        <Pressable style={cs.dismiss} onPress={onClose} />
        <View style={cs.sheet}>
          <SafeAreaView style={cs.safe} edges={['bottom']}>
            {/* Handle + Header */}
            <View style={cs.handleWrap}>
              <View style={cs.handle} />
            </View>
            <View style={cs.header}>
              <Text style={cs.headerTitle}>Settings</Text>
              <AnimatedPressable onPress={onClose} style={cs.closeBtn} hitSlop={4} accessibilityRole="button" accessibilityLabel="Close settings">
                <AppIcon name="close" size={20} color={T.textPrimary} />
              </AnimatedPressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={cs.scrollContent}>
              {/* Current Plan Banner */}
              <View style={cs.planBanner}>
                <View style={cs.planBannerRow}>
                  <View style={cs.planBannerLeft}>
                    <AppIcon name="crown-outline" size={18} color={T.accent} />
                    <Text style={cs.planName}>{config.name} Plan</Text>
                  </View>
                  <View style={cs.planBadge}>
                    <Text style={cs.planBadgeText}>ACTIVE</Text>
                  </View>
                </View>
              </View>

              {/* Theme Toggle */}
              <View style={cs.themeRowWrap}>
                <View style={cs.themeRow}>
                  <AppIcon name={mode === 'light' ? 'sunny-outline' : 'moon-outline'} size={20} color={T.textSecondary} />
                  <Text style={cs.themeRowLabel}>Dark Mode</Text>
                  <Switch value={mode === 'dark'} onValueChange={toggleTheme} trackColor={{ false: T.surface, true: T.accent }} thumbColor={T.white} />
                </View>
              </View>

              {/* Sections */}
              {sections.map((section) => (
                <View key={section.title} style={cs.section}>
                  <Text style={cs.sectionTitle}>{section.title}</Text>
                  <View style={cs.sectionBody}>
                    {section.items.map((item, i) => (
                      <AnimatedPressable
                        key={item.label}
                        onPress={item.onPress}
                        style={(state) => [cs.row, i < section.items.length - 1 && cs.rowDivider, state.pressed && cs.rowPressed]}
                      >
                        <AppIcon name={item.icon as any} size={20} color={T.textSecondary} />
                        <View style={cs.rowText}>
                          <Text style={cs.rowLabel}>{item.label}</Text>
                          {'desc' in item && item.desc ? <Text style={cs.rowDesc}>{item.desc}</Text> : null}
                        </View>
                        <AppIcon name="chevron-forward" size={16} color={T.textMuted} />
                      </AnimatedPressable>
                    ))}
                  </View>
                </View>
              ))}

              {/* Sign Out — was previously just closing this sheet and force-
                  navigating without ever calling supabase.auth.signOut(), so
                  the session stayed alive and AuthGate's own redirect logic
                  would just send a still-authenticated user straight back
                  here. Now matches the signOut() pattern used everywhere
                  else (TopNav, both profile screens, AccountSettings) —
                  onAuthStateChange picks up the cleared session and AuthGate
                  handles the redirect itself, no manual router call needed. */}
              <AnimatedPressable onPress={() => { onClose(); supabase.auth.signOut(); }} style={cs.signOut}>
                <AppIcon name="log-out-outline" size={18} color={T.danger} />
                <Text style={cs.signOutText}>Sign Out</Text>
              </AnimatedPressable>

              <View style={cs.versionWrap}>
                <Text style={cs.versionText}>hiyame v1.0.0</Text>
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
  const { companyId } = useAuth();
  const companyStatus = useAccountStatus('companies', companyId);
  const { tier, config, trialDaysLeft } = useSubscription();
  const [showConfig, setShowConfig] = useState(false);
  // logo_url is on the same not-always-applied migration TopNav.tsx already
  // guards for (20260911140000_notification_prefs.sql) — fetched separately
  // and swallowed on error so a not-yet-migrated database still renders the
  // rest of this dashboard instead of failing the whole stats query.
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!companyId) return;
    let alive = true;
    supabase.from('companies').select('logo_url').eq('id', companyId).maybeSingle().then(({ data, error }) => {
      if (alive && !error && data?.logo_url) setLogoUrl(data.logo_url);
    });
    return () => { alive = false; };
  }, [companyId]);
  // Real cache (tabbing Home -> Roles -> Home within 30s reuses this instead
  // of refetching) + a real isError flag — before this, a failed fetch left
  // `stats` at null forever with the metric cards silently showing 0s
  // (via the existing `stats?.openRoles ?? 0` fallbacks below) and zero
  // indication anything went wrong.
  const { data: stats, isError: statsErrored, refetch: refetchStats } = useQuery({
    queryKey: ['companyStats', companyId],
    queryFn: () => getCompanyStats(companyId!),
    enabled: !!companyId,
  });

  const greeting = useMemo(() => getGreeting(), []);
  const showUpgradeBar = tier !== 'enterprise';

  const metricCards = [
    { key: 'roles', label: 'Open Roles', value: stats?.openRoles ?? 0, icon: 'briefcase' as const, color: T.accent, bg: T.accentBg },
    { key: 'shortlisted', label: 'Shortlisted', value: stats?.shortlisted ?? 0, icon: 'people' as const, color: T.indigo, bg: T.indigoBg },
    { key: 'sent', label: 'Introductions', value: stats?.introsSent ?? 0, icon: 'paper-plane' as const, color: T.amber, bg: T.amberBg },
    { key: 'accepted', label: 'Accepted', value: stats?.introsAccepted ?? 0, icon: 'checkmark-done-circle' as const, color: T.emerald, bg: T.emeraldBg },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <PageHead title="Home" />
      <ScreenFrame>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SwipeFadeContainer direction="left" triggerKey="header">
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIdentity}>
              <View style={styles.logoWrap}>
                {logoUrl ? (
                  <Image source={{ uri: logoUrl }} style={styles.logoImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.logoInitials}>{initials(stats?.companyName || 'Co')}</Text>
                )}
              </View>
              <View style={styles.headerTextBlock}>
                <Text style={styles.greeting}>{greeting},</Text>
                <Text style={styles.companyName}>{stats?.companyName ?? '…'}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.planBadge}>
                <AppIcon name="crown-outline" size={14} color={T.accent} style={{ marginRight: 4 }} />
                <Text style={styles.planBadgeText}>{config.name}</Text>
              </View>
              <AnimatedPressable onPress={() => setShowConfig(true)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' }} hitSlop={4} accessibilityRole="button" accessibilityLabel="Settings">
                <AppIcon name="settings-outline" size={20} color={T.textSecondary} />
              </AnimatedPressable>
            </View>
          </View>
        </SwipeFadeContainer>

        {/* Stats fetch failed — the rest of the dashboard still renders fine
            via the `stats?.x ?? 0` fallbacks above, so this stays a small
            inline notice rather than blocking the whole screen (unlike
            AnalyticsScreen, whose numbers ARE the entire screen). */}
        {statsErrored && (
          <View style={styles.statsErrorBanner}>
            <AppIcon name="cloud-offline-outline" size={16} color={T.danger} />
            <Text style={styles.statsErrorText}>Couldn't load your latest stats</Text>
            <AnimatedPressable onPress={() => refetchStats()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.statsErrorRetry}>Retry</Text>
            </AnimatedPressable>
          </View>
        )}

        {(companyStatus === 'pending' || companyStatus === 'rejected') && (
          <View style={companyStatus === 'rejected' ? styles.statusBannerDanger : styles.statusBanner}>
            <AppIcon
              name={companyStatus === 'rejected' ? 'close-circle-outline' : 'time-outline'}
              size={16}
              color={companyStatus === 'rejected' ? T.danger : T.amber}
            />
            <Text style={companyStatus === 'rejected' ? styles.statusBannerDangerText : styles.statusBannerText}>
              {companyStatus === 'rejected'
                ? "Your account wasn't approved. Contact Hiyame support if you think this is a mistake."
                : "Your account is pending review. Posting roles, shortlists, and interviews unlock once it's approved."}
            </Text>
          </View>
        )}

        {/* Active plan banner */}
        <SwipeFadeContainer direction="left" triggerKey="planBanner" delay={150}>
          <AnimatedPressable
            style={(state) => [styles.planBanner, state.pressed && styles.planBannerPressed]}
            onPress={() => router.push('/(company)/subscriptions')}
          >
            <View style={styles.planBannerIconWrap}>
              <AppIcon name="crown-outline" size={20} color={T.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.planBannerTitle}>Active Plan: {config.name}</Text>
              <Text style={styles.planBannerSubtitle}>Tap to view or upgrade your subscription</Text>
            </View>
            <AppIcon name="chevron-forward" size={18} color={T.accent} />
          </AnimatedPressable>
        </SwipeFadeContainer>

        {/* Subscription status bar */}
        {showUpgradeBar && (
          <SwipeFadeContainer direction="left" triggerKey="statusbar" delay={180}>
            <View style={styles.statusBar}>
              <View style={styles.statusBarLeft}>
                <AppIcon name="time-outline" size={16} color={T.accent} />
                <Text style={styles.statusBarText}>
                  {trialDaysLeft > 0 ? trialDaysLeft + ' day' + (trialDaysLeft === 1 ? '' : 's') + ' left in trial' : 'Trial ended'}
                </Text>
              </View>
              <AnimatedPressable onPress={() => { setShowConfig(true); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.upgradeLink}>Upgrade</Text>
              </AnimatedPressable>
            </View>
          </SwipeFadeContainer>
        )}

        {/* Metrics Grid */}
        <SwipeFadeContainer direction="left" triggerKey="metrics" delay={210}>
          <View style={styles.metricsGrid}>
            {metricCards.map((m) => (
              <View key={m.key} style={styles.metricCard}>
                <View style={[styles.metricIconWrap, { backgroundColor: m.bg }]}>
                  <AppIcon name={m.icon} size={20} color={m.color} />
                </View>
                <Text style={styles.metricValue}>{m.value}</Text>
                <Text style={styles.metricLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
        </SwipeFadeContainer>

        {/* Recent introductions */}
        <SwipeFadeContainer direction="left" triggerKey="matches" delay={240}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Introductions</Text>
            <AnimatedPressable onPress={() => router.push('/(company)/roles')}>
              <Text style={styles.sectionLink}>My roles</Text>
            </AnimatedPressable>
          </View>

          <View style={styles.matchesList}>
            {!stats ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : stats.recentIntros.length === 0 ? (
              <View style={styles.emptyState}>
                <AppIcon name="paper-plane-outline" size={28} color={T.textMuted} />
                <Text style={styles.emptyStateText}>No introductions yet. Post a role and review its shortlist</Text>
              </View>
            ) : (
              stats.recentIntros.map((intro) => {
                const statusMeta = getIntroStatusMeta(intro.status, T);
                const cfg = TIER_CONFIG[intro.roleTier];
                return (
                  <AnimatedPressable
                    key={intro.id}
                    style={(state) => [styles.matchRow, state.pressed && styles.matchRowPressed]}
                    onPress={() => router.push('/(company)/roles')}
                  >
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarInitials}>{initials(intro.counterpartyName)}</Text>
                    </View>
                    <View style={styles.matchInfo}>
                      <Text style={styles.matchName} numberOfLines={1}>{intro.counterpartyName}</Text>
                      <Text style={styles.matchTitle} numberOfLines={1}>{cfg.label} · {intro.roleTitle}</Text>
                    </View>
                    <View style={styles.matchMeta}>
                      <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                      </View>
                      <Text style={styles.matchTime}>{relativeTime(intro.at)}</Text>
                    </View>
                  </AnimatedPressable>
                );
              })
            )}
          </View>
        </SwipeFadeContainer>

        {/* Quick Actions */}
        <SwipeFadeContainer direction="left" triggerKey="actions" delay={270}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <AnimatedPressable style={styles.quickActionCard} onPress={() => router.push('/(company)/create-role')}>
              <View style={[styles.quickActionIconWrap, { backgroundColor: T.accentBg }]}>
                <AppIcon name="add-circle-outline" size={20} color={T.accent} />
              </View>
              <View style={styles.quickActionTextBlock}>
                <Text style={styles.quickActionTitle}>Post a Role</Text>
                <Text style={styles.quickActionSubtitle} numberOfLines={1}>Start a new shortlist</Text>
              </View>
            </AnimatedPressable>

            <AnimatedPressable style={styles.quickActionCard} onPress={() => router.push('/(company)/messages')}>
              <View style={[styles.quickActionIconWrap, { backgroundColor: T.indigoBg }]}>
                <AppIcon name="people-outline" size={20} color={T.indigo} />
              </View>
              <View style={styles.quickActionTextBlock}>
                <Text style={styles.quickActionTitle}>Connections</Text>
                <Text style={styles.quickActionSubtitle} numberOfLines={1}>Accepted intros</Text>
              </View>
            </AnimatedPressable>
          </View>
        </SwipeFadeContainer>

        {/* ATS / HRMS Integration & Developer Webhooks — Enterprise-gated */}
        <SwipeFadeContainer direction="left" triggerKey="ats-gate" delay={300}>
          <Text style={styles.sectionTitle}>Enterprise Tools</Text>
          <AnimatedPressable
            disabled={tier === 'enterprise'}
            onPress={() => router.push('/(company)/subscriptions')}
            style={styles.atsGateWrap}
          >
            <View style={[styles.atsRow, tier !== 'enterprise' && styles.atsRowLocked]} pointerEvents={tier !== 'enterprise' ? 'none' : 'auto'}>
              <View style={styles.atsIconWrap}>
                <AppIcon name="sync-circle" size={20} color={T.emerald} />
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
            {tier !== 'enterprise' && (
              <View style={styles.enterpriseRibbon}>
                <AppIcon name="lock-closed" size={11} color={T.textOnAccent} />
                <Text style={styles.enterpriseRibbonText}>ENTERPRISE TIER ONLY</Text>
              </View>
            )}
          </AnimatedPressable>
        </SwipeFadeContainer>

        {/* Enterprise tier extras */}
        {tier === 'enterprise' && (
          <SwipeFadeContainer direction="left" triggerKey="scale-extras" delay={330}>
            <AnimatedPressable style={styles.talentPoolsCard}>
              <View style={[styles.quickActionIconWrap, { backgroundColor: T.amberBg }]}>
                <AppIcon name="account-group-outline" size={22} color={T.amber} />
              </View>
              <View style={styles.talentPoolsTextBlock}>
                <Text style={styles.quickActionTitle}>Talent Pools</Text>
                <Text style={styles.quickActionSubtitle}>Organize candidates into custom hiring pools</Text>
              </View>
              <AppIcon name="chevron-forward" size={18} color={T.textMuted} />
            </AnimatedPressable>
          </SwipeFadeContainer>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
      </ScreenFrame>

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
  headerIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  logoWrap: {
    width: 44, height: 44, borderRadius: RADIUS.card, backgroundColor: T.accentBg,
    borderWidth: 1, borderColor: T.accentBg20,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  logoImage: { width: '100%', height: '100%' },
  logoInitials: { fontSize: 15, fontWeight: '800', color: T.accentDim },
  headerTextBlock: { flex: 1 },
  greeting: { fontSize: 15, color: T.textPrimary, fontWeight: '600' },
  companyName: { fontSize: 22, color: T.textPrimary, fontWeight: '800', marginTop: 2, fontFamily: DISPLAY_FONT_FAMILY },
  planBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.accentBg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: T.accent + '30' },
  planBadgeText: { fontSize: 12, fontWeight: '700', color: T.accentDim },
  planBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.accentBg, borderRadius: 16, borderWidth: 1, borderColor: T.accent + '30', padding: 14, marginBottom: 16 },
  planBannerPressed: { backgroundColor: T.accentBg20 },
  planBannerIconWrap: { width: 36, height: 36, borderRadius: RADIUS.control, backgroundColor: T.card, alignItems: 'center', justifyContent: 'center' },
  planBannerTitle: { fontSize: 14, fontWeight: '700', color: T.textPrimary },
  planBannerSubtitle: { fontSize: 12, color: T.textSecondary, marginTop: 2 },
  statusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.accentBg, borderRadius: RADIUS.card, borderWidth: 1, borderColor: T.accent + '30', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20 },
  statusBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBarText: { fontSize: 13, color: T.textPrimary, fontWeight: '600', marginLeft: 6 },
  upgradeLink: { fontSize: 13, color: T.accentDim, fontWeight: '700' },
  statsErrorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.dangerBg, borderRadius: RADIUS.card, borderWidth: 1, borderColor: T.danger + '30', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20 },
  statsErrorText: { flex: 1, fontSize: 13, color: T.textPrimary, fontWeight: '600' },
  statsErrorRetry: { fontSize: 13, color: T.danger, fontWeight: '700' },
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.amberBg, borderRadius: RADIUS.card, borderWidth: 1, borderColor: T.amber, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20 },
  statusBannerText: { flex: 1, fontSize: 13, color: T.textPrimary, fontWeight: '600', lineHeight: 18 },
  statusBannerDanger: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.dangerBg, borderRadius: RADIUS.card, borderWidth: 1, borderColor: T.danger, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20 },
  statusBannerDangerText: { flex: 1, fontSize: 13, color: T.textPrimary, fontWeight: '600', lineHeight: 18 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  metricCard: { width: '48%', backgroundColor: T.card, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 16, marginBottom: 12 },
  metricIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  metricValue: { fontSize: 24, fontWeight: '700', color: T.textPrimary, marginBottom: 2 },
  metricLabel: { fontSize: 12, color: T.textSecondary, fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: T.textPrimary, marginBottom: 12 },
  sectionLink: { fontSize: 13, fontWeight: '600', color: T.accentDim },
  matchesList: { marginBottom: 24 },
  matchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, borderRadius: RADIUS.card, borderWidth: 1, borderColor: T.border, padding: 12, marginBottom: 10, ...ELEVATION.card },
  matchRowPressed: { backgroundColor: T.cardElevated },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: T.border },
  avatarInitials: { fontSize: 14, fontWeight: '700', color: T.accentDim },
  matchInfo: { flex: 1, marginRight: 8 },
  matchName: { fontSize: 14, fontWeight: '600', color: T.textPrimary, marginBottom: 2 },
  matchTitle: { fontSize: 12, color: T.textSecondary },
  matchMeta: { alignItems: 'flex-end' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  matchTime: { fontSize: 11, color: T.textMuted },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, backgroundColor: T.card, borderRadius: RADIUS.card, borderWidth: 1, borderColor: T.border, ...ELEVATION.card },
  emptyStateText: { marginTop: 8, fontSize: 13, color: T.textMuted },
  quickActionsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  quickActionCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.card, borderRadius: RADIUS.card, borderWidth: 1, borderColor: T.border, padding: 12 },
  quickActionIconWrap: { width: 38, height: 38, borderRadius: RADIUS.control, alignItems: 'center', justifyContent: 'center' },
  quickActionTextBlock: { flex: 1, minWidth: 0 },
  quickActionTitle: { fontSize: 13.5, fontWeight: '700', color: T.textPrimary },
  quickActionSubtitle: { fontSize: 11.5, color: T.textSecondary, marginTop: 1 },
  atsGateWrap: { position: 'relative', marginBottom: 12 },
  atsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, borderRadius: RADIUS.card, borderWidth: 1, borderColor: T.border, padding: 16, marginBottom: 0, ...ELEVATION.card },
  atsRowLocked: { opacity: 0.4 },
  enterpriseRibbon: { position: 'absolute', top: -8, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.accent, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.chip },
  enterpriseRibbonText: { fontSize: 9, fontWeight: '800', color: T.textOnAccent, letterSpacing: 0.3 },
  atsIconWrap: { width: 36, height: 36, borderRadius: RADIUS.control, backgroundColor: T.emeraldBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  atsTextBlock: { flex: 1 },
  atsTitle: { fontSize: 14, fontWeight: '600', color: T.textPrimary, marginBottom: 2 },
  atsSubtitle: { fontSize: 12, color: T.textSecondary },
  atsToggle: { marginLeft: 8 },
  atsToggleTrack: { width: 44, height: 26, borderRadius: 13, backgroundColor: T.accent, justifyContent: 'center', paddingHorizontal: 2 },
  atsToggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: T.white },
  talentPoolsCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: T.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: T.border, marginBottom: 24 },
  talentPoolsTextBlock: { flex: 1 },
});
