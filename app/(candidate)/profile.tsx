import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useMemo } from 'react';
import { Text } from '@/components/Themed';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCandidateProfile } from '@/lib/candidateProfile';
import { useVerification } from '@/lib/useVerification';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import { useTheme, useThemeToggle, ThemePalette } from '@/lib/theme';

export default function CandidateProfileScreen() {
  const T = useTheme();
  const { mode, toggleTheme } = useThemeToggle();
  const st = useMemo(() => makeStyles(T), [T]);

  const { fullName, professionalTitle, coreSkills, targetMinRate, photos, setPhotos, profileCompleted } = useCandidateProfile();
  const verification = useVerification();
  const { completedCount, totalCount, isFullyVerified } = verification;

  const displayName = fullName || 'Anonymous Professional';
  const displayTitle = professionalTitle || 'Career Professional';
  const hasProfilePhoto = photos.length > 0;

  const checklistItems = [
    { icon: 'camera-outline' as const, label: 'Profile Picture', done: hasProfilePhoto, optional: true },
    { icon: 'id-card-outline' as const, label: 'Identity Check', done: verification.identityVerified, optional: false },
    { icon: 'videocam-outline' as const, label: 'Video Introduction', done: verification.videoIntroUploaded, optional: false },
    { icon: 'shield-checkmark-outline' as const, label: 'Skills Assessment', done: verification.assessmentCompleted, optional: false },
    { icon: 'star-outline' as const, label: 'Employer Review', done: verification.employerReviewSecured, optional: false },
  ];

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        <SwipeFadeContainer>
        {/* ── Header ── */}
        <View style={st.header}>
          <Text style={st.headerTitle}>Profile</Text>
          <Pressable onPress={() => router.push('/(candidate)/settings')} style={st.settingsBtn}>
            <Ionicons name="settings-outline" size={20} color={T.textSecondary} />
          </Pressable>
        </View>

        {/* ── Personal Card ── */}
        <View style={st.personalCard}>
          <Pressable
            style={st.avatarWrap}
            onPress={() => {
              const mockUri = `mock-photo://${Date.now()}-${photos.length}`;
              setPhotos([...photos, mockUri]);
              Alert.alert('Photo Upload', 'Profile picture added! In production this will open your camera roll.');
            }}
          >
            <View style={[st.avatar, isFullyVerified && st.avatarVerified]}>
              <Ionicons name="person" size={28} color={T.accent} />
            </View>
            {/* Camera overlay */}
            <View style={st.cameraOverlay}>
              <Ionicons name="camera" size={14} color={T.white} />
            </View>
            {isFullyVerified && (
              <View style={st.verifiedCheck}>
                <MaterialCommunityIcons name="decagram" size={22} color={T.emerald} />
              </View>
            )}
          </Pressable>

          <Text style={st.name}>{displayName}</Text>
          <Text style={st.title}>{displayTitle}</Text>

          {/* Verification badge */}
          <View style={[st.verBadge, isFullyVerified ? st.verBadgeFull : st.verBadgePartial]}>
            <Ionicons
              name="shield-checkmark"
              size={13}
              color={isFullyVerified ? T.emerald : T.accent}
            />
            <Text style={[st.verBadgeText, { color: isFullyVerified ? T.emerald : T.accent }]}>
              {isFullyVerified ? 'Fully Verified' : `${completedCount}/${totalCount} Verified`}
            </Text>
          </View>

          {/* Target Rate */}
          {targetMinRate > 0 && (
            <View style={st.rateRow}>
              <Ionicons name="cash-outline" size={16} color={T.accent} />
              <Text style={st.rateLabel}>Target Min Rate</Text>
              <Text style={st.rateValue}>${targetMinRate.toLocaleString()}/mo</Text>
            </View>
          )}
        </View>

        {/* ── Core Skills ── */}
        <View style={st.section}>
          <View style={st.sectionRow}>
            <Text style={st.sectionTitle}>Core Skills</Text>
            <View style={st.skillCount}>
              <Text style={st.skillCountText}>{coreSkills.length}</Text>
            </View>
          </View>

          {coreSkills.length > 0 ? (
            <View style={st.skillsWrap}>
              {coreSkills.map((skill) => (
                <View key={skill} style={st.skillChip}>
                  <Text style={st.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={st.emptySkills}>
              <Ionicons name="sparkles-outline" size={20} color={T.textMuted} />
              <Text style={st.emptySkillsText}>Complete your profile to add skills</Text>
            </View>
          )}
        </View>

        {/* ── Verification Checklist ── */}
        <View style={st.section}>
          <View style={st.sectionRow}>
            <Text style={st.sectionTitle}>Verification Status</Text>
            <Pressable onPress={() => router.push('/(candidate)/verification')} style={st.seeAll}>
              <Text style={st.seeAllText}>Manage</Text>
              <Ionicons name="arrow-forward" size={14} color={T.accent} />
            </Pressable>
          </View>

          {/* Progress bar */}
          <View style={st.progressCard}>
            <View style={st.progressHeader}>
              <Text style={st.progressLabel}>
                {isFullyVerified ? 'All checks complete' : `${completedCount} of ${totalCount} complete`}
              </Text>
              <Text style={[st.progressPercent, isFullyVerified && { color: T.emerald }]}>
                {Math.round((completedCount / totalCount) * 100)}%
              </Text>
            </View>
            <View style={st.progressBarBg}>
              <View
                style={[
                  st.progressBarFill,
                  {
                    width: `${(completedCount / totalCount) * 100}%`,
                    backgroundColor: isFullyVerified ? T.emerald : T.accent,
                  },
                ]}
              />
            </View>
          </View>

          {/* Checklist items */}
          <View style={st.checklistCard}>
            {checklistItems.map((item, i) => (
              <Pressable
                key={item.label}
                style={[st.checkItem, i < checklistItems.length - 1 && st.checkItemBorder]}
                onPress={() => router.push('/(candidate)/verification')}
              >
                <View style={[st.checkIconWrap, item.done ? st.checkIconDone : st.checkIconPending]}>
                  <Ionicons
                    name={item.done ? 'checkmark-circle' : item.icon}
                    size={18}
                    color={item.done ? T.emerald : T.accent}
                  />
                </View>
                <Text style={[st.checkLabel, item.done && st.checkLabelDone]}>{item.label}</Text>
                <View style={[st.checkStatus, item.done ? st.checkStatusDone : st.checkStatusPending]}>
                  <Text style={[st.checkStatusText, item.done ? st.checkStatusTextDone : st.checkStatusTextPending]}>
                    {item.done ? 'Done' : item.optional ? 'Optional' : 'Pending'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Quick Stats ── */}
        <View style={st.statsRow}>
          <View style={st.statCard}>
            <View style={[st.statIconWrap, { backgroundColor: T.accentBg }]}>
              <Ionicons name="heart" size={16} color={T.accent} />
            </View>
            <Text style={st.statValue}>0</Text>
            <Text style={st.statLabel}>Matches</Text>
          </View>
          <View style={st.statCard}>
            <View style={[st.statIconWrap, { backgroundColor: T.accentBg }]}>
              <Ionicons name="bookmark" size={16} color={T.accent} />
            </View>
            <Text style={st.statValue}>0</Text>
            <Text style={st.statLabel}>Saved</Text>
          </View>
          <View style={st.statCard}>
            <View style={[st.statIconWrap, { backgroundColor: T.emeraldBg }]}>
              <Ionicons name="people" size={16} color={T.emerald} />
            </View>
            <Text style={st.statValue}>0</Text>
            <Text style={st.statLabel}>Intros</Text>
          </View>
        </View>

        {/* ── Account Actions ── */}
        <View style={st.section}>
          <Pressable style={st.actionItem}>
            <View style={st.actionIconWrap}>
              <Ionicons name="create-outline" size={18} color={T.accent} />
            </View>
            <View style={st.actionContent}>
              <Text style={st.actionLabel}>Edit Profile</Text>
              <Text style={st.actionDesc}>Update name, title, skills, rate, photos</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
          </Pressable>

          <Pressable style={st.actionItem} onPress={toggleTheme}>
            <View style={st.actionIconWrap}>
              <Ionicons name={mode === 'light' ? 'sunny-outline' : 'moon-outline'} size={18} color={T.accent} />
            </View>
            <View style={st.actionContent}>
              <Text style={st.actionLabel}>Appearance</Text>
              <Text style={st.actionDesc}>{mode === 'light' ? 'Light Mode' : 'Dark Mode'}</Text>
            </View>
            <View style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: mode === 'dark' ? T.accent : T.surface, justifyContent: 'center', paddingHorizontal: 2 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: T.white, alignSelf: mode === 'dark' ? 'flex-end' : 'flex-start' }} />
            </View>
          </Pressable>

          <Pressable style={st.actionItem}>
            <View style={st.actionIconWrap}>
              <Ionicons name="settings-outline" size={18} color={T.accent} />
            </View>
            <View style={st.actionContent}>
              <Text style={st.actionLabel}>Settings</Text>
              <Text style={st.actionDesc}>Notifications, privacy, preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
          </Pressable>
        </View>

        {/* ── Sign Out ── */}
        <Pressable style={st.signOutBtn} onPress={() => router.replace('/(auth)/welcome')}>
          <Ionicons name="log-out-outline" size={18} color={T.danger} />
          <Text style={st.signOutText}>Sign Out</Text>
        </Pressable>

        <View style={{ height: 16 }} />
        </SwipeFadeContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingBottom: 32 },

  /* Header */
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: T.textPrimary },
  settingsBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },

  /* Personal Card */
  personalCard: {
    alignItems: 'center', marginHorizontal: 20, marginBottom: 24, padding: 24, borderRadius: 16,
    backgroundColor: T.card, borderWidth: 1, borderColor: T.border,
  },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: T.surface,
    borderWidth: 2.5, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarVerified: { borderColor: T.emerald },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: T.card,
  },
  verifiedCheck: { position: 'absolute', bottom: -2, right: -2, backgroundColor: T.card, borderRadius: 12, padding: 1 },
  name: { fontSize: 20, fontWeight: '800', color: T.textPrimary, marginBottom: 2 },
  title: { fontSize: 14, color: T.textSecondary, marginBottom: 12 },
  verBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  verBadgeFull: { backgroundColor: T.emeraldBg },
  verBadgePartial: { backgroundColor: T.accentBg },
  verBadgeText: { fontSize: 12, fontWeight: '700' },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: T.border, width: '100%', justifyContent: 'center' },
  rateLabel: { fontSize: 13, color: T.textMuted, fontWeight: '500' },
  rateValue: { fontSize: 16, fontWeight: '800', color: T.textPrimary },

  /* Section */
  section: { marginBottom: 24, paddingHorizontal: 20 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: T.textPrimary },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText: { fontSize: 13, fontWeight: '600', color: T.accent },

  /* Skills */
  skillCount: { backgroundColor: T.accent, borderRadius: 10, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  skillCountText: { fontSize: 11, fontWeight: '700', color: T.textOnAccent },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: { backgroundColor: T.accentBg, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: T.accentBg20 },
  skillText: { fontSize: 13, fontWeight: '600', color: T.accent },
  emptySkills: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: T.border },
  emptySkillsText: { fontSize: 13, color: T.textMuted, fontWeight: '500' },

  /* Progress */
  progressCard: { marginBottom: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontSize: 13, fontWeight: '600', color: T.textSecondary },
  progressPercent: { fontSize: 14, fontWeight: '800', color: T.accent },
  progressBarBg: { height: 6, backgroundColor: T.surface, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 6, borderRadius: 3 },

  /* Checklist */
  checklistCard: { borderRadius: 14, backgroundColor: T.card, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  checkItemBorder: { borderBottomWidth: 1, borderBottomColor: T.border },
  checkIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  checkIconDone: { backgroundColor: T.emeraldBg },
  checkIconPending: { backgroundColor: T.accentBg },
  checkLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: T.textPrimary },
  checkLabelDone: { color: T.emerald },
  checkStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  checkStatusDone: { backgroundColor: T.emeraldBg },
  checkStatusPending: { backgroundColor: T.amberBg },
  checkStatusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  checkStatusTextDone: { color: T.emerald },
  checkStatusTextPending: { color: T.amber },

  /* Stats */
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: T.card, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 14, alignItems: 'center' },
  statIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '800', color: T.textPrimary, marginBottom: 2 },
  statLabel: { fontSize: 11, color: T.textMuted, fontWeight: '600' },

  /* Actions */
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: T.card, borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: T.border },
  actionIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: T.accentBg, alignItems: 'center', justifyContent: 'center' },
  actionContent: { flex: 1 },
  actionLabel: { fontSize: 15, fontWeight: '700', color: T.textPrimary },
  actionDesc: { fontSize: 12, color: T.textSecondary, marginTop: 2 },

  /* Sign Out */
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginTop: 8, marginHorizontal: 20 },
  signOutText: { fontSize: 14, fontWeight: '600', color: T.danger },
  versionText: { fontSize: 11, color: T.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 20 },
});
