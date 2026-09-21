import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCandidateProfile } from '@/lib/candidateProfile';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import { pickAndUploadCandidatePhoto } from '@/lib/uploadCandidatePhoto';
import { getCandidateStats, CandidateStats } from '@/lib/dashboardStats';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import ScreenFrame from '@/components/ScreenFrame';
import EditCandidateProfileModal from '@/components/EditCandidateProfileModal';
import PortfolioSection from '@/components/PortfolioSection';
import { useTheme, useThemeToggle, ThemePalette, DISPLAY_FONT_FAMILY } from '@/lib/theme';
import { SkeletonBlock } from '@/components/Skeleton';
import { notify } from '@/lib/notify';
import { formatNaira } from '@/lib/currency';
import { FULL_VERIFICATION_THRESHOLD } from '@/lib/verification';
import { usePersonaGuard } from '@/lib/usePersonaGuard';
import PageHead from '@/components/PageHead';

interface RealProfile {
  fullName: string;
  skillTags: string[];
  ratePreferred: number | null;
  photoUrl: string | null;
}

// Matches the 4 components lib/matchingPipeline.ts scores against — same keys
// app/(candidate)/index.tsx already reads from verification_records for the
// home-screen checklist.
const VERIFICATION_COMPONENTS = [
  { key: 'identity', icon: 'id-card-outline' as const, label: 'Identity Check' },
  { key: 'video_intro', icon: 'videocam-outline' as const, label: 'Video Introduction' },
  { key: 'skills_assessment', icon: 'shield-checkmark-outline' as const, label: 'Skills Assessment' },
  { key: 'employer_review', icon: 'star-outline' as const, label: 'Employer Review' },
];

