import { StyleSheet, View, ScrollView, Pressable, Image } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import SwipeFadeContainer from '@/components/SwipeFadeContainer';
import ScreenFrame from '@/components/ScreenFrame';
import EditCompanyProfileModal, { CompanyEditable } from '@/components/EditCompanyProfileModal';
import { useTheme, useThemeToggle, ThemePalette } from '@/lib/theme';
import { useAuth } from '@/lib/useAuth';
import { useSubscription } from '@/lib/subscriptionStore';
import { supabase } from '@/lib/supabase';
import { pickAndUploadCompanyLogo } from '@/lib/uploadCompanyLogo';
import { notify } from '@/lib/notify';

interface RealCompany extends CompanyEditable {
  verifiedAt: string | null;
  logoUrl: string | null;
}

export default function CompanyProfileScreen() {
  const T = useTheme();
  const { mode, toggleTheme } = useThemeToggle();
  const st = useMemo(() => makeStyles(T), [T]);
  const { companyId, session } = useAuth();
  const { config } = useSubscription();

  const [real, setReal] = useState<RealCompany | null>(null);
  const [teamCount, setTeamCount] = useState<number | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    let alive = true;
    (async () => {
      // logo_url is fetched separately — it's on the same pending migration as
      // full_name/notification_prefs (20260911140000_notification_prefs.sql),
      // and selecting an unknown column fails the whole query, not just that
      // field. Keeping it separate means the rest of this screen still works
      // on a database that hasn't run that migration yet.
      const [{ data: company }, { count }, { data: logoRow }] = await Promise.all([
        supabase.from('companies').select('legal_name, trading_name, industry, size_range, hq_location, website_url, description, verified_at').eq('id', companyId).maybeSingle(),
        supabase.from('company_users').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('companies').select('logo_url').eq('id', companyId).maybeSingle(),
      ]);
      if (!alive) return;
      if (company) {
        setReal({
          legalName: company.legal_name,
          tradingName: company.trading_name,
          industry: company.industry,
          sizeRange: company.size_range,
          hqLocation: company.hq_location,
          websiteUrl: company.website_url,
          description: company.description,
          verifiedAt: company.verified_at,
          logoUrl: logoRow?.logo_url ?? null,
        });
      }
      setTeamCount(count ?? 0);
    })();
    return () => { alive = false; };
  }, [companyId]);

  const handleLogoPress = async () => {
    if (uploadingLogo) return;
    setUploadingLogo(true);
    try {
      const url = await pickAndUploadCompanyLogo();
      setReal((prev) => (prev ? { ...prev, logoUrl: url } : prev));
      notify('Logo updated', 'Your company logo is live.');
    } catch (e: any) {
      if (e?.message !== 'No logo selected.') {
        notify('Upload failed', e?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setUploadingLogo(false);
    }
  };

  const displayName = real?.tradingName || real?.legalName || 'Your Company';
  const isVerified = !!real?.verifiedAt;
  const seatCap = config.teamSeatCap;
  const seatsUsed = teamCount ?? 0;
  const seatPercent = seatCap === -1 ? 100 : Math.min(100, (seatsUsed / Math.max(seatCap, 1)) * 100);

  return (
    <SafeAreaView style={st.container} edges={['top', 'left', 'right']}>
      <ScreenFrame>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        <SwipeFadeContainer>
        {/* ── Header ── */}
        <View style={st.header}>
          <Text style={st.headerTitle}>Company Profile</Text>
          <Pressable onPress={() => router.push('/(company)/settings')} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' }}>
            <AppIcon name="settings-outline" size={20} color={T.textSecondary} />
          </Pressable>
        </View>

        {/* ── Workspace Card ── */}
        <View style={st.workspaceCard}>
          <View style={st.wsTop}>
            <Pressable style={st.wsAvatarWrap} onPress={handleLogoPress} disabled={uploadingLogo} accessibilityRole="button" accessibilityLabel="Change company logo">
              <View style={st.wsAvatar}>
                {real?.logoUrl ? (
                  <Image source={{ uri: real.logoUrl }} style={st.wsAvatarImage} resizeMode="cover" />
                ) : (
                  <AppIcon name="business" size={28} color={T.accent} />
                )}
                {uploadingLogo && (
                  <View style={st.wsAvatarUploadingOverlay}>
                    <AppIcon name="cloud-upload-outline" size={18} color={T.white} />
                  </View>
                )}
              </View>
              <View style={st.wsCameraOverlay}>
                <AppIcon name="camera" size={12} color={T.white} />
              </View>
            </Pressable>
            <View style={st.wsInfo}>
              <Text style={st.wsName}>{displayName}</Text>
              <Text style={st.wsIndustry}>{[real?.industry, real?.sizeRange].filter(Boolean).join(' · ') || 'Add your industry and size'}</Text>
            </View>
          </View>

          <View style={st.wsBadgeRow}>
            <View style={st.tierBadge}>
              <AppIcon name="rocket-launch" size={13} color={T.textOnAccent} />
              <Text style={st.tierBadgeText}>{config.name} Tier</Text>
            </View>
            {isVerified ? (
              <View style={st.verifiedBadge}>
                <AppIcon name="checkmark-circle" size={13} color={T.emerald} />
                <Text style={st.verifiedText}>Verified</Text>
              </View>
            ) : (
              <View style={st.unverifiedBadge}>
                <AppIcon name="time-outline" size={13} color={T.textMuted} />
                <Text style={st.unverifiedText}>Not yet verified</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Company Information Fields ── */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Company Information</Text>

          <View style={st.fieldCard}>
            <View style={st.fieldRow}>
              <View style={st.fieldIconWrap}>
                <AppIcon name="business-outline" size={18} color={T.accent} />
              </View>
              <View style={st.fieldContent}>
                <Text style={st.fieldLabel}>Company Name</Text>
                <Text style={st.fieldValue}>{displayName}</Text>
              </View>
            </View>

            <View style={st.fieldDivider} />

            <View style={st.fieldRow}>
              <View style={st.fieldIconWrap}>
                <AppIcon name="mail-outline" size={18} color={T.accent} />
              </View>
              <View style={st.fieldContent}>
                <Text style={st.fieldLabel}>Signed-in Email</Text>
                <Text style={st.fieldValue}>{session?.user?.email ?? '—'}</Text>
              </View>
            </View>

            <View style={st.fieldDivider} />

            <View style={st.fieldRow}>
              <View style={st.fieldIconWrap}>
                <AppIcon name="globe-outline" size={18} color={T.accent} />
              </View>
              <View style={st.fieldContent}>
                <Text style={st.fieldLabel}>Industry Sector</Text>
                <Text style={st.fieldValue}>{real?.industry || 'Not set'}</Text>
              </View>
            </View>

            <View style={st.fieldDivider} />

            {/* Team seats — the real per-plan limit; job-posting itself has no
                separate cap in this product, so this replaces the old fabricated
                "job slots" figure with something the plan actually enforces
                (see app/(company)/team.tsx, same numbers). */}
            <View style={st.fieldRow}>
              <View style={st.fieldIconWrap}>
                <AppIcon name="people-outline" size={18} color={T.accent} />
              </View>
              <View style={[st.fieldContent, { flex: 1 }]}>
                <Text style={st.fieldLabel}>Team Seats</Text>
                <View style={st.slotRow}>
                  <Text style={st.slotText}>
                    {seatsUsed} of {seatCap === -1 ? 'unlimited' : seatCap} seats used
                  </Text>
                  <Text style={st.slotTier}>{config.name}</Text>
                </View>
                {seatCap !== -1 && (
                  <View style={st.slotBarBg}>
                    <View style={[st.slotBarFill, { width: `${seatPercent}%` }]} />
                  </View>
                )}
                {seatCap !== -1 && (
                  <Text style={st.slotHint}>
                    {Math.max(seatCap - seatsUsed, 0)} seat{Math.max(seatCap - seatsUsed, 0) !== 1 ? 's' : ''} remaining
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* ── Account Actions ── */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Account</Text>

          <Pressable style={st.actionItem} onPress={() => setShowEdit(true)}>
            <View style={[st.actionIconWrap, { backgroundColor: T.accentBg }]}>
              <AppIcon name="create-outline" size={18} color={T.accent} />
            </View>
            <View style={st.actionContent}>
              <Text style={st.actionLabel}>Edit Profile Information</Text>
              <Text style={st.actionDesc}>Update company name, industry, description</Text>
            </View>
            <AppIcon name="chevron-forward" size={18} color={T.textMuted} />
          </Pressable>

          <Pressable style={st.actionItem} onPress={() => router.push('/(company)/subscriptions')}>
            <View style={[st.actionIconWrap, { backgroundColor: T.accentBg }]}>
              <AppIcon name="card-outline" size={18} color={T.accent} />
            </View>
            <View style={st.actionContent}>
              <Text style={st.actionLabel}>Manage Subscription</Text>
              <Text style={st.actionDesc}>Upgrade tier, billing, invoices</Text>
            </View>
            <AppIcon name="chevron-forward" size={18} color={T.textMuted} />
          </Pressable>

          <Pressable style={st.actionItem} onPress={() => router.push('/(company)/team')}>
            <View style={[st.actionIconWrap, { backgroundColor: T.accentBg }]}>
              <AppIcon name="people-outline" size={18} color={T.accent} />
            </View>
            <View style={st.actionContent}>
              <Text style={st.actionLabel}>Team Members</Text>
              <Text style={st.actionDesc}>Manage hiring managers</Text>
            </View>
            <AppIcon name="chevron-forward" size={18} color={T.textMuted} />
          </Pressable>

          <Pressable style={st.actionItem} onPress={toggleTheme}>
            <View style={[st.actionIconWrap, { backgroundColor: T.accentBg }]}>
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

          <Pressable style={st.actionItem} onPress={() => router.push('/(company)/settings')}>
            <View style={[st.actionIconWrap, { backgroundColor: T.accentBg }]}>
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

      <EditCompanyProfileModal
        visible={showEdit}
        companyId={companyId}
        initial={{
          legalName: real?.legalName ?? '',
          tradingName: real?.tradingName ?? null,
          industry: real?.industry ?? null,
          sizeRange: real?.sizeRange ?? null,
          hqLocation: real?.hqLocation ?? null,
          websiteUrl: real?.websiteUrl ?? null,
          description: real?.description ?? null,
        }}
        onClose={() => setShowEdit(false)}
        onSaved={(updated) => setReal((prev) => ({ ...updated, verifiedAt: prev?.verifiedAt ?? null, logoUrl: prev?.logoUrl ?? null }))}
      />
    </SafeAreaView>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingBottom: 32 },

  /* Header */
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: T.textPrimary },

  /* Workspace Card */
  workspaceCard: {
    marginHorizontal: 20, marginBottom: 24, padding: 20, borderRadius: 16,
    backgroundColor: T.card, borderWidth: 1, borderColor: T.border,
  },
  wsTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  wsAvatarWrap: { position: 'relative' },
  wsAvatar: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: T.accentBg,
    borderWidth: 1.5, borderColor: T.accentBg20,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  wsAvatarImage: { width: '100%', height: '100%' },
  wsAvatarUploadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  wsCameraOverlay: {
    position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10,
    backgroundColor: T.accent, borderWidth: 2, borderColor: T.card,
    alignItems: 'center', justifyContent: 'center',
  },
  wsInfo: { flex: 1 },
  wsName: { fontSize: 20, fontWeight: '800', color: T.textPrimary, marginBottom: 2 },
  wsIndustry: { fontSize: 13, color: T.textSecondary },
  wsBadgeRow: { flexDirection: 'row', gap: 8 },
  tierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: T.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  tierBadgeText: { fontSize: 12, fontWeight: '700', color: T.textOnAccent },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: T.emeraldBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  verifiedText: { fontSize: 12, fontWeight: '700', color: T.emerald },
  unverifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: T.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  unverifiedText: { fontSize: 12, fontWeight: '700', color: T.textMuted },

  /* Section */
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 16, fontWeight: '800', color: T.textPrimary,
    paddingHorizontal: 20, marginBottom: 12,
  },

  /* Field Card */
  fieldCard: {
    marginHorizontal: 20, borderRadius: 16, backgroundColor: T.card,
    borderWidth: 1, borderColor: T.border, overflow: 'hidden',
  },
  fieldRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16 },
  fieldIconWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: T.accentBg,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  fieldContent: {},
  fieldLabel: { fontSize: 11, fontWeight: '700', color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 },
  fieldValue: { fontSize: 15, fontWeight: '600', color: T.textPrimary },
  fieldDivider: { height: 1, backgroundColor: T.border, marginLeft: 66 },

  /* Slot allocation */
  slotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  slotText: { fontSize: 15, fontWeight: '600', color: T.textPrimary },
  slotTier: { fontSize: 11, fontWeight: '700', color: T.accent, backgroundColor: T.accentBg20, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  slotBarBg: { height: 8, backgroundColor: T.surface, borderRadius: 4, overflow: 'hidden' },
  slotBarFill: { height: 8, borderRadius: 4, backgroundColor: T.accent },
  slotHint: { fontSize: 11, color: T.textMuted, marginTop: 6 },

  /* Actions */
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: T.card, borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: T.border },
  actionIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionContent: { flex: 1 },
  actionLabel: { fontSize: 15, fontWeight: '700', color: T.textPrimary },
  actionDesc: { fontSize: 12, color: T.textSecondary, marginTop: 2 },

  /* Theme toggle */
  atsToggleTrack: { width: 44, height: 26, borderRadius: 13, justifyContent: 'center', paddingHorizontal: 2 },
  atsToggleThumb: { width: 22, height: 22, borderRadius: 11 },

  /* Sign Out */
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginTop: 8, marginHorizontal: 20 },
  signOutText: { fontSize: 14, fontWeight: '600', color: T.danger },
  versionText: { fontSize: 11, color: T.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 20 },

  /* Talent Pools */
  talentPoolsCard: { backgroundColor: T.card, borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: T.border },
  talentPoolsTextBlock: { marginTop: 8 },
});
