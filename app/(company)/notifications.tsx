import { useCallback, useState, useMemo } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApplicationStore, CandidateApplication } from '@/lib/applicationStore';
import { TIER_CONFIG } from '@/lib/mock-data';
import { useVerification } from '@/lib/useVerification';
import { evaluateEligibility } from '@/lib/matchingEngine';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import { useTheme, ThemePalette } from '@/lib/theme';

function getSystemAlerts(T: ThemePalette) {
  return [
    {
      id: 'sys-1',
      icon: 'shield-checkmark' as const,
      title: 'Company Verified',
      body: 'Your company verification is complete. You can now access the full candidate pool.',
      time: '1 day ago',
      accent: T.indigo,
      bgColor: T.card,
      iconBg: T.indigoBg,
    },
    {
      id: 'sys-2',
      icon: 'information-circle-outline' as const,
      title: 'Platform Update',
      body: 'New tier pricing goes into effect next month. Review your subscription plan.',
      time: '2 days ago',
      accent: T.textSecondary,
      bgColor: T.card,
      iconBg: T.surface,
    },
  ];
}

function getTimeSince(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Review Profile Modal with Live Eligibility Check ──
function ReviewProfileModal({
  app,
  visible,
  onClose,
}: {
  app: CandidateApplication | null;
  visible: boolean;
  onClose: () => void;
}) {
  const T = useTheme();
  const ms = useMemo(() => makeStyles(T), [T]);
  // Read the LIVE verification state (shared context — same app instance)
  const liveVerification = useVerification();

  if (!app) return null;

  const tierCfg = TIER_CONFIG[app.roleTier];

  // Build live verification checklist from current state (not snapshot)
  const liveChecklist = [
    { label: 'Identity Check', done: liveVerification.identityVerified, wasAtApply: app.identityVerified },
    { label: 'Video Introduction', done: liveVerification.videoIntroUploaded, wasAtApply: app.videoIntroUploaded },
    { label: 'Skills Assessment', done: liveVerification.assessmentCompleted, wasAtApply: app.assessmentCompleted },
    { label: 'Employer Review', done: liveVerification.employerReviewSecured, wasAtApply: app.employerReviewSecured },
  ];

  // Live eligibility check against role tier requirements
  const liveEligibility = evaluateEligibility(liveVerification, app.roleTier);

  // Detect regression: was eligible at apply time but no longer eligible now
  const liveCompletedCount = liveChecklist.filter((c) => c.done).length;
  const snapshotCompletedCount = app.verifiedCount;
  const hasRegressed = liveCompletedCount < snapshotCompletedCount;
  const meetsRequirements = app.roleTier === 'gig' ? false : liveEligibility.eligible;

  // Determine if any individual check was revoked since applying
  const revokedItems = liveChecklist.filter((c) => c.wasAtApply && !c.done);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={ms.overlay} onPress={onClose}>
        <Pressable style={ms.modal} onPress={() => {}}>
          {/* Close button */}
          <Pressable style={ms.closeBtn} onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={20} color={T.textMuted} />
          </Pressable>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Avatar + Name */}
            <View style={ms.avatarWrap}>
              <View style={ms.avatar}>
                <Ionicons name="person" size={24} color={T.accent} />
              </View>
            </View>
            <Text style={ms.name}>{app.candidateName}</Text>
            <Text style={ms.title}>{app.candidateTitle}</Text>

            {/* Applied to */}
            <View style={ms.appliedRow}>
              <View style={[ms.tierPill, { backgroundColor: tierCfg.accent + '14' }]}>
                <Text style={[ms.tierPillText, { color: tierCfg.accent }]}>{tierCfg.label}</Text>
              </View>
              <Text style={ms.appliedRole}>{app.roleTitle}</Text>
            </View>

            <View style={ms.divider} />

            {/* Core Skills */}
            {app.coreSkills.length > 0 && (
              <View style={ms.section}>
                <Text style={ms.sectionLabel}>Core Skills</Text>
                <View style={ms.skillsRow}>
                  {app.coreSkills.map((sk) => (
                    <View key={sk} style={ms.skillChip}>
                      <Text style={ms.skillText}>{sk}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Target Rate */}
            {app.targetMinRate > 0 && (
              <View style={ms.section}>
                <Text style={ms.sectionLabel}>Target Min Rate</Text>
                <Text style={ms.rateValue}>${app.targetMinRate.toLocaleString()}/mo</Text>
              </View>
            )}

            <View style={ms.divider} />

            {/* Live Verification Status */}
            <View style={ms.section}>
              <View style={ms.verHeader}>
                <Text style={ms.sectionLabel}>Verification Status</Text>
                {hasRegressed && (
                  <View style={ms.regressedTag}>
                    <Ionicons name="trending-down" size={11} color={T.danger} />
                    <Text style={ms.regressedTagText}>Changed</Text>
                  </View>
                )}
              </View>

              <View style={ms.verBadge}>
                <Ionicons
                  name="shield-checkmark"
                  size={14}
                  color={meetsRequirements ? T.emerald : hasRegressed ? T.danger : T.indigo}
                />
                <Text
                  style={[
                    ms.verBadgeText,
                    { color: meetsRequirements ? T.emerald : hasRegressed ? T.danger : T.indigo },
                  ]}
                >
                  {liveCompletedCount}/{app.totalCount} Verified (Live)
                </Text>
                {hasRegressed && (
                  <Text style={ms.verSnapshot}>
                    was {snapshotCompletedCount}/{app.totalCount}
                  </Text>
                )}
              </View>

              {liveChecklist.map((item) => {
                const wasRevoked = item.wasAtApply && !item.done;
                return (
                  <View key={item.label} style={ms.checkItem}>
                    <Ionicons
                      name={item.done ? 'checkmark-circle' : wasRevoked ? 'close-circle' : 'ellipse-outline'}
                      size={18}
                      color={item.done ? T.emerald : wasRevoked ? T.danger : T.textMuted}
                    />
                    <Text style={[ms.checkLabel, item.done && ms.checkLabelDone, wasRevoked && ms.checkLabelRevoked]}>
                      {item.label}
                    </Text>
                    {wasRevoked && (
                      <View style={ms.revokedBadge}>
                        <Text style={ms.revokedBadgeText}>Revoked</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Eligibility Warning Notice */}
            {!meetsRequirements && app.roleTier !== 'gig' && (
              <View style={ms.warningBanner}>
                <Ionicons name="warning" size={16} color={T.amber} />
                <View style={{ flex: 1 }}>
                  <Text style={ms.warningTitle}>Requirements Incomplete</Text>
                  <Text style={ms.warningText}>
                    {hasRegressed
                      ? `This candidate's verification status has dropped below the ${tierCfg.label} tier threshold since applying. ${revokedItems.length} check${revokedItems.length !== 1 ? 's' : ''} revoked.`
                      : liveEligibility.message}
                  </Text>
                  <Text style={ms.warningNotice}>
                    Talent Lead: Do not proceed with introduction until the candidate restores their verification status.
                  </Text>
                </View>
              </View>
            )}

            {/* Action buttons — conditional on eligibility */}
            {meetsRequirements ? (
              <Pressable style={ms.primaryBtn} onPress={onClose}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={T.textOnAccent} />
                <Text style={ms.primaryBtnText}>Request Introduction</Text>
              </Pressable>
            ) : (
              <View style={ms.disabledBtn}>
                <Ionicons name="lock-closed" size={16} color={T.textMuted} />
                <Text style={ms.disabledBtnText}>Requirements Incomplete</Text>
              </View>
            )}

            <Pressable style={ms.secondaryBtn} onPress={onClose}>
              <Text style={ms.secondaryBtnText}>Close</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Application Alert Card ──
function ApplicationAlert({
  app,
  onReview,
}: {
  app: CandidateApplication;
  onReview: (app: CandidateApplication) => void;
}) {
  const T = useTheme();
  const ms = useMemo(() => makeStyles(T), [T]);
  const tierCfg = TIER_CONFIG[app.roleTier];
  const verifiedLabel = `${app.verifiedCount}/${app.totalCount} Verified`;
  const isFullyVerified = app.verifiedCount === app.totalCount;

  return (
    <View style={[ms.alertCard, { backgroundColor: T.card, borderLeftColor: T.emerald }]}>
      <View style={ms.alertRow}>
        <View style={[ms.alertIconWrap, { backgroundColor: T.emeraldBg }]}>
          <Ionicons name="heart-circle" size={18} color={T.emerald} />
        </View>
        <View style={ms.alertContent}>
          <View style={ms.alertTitleRow}>
            <Text style={ms.alertTitle}>New Application</Text>
            <View style={ms.unreadDot} />
          </View>

          <View style={ms.candidateRow}>
            <View style={ms.candidateAvatar}>
              <Ionicons name="person" size={14} color={T.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ms.candidateName}>{app.candidateName}</Text>
              <Text style={ms.candidateTitle}>{app.candidateTitle}</Text>
            </View>
            <View style={[ms.verifiedBadge, isFullyVerified ? ms.verifiedBadgeFull : ms.verifiedBadgePartial]}>
              <Ionicons
                name="shield-checkmark"
                size={11}
                color={isFullyVerified ? T.emerald : T.indigo}
              />
              <Text style={[ms.verifiedBadgeText, { color: isFullyVerified ? T.emerald : T.indigo }]}>
                {verifiedLabel}
              </Text>
            </View>
          </View>

          <View style={ms.roleRow}>
            <View style={[ms.tierMini, { backgroundColor: tierCfg.accent + '14' }]}>
              <Text style={[ms.tierMiniText, { color: tierCfg.accent }]}>{tierCfg.label}</Text>
            </View>
            <Text style={ms.roleApplied}>{app.roleTitle}</Text>
          </View>

          <Text style={ms.alertTime}>{getTimeSince(app.appliedAt)}</Text>

          <Pressable style={ms.reviewBtn} onPress={() => onReview(app)}>
            <Ionicons name="person-circle-outline" size={15} color={T.textOnAccent} />
            <Text style={ms.reviewBtnText}>Review Profile</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ── Main Screen ──
export default function CompanyNotificationsScreen() {
  const T = useTheme();
  const ms = useMemo(() => makeStyles(T), [T]);
  const systemAlerts = useMemo(() => getSystemAlerts(T), [T]);

  const { companyAlerts } = useApplicationStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedApp, setSelectedApp] = useState<CandidateApplication | null>(null);

  const totalUnread = companyAlerts.length;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  return (
    <SafeAreaView style={ms.container} edges={['top', 'left', 'right']}>
      <ReviewProfileModal
        app={selectedApp}
        visible={selectedApp !== null}
        onClose={() => setSelectedApp(null)}
      />

      <View style={ms.header}>
        <View style={ms.headerLeft}>
          <Ionicons name="notifications" size={22} color={T.accent} />
          <Text style={ms.headerTitle}>Alerts</Text>
          {totalUnread > 0 && (
            <View style={ms.headerBadge}>
              <Text style={ms.headerBadgeText}>{totalUnread}</Text>
            </View>
          )}
        </View>
        <Pressable style={ms.markRead}>
          <Text style={ms.markReadText}>Mark all read</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={ms.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} colors={[T.accent]} />}
      >
        <SwipeFadeContainer>
        {companyAlerts.length > 0 && (
          <View style={ms.sectionHeader}>
            <Ionicons name="flash" size={14} color={T.emerald} />
            <Text style={ms.sectionHeaderText}>Candidate Applications</Text>
            <View style={ms.sectionCount}>
              <Text style={ms.sectionCountText}>{companyAlerts.length}</Text>
            </View>
          </View>
        )}
        {companyAlerts.map((app) => (
          <ApplicationAlert key={app.id} app={app} onReview={setSelectedApp} />
        ))}

        {companyAlerts.length === 0 && (
          <View style={ms.emptyCard}>
            <View style={ms.emptyIconWrap}>
              <Ionicons name="mail-open-outline" size={28} color={T.textMuted} />
            </View>
            <Text style={ms.emptyTitle}>No applications yet</Text>
            <Text style={ms.emptySub}>When verified candidates apply to your roles, their applications will appear here in real time.</Text>
          </View>
        )}

        {companyAlerts.length > 0 && (
          <View style={ms.sectionHeader}>
            <Ionicons name="information-circle-outline" size={14} color={T.textMuted} />
            <Text style={ms.sectionHeaderText}>System</Text>
          </View>
        )}

        {systemAlerts.map((alert) => (
          <View key={alert.id} style={[ms.alertCard, { backgroundColor: alert.bgColor, borderLeftColor: alert.accent }]}>
            <View style={ms.alertRow}>
              <View style={[ms.alertIconWrap, { backgroundColor: alert.iconBg }]}>
                <Ionicons name={alert.icon} size={18} color={alert.accent} />
              </View>
              <View style={ms.alertContent}>
                <Text style={ms.alertTitle}>{alert.title}</Text>
                <Text style={ms.alertBody}>{alert.body}</Text>
                <Text style={ms.alertTime}>{alert.time}</Text>
              </View>
            </View>
          </View>
        ))}
        </SwipeFadeContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── All Styles (modal + screen merged) ──
const makeStyles = (T: ThemePalette) => StyleSheet.create({
  /* Modal styles */
  overlay: { flex: 1, backgroundColor: T.overlay, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modal: { backgroundColor: T.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 380, maxHeight: '85%', borderWidth: 1, borderColor: T.border },
  closeBtn: { position: 'absolute', top: 16, right: 16, zIndex: 1, width: 32, height: 32, borderRadius: 16, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },

  avatarWrap: { alignItems: 'center', marginBottom: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: T.accentBg, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: '800', color: T.textPrimary, textAlign: 'center' },
  title: { fontSize: 13, color: T.textSecondary, textAlign: 'center', marginTop: 2, marginBottom: 12 },

  appliedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  tierPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tierPillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  appliedRole: { fontSize: 13, fontWeight: '600', color: T.textSecondary },

  divider: { height: 1, backgroundColor: T.border, marginVertical: 16 },

  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },

  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillChip: { backgroundColor: T.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  skillText: { fontSize: 12, fontWeight: '600', color: T.accent },

  rateValue: { fontSize: 20, fontWeight: '800', color: T.textPrimary },

  verHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  regressedTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: T.dangerBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  regressedTagText: { fontSize: 10, fontWeight: '700', color: T.danger },

  verBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  verBadgeText: { fontSize: 13, fontWeight: '700' },
  verSnapshot: { fontSize: 11, color: T.textMuted, fontWeight: '500' },

  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.border },
  checkLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: T.textMuted },
  checkLabelDone: { color: T.emerald },
  checkLabelRevoked: { color: T.danger },
  revokedBadge: { backgroundColor: T.dangerBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  revokedBadgeText: { fontSize: 9, fontWeight: '700', color: T.danger, textTransform: 'uppercase' },

  warningBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: T.amberBg, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: T.amber,
  },
  warningTitle: { fontSize: 13, fontWeight: '800', color: T.amber, marginBottom: 4 },
  warningText: { fontSize: 12, fontWeight: '500', color: T.textSecondary, lineHeight: 17 },
  warningNotice: { fontSize: 11, fontWeight: '700', color: T.amber, marginTop: 8, fontStyle: 'italic' },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: T.accent, borderRadius: 12, height: 44, marginTop: 8, shadowColor: T.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: T.textOnAccent },

  disabledBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: T.surface, borderRadius: 12, height: 44, marginTop: 8, borderWidth: 1, borderColor: T.border },
  disabledBtnText: { fontSize: 15, fontWeight: '700', color: T.textMuted },

  secondaryBtn: { alignItems: 'center', justifyContent: 'center', height: 36, marginTop: 8 },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: T.textMuted },

  /* Screen styles */
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: T.textPrimary },
  headerBadge: { backgroundColor: T.danger, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  headerBadgeText: { fontSize: 11, fontWeight: '700', color: T.white },
  markRead: {},
  markReadText: { fontSize: 13, fontWeight: '600', color: T.accent },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, marginBottom: 4 },
  sectionHeaderText: { fontSize: 12, fontWeight: '700', color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  sectionCount: { backgroundColor: T.emerald, borderRadius: 8, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  sectionCountText: { fontSize: 10, fontWeight: '700', color: T.textOnAccent },

  alertCard: { borderRadius: 14, borderLeftWidth: 3, padding: 16, marginTop: 12, borderWidth: 1, borderColor: T.border },
  alertRow: { flexDirection: 'row', gap: 12 },
  alertIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  alertContent: { flex: 1 },
  alertTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  alertTitle: { fontSize: 14, fontWeight: '700', color: T.textPrimary, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.danger },
  alertBody: { fontSize: 13, color: T.textSecondary, lineHeight: 18, marginBottom: 6 },
  alertTime: { fontSize: 11, color: T.textMuted, marginTop: 4 },

  candidateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  candidateAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: T.accentBg, alignItems: 'center', justifyContent: 'center' },
  candidateName: { fontSize: 14, fontWeight: '700', color: T.textPrimary },
  candidateTitle: { fontSize: 11, color: T.textSecondary, marginTop: 1 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  verifiedBadgeFull: { backgroundColor: T.emeraldBg },
  verifiedBadgePartial: { backgroundColor: T.indigoBg },
  verifiedBadgeText: { fontSize: 10, fontWeight: '700' },

  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  tierMini: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tierMiniText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  roleApplied: { fontSize: 12, fontWeight: '600', color: T.textSecondary },

  reviewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: T.accent, borderRadius: 10, height: 36, marginTop: 12,
  },
  reviewBtnText: { fontSize: 13, fontWeight: '700', color: T.textOnAccent },

  emptyCard: { alignItems: 'center', paddingVertical: 40 },
  emptyIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: T.textPrimary, marginBottom: 6 },
  emptySub: { fontSize: 13, color: T.textSecondary, textAlign: 'center', lineHeight: 18, paddingHorizontal: 20 },
});