export default function CandidateProfileScreen() {
  usePersonaGuard('candidate');
  const T = useTheme();
  const { mode, toggleTheme } = useThemeToggle();
  const st = useMemo(() => makeStyles(T), [T]);
  const { candidateId } = useAuth();

  // The professional-title field still has nowhere real to live (no such
  // column exists on candidates, and nothing ever collects it) — that stays
  // on lib/candidateProfile's mock for now. Everything else on this screen
  // (name, skills, rate, photo, and the verification checklist below) reads
  // the real candidates / verification_records rows.
  const { professionalTitle } = useCandidateProfile();

  const [real, setReal] = useState<RealProfile | null>(null);
  const [passedComponents, setPassedComponents] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<CandidateStats | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const loadReal = async () => {
    if (!candidateId) return;
    const [{ data }, { data: vrecs }, candidateStats] = await Promise.all([
      supabase.from('candidates').select('full_name, skill_tags, rate_preferred, photo_url').eq('id', candidateId).maybeSingle(),
      supabase.from('verification_records').select('component, status').eq('candidate_id', candidateId),
      getCandidateStats(candidateId),
    ]);
    if (data) {
      setReal({
        fullName: data.full_name,
        skillTags: data.skill_tags ?? [],
        ratePreferred: data.rate_preferred,
        photoUrl: data.photo_url,
      });
    }
    setPassedComponents(new Set((vrecs ?? []).filter((v) => v.status === 'passed').map((v) => v.component)));
    setStats(candidateStats);
  };

  useEffect(() => { loadReal(); }, [candidateId]);

  const displayName = real?.fullName || 'Anonymous Professional';
  const displayTitle = professionalTitle || 'Career Professional';
  const coreSkills = real?.skillTags ?? [];
  const targetMinRate = real?.ratePreferred ?? 0;
  const photoUrl = real?.photoUrl ?? null;
  const hasProfilePhoto = !!photoUrl;

  const completedCount = passedComponents.size;
  const totalCount = VERIFICATION_COMPONENTS.length;
  const isFullyVerified = completedCount >= FULL_VERIFICATION_THRESHOLD;

  const handlePhotoPress = async () => {
    if (uploading) return;
    setUploading(true);
    try {
      const url = await pickAndUploadCandidatePhoto();
      setReal((prev) => (prev ? { ...prev, photoUrl: url } : prev));
      notify('Photo updated', 'Your profile photo is live.');
    } catch (e: any) {
      if (e?.message !== 'No photo selected.') {
        notify('Upload failed', e?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  const checklistItems = [
    { icon: 'camera-outline' as const, label: 'Profile Picture', done: hasProfilePhoto, optional: true },
    ...VERIFICATION_COMPONENTS.map((c) => ({ icon: c.icon, label: c.label, done: passedComponents.has(c.key), optional: false })),
  ];

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <PageHead title="Your Profile" />
      <ScreenFrame>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        <SwipeFadeContainer>
        {/* ── Header ── */}
        <View style={st.header}>
          <Text style={st.headerTitle}>Profile</Text>
          <Pressable onPress={() => router.push('/(candidate)/settings')} style={st.settingsBtn}>
            <AppIcon name="settings-outline" size={20} color={T.textSecondary} />
          </Pressable>
        </View>

        {/* ── Personal Card ── */}
        {real === null ? (
          // Was showing "Anonymous Professional" for the brief window before
          // the real candidates row loads — a fake-looking name flash is
          // worse than an honest loading skeleton.
          <View style={st.personalCard}>
            <SkeletonBlock width={96} height={96} radius={48} style={{ marginBottom: 14 }} />
            <SkeletonBlock width={170} height={20} radius={6} style={{ marginBottom: 8 }} />
            <SkeletonBlock width={120} height={14} radius={6} />
          </View>
        ) : (
          <View style={st.personalCard}>
            <Pressable style={st.avatarWrap} onPress={handlePhotoPress} disabled={uploading} accessibilityRole="button" accessibilityLabel="Change profile photo">
              <View style={[st.avatar, isFullyVerified && st.avatarVerified]}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={st.avatarImage} resizeMode="cover" />
                ) : (
                  <AppIcon name="person" size={28} color={T.accent} />
                )}
                {uploading && (
                  <View style={st.avatarUploadingOverlay}>
                    <AppIcon name="cloud-upload-outline" size={20} color={T.white} />
                  </View>
                )}
              </View>
              {/* Camera overlay */}
              <View style={st.cameraOverlay}>
                <AppIcon name="camera" size={14} color={T.white} />
              </View>
              {isFullyVerified && (
                <View style={st.verifiedCheck}>
                  <AppIcon name="decagram" size={22} color={T.emerald} />
                </View>
              )}
            </Pressable>

            <Text style={st.name}>{displayName}</Text>
            <Text style={st.title}>{displayTitle}</Text>

            {/* Verification badge */}
            <View style={[st.verBadge, isFullyVerified ? st.verBadgeFull : st.verBadgePartial]}>
              <AppIcon
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
                <AppIcon name="cash-outline" size={16} color={T.accent} />
                <Text style={st.rateLabel}>Target Min Rate</Text>
                <Text style={st.rateValue}>{formatNaira(targetMinRate)}/mo</Text>
              </View>
            )}
          </View>
        )}

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
              <AppIcon name="code-slash-outline" size={20} color={T.textMuted} />
              <Text style={st.emptySkillsText}>Complete your profile to add skills</Text>
            </View>
          )}
        </View>

        {/* ── Portfolio ── */}
        <PortfolioSection candidateId={candidateId} />

        {/* ── Verification Checklist ── */}
        <View style={st.section}>
          <View style={st.sectionRow}>
            <Text style={st.sectionTitle}>Verification Status</Text>
            <Pressable onPress={() => router.push('/(candidate)/verification')} style={st.seeAll}>
              <Text style={st.seeAllText}>Manage</Text>
              <AppIcon name="arrow-forward" size={14} color={T.accent} />
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
                  <AppIcon
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

        {/* ── Quick Stats — real introduction counts, same source as Home
              (lib/dashboardStats.ts). The old "Matches" / "Saved" tiles here
              were hardcoded to 0 — neither concept exists anywhere in this
              app (nothing lets a candidate browse or save a listing), so
              they're dropped rather than wired to fake data. Verification
              stays out of this row since the checklist right below already
              covers it in full. */}
        <View style={st.statsRow}>
          <View style={st.statCard}>
            <View style={[st.statIconWrap, { backgroundColor: T.accentBg }]}>
              <AppIcon name="mail-unread" size={16} color={T.accent} />
            </View>
            <Text style={st.statValue}>{stats?.introsPending ?? 0}</Text>
            <Text style={st.statLabel}>To respond</Text>
          </View>
          <View style={st.statCard}>
            <View style={[st.statIconWrap, { backgroundColor: T.emeraldBg }]}>
              <AppIcon name="people" size={16} color={T.emerald} />
            </View>
            <Text style={st.statValue}>{stats?.introsAccepted ?? 0}</Text>
            <Text style={st.statLabel}>Connected</Text>
          </View>
        </View>

        {/* ── Account Actions ── */}
        <View style={st.section}>
          <Pressable style={st.actionItem} onPress={() => setShowEdit(true)}>
            <View style={st.actionIconWrap}>
              <AppIcon name="create-outline" size={18} color={T.accent} />
            </View>
            <View style={st.actionContent}>
              <Text style={st.actionLabel}>Edit Profile</Text>
              <Text style={st.actionDesc}>Update name, skills, rate</Text>
            </View>
            <AppIcon name="chevron-forward" size={18} color={T.textMuted} />
          </Pressable>

          <Pressable style={st.actionItem} onPress={toggleTheme}>
            <View style={st.actionIconWrap}>
              <AppIcon name={mode === 'light' ? 'sunny-outline' : 'moon-outline'} size={18} color={T.accent} />
            </View>
            <View style={st.actionContent}>
              <Text style={st.actionLabel}>Appearance</Text>
              <Text style={st.actionDesc}>{mode === 'light' ? 'Light Mode' : 'Dark Mode'}</Text>
            </View>
            <View style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: mode === 'dark' ? T.accent : T.surface, justifyContent: 'center', paddingHorizontal: 2 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: T.white, alignSelf: mode === 'dark' ? 'flex-end' : 'flex-start' }} />
            </View>
          </Pressable>

          <Pressable style={st.actionItem} onPress={() => router.push('/(candidate)/welcome-tour' as any)}>
            <View style={st.actionIconWrap}>
              <AppIcon name="help-buoy-outline" size={18} color={T.accent} />
            </View>
            <View style={st.actionContent}>
              <Text style={st.actionLabel}>How Hiyame works</Text>
              <Text style={st.actionDesc}>Replay the welcome walkthrough</Text>
            </View>
            <AppIcon name="chevron-forward" size={18} color={T.textMuted} />
          </Pressable>

          <Pressable style={st.actionItem} onPress={() => router.push('/(candidate)/settings')}>
            <View style={st.actionIconWrap}>
              <AppIcon name="settings-outline" size={18} color={T.accent} />
            </View>
            <View style={st.actionContent}>
              <Text style={st.actionLabel}>Settings</Text>
              <Text style={st.actionDesc}>Notifications, privacy, preferences</Text>
            </View>
            <AppIcon name="chevron-forward" size={18} color={T.textMuted} />
          </Pressable>
        </View>

        {/* ── Sign Out ── */}
        <Pressable style={st.signOutBtn} onPress={() => supabase.auth.signOut()}>
          <AppIcon name="log-out-outline" size={18} color={T.danger} />
          <Text style={st.signOutText}>Sign Out</Text>
        </Pressable>

        <View style={{ height: 16 }} />
        </SwipeFadeContainer>
      </ScrollView>
      </ScreenFrame>

      <EditCandidateProfileModal
        visible={showEdit}
        candidateId={candidateId}
        initial={{ fullName: real?.fullName ?? '', skillTags: coreSkills, ratePreferred: real?.ratePreferred ?? null }}
        onClose={() => setShowEdit(false)}
        onSaved={(updated) => setReal((prev) => ({ fullName: updated.fullName, skillTags: updated.skillTags, ratePreferred: updated.ratePreferred, photoUrl: prev?.photoUrl ?? null }))}
      />
    </SafeAreaView>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingBottom: 32 },

  /* Header */
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: T.textPrimary, fontFamily: DISPLAY_FONT_FAMILY },
  settingsBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },

  /* Personal Card */
  personalCard: {
    alignItems: 'center', marginHorizontal: 20, marginBottom: 24, padding: 24, borderRadius: 16,
    backgroundColor: T.card, borderWidth: 1, borderColor: T.border,
  },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: T.surface,
    borderWidth: 2.5, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarVerified: { borderColor: T.emerald },
  avatarImage: { width: '100%', height: '100%' },
  avatarUploadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,20,25,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
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
  seeAllText: { fontSize: 13, fontWeight: '600', color: T.accentDim },

  /* Skills */
  skillCount: { backgroundColor: T.accent, borderRadius: 10, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  skillCountText: { fontSize: 11, fontWeight: '700', color: T.textOnAccent },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: { backgroundColor: T.accentBg, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: T.accentBg20 },
  skillText: { fontSize: 13, fontWeight: '600', color: T.accentDim },
  emptySkills: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: T.border },
  emptySkillsText: { fontSize: 13, color: T.textMuted, fontWeight: '500' },

  /* Progress */
  progressCard: { marginBottom: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontSize: 13, fontWeight: '600', color: T.textSecondary },
  progressPercent: { fontSize: 14, fontWeight: '800', color: T.accentDim },
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
