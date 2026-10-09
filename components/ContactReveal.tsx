import { useMemo } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import AppIcon, { AppIconName } from '@/components/AppIcon';
import { Text } from '@/components/Themed';
import { useTheme, ThemePalette, RADIUS, ELEVATION } from '@/lib/theme';
import type { IntroductionContact } from '@/lib/introductionContact';
import AnimatedPressable from '@/components/AnimatedPressable';
import { initials } from '@/lib/format';

// The revealed-contact card shown on an accepted introduction (architecture
// doc §7.4). `viewer` decides which side's details are shown: a candidate sees
// the company + hiring contact; a company sees the candidate.
export default function ContactReveal({
  contact,
  viewer,
}: {
  contact: IntroductionContact;
  viewer: 'candidate' | 'company';
}) {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);

  const open = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={st.card}>
      <View style={st.headRow}>
        <View style={st.headBadge}>
          <AppIcon name="checkmark" size={11} color={T.emerald} />
        </View>
        <Text style={st.headText}>Connected — you can reach out directly</Text>
      </View>

      {viewer === 'candidate' ? (
        <>
          <View style={st.companyHeadRow}>
            <View style={st.companyLogoWrap}>
              {contact.companyLogoUrl ? (
                <Image source={{ uri: contact.companyLogoUrl }} style={st.companyLogo} resizeMode="cover" />
              ) : (
                <AppIcon name="business" size={16} color={T.emerald} />
              )}
            </View>
            <Text style={st.name}>{contact.companyName}</Text>
          </View>
          <View style={st.metaRow}>
            <AppIcon name="business-outline" size={13} color={T.textSecondary} />
            <Text style={st.metaText}>
              {[contact.companyIndustry, contact.companySizeRange].filter(Boolean).join(' · ') || 'Company'}
            </Text>
          </View>
          {contact.companyWebsite ? (
            <Row icon="globe-outline" label={cleanUrl(contact.companyWebsite)} st={st} T={T}
              onPress={() => open(withScheme(contact.companyWebsite!))} />
          ) : null}

          <Text style={st.subhead}>Hiring contact</Text>
          <Text style={st.contactName}>{contact.hiringContactName ?? 'Hiring Manager'}</Text>
          {contact.hiringContactEmail ? (
            <EmailButton label="Email hiring contact" st={st} T={T}
              onPress={() => open(`mailto:${contact.hiringContactEmail}`)} />
          ) : (
            <Text style={st.metaText}>No email on file yet.</Text>
          )}
        </>
      ) : (
        <>
          <View style={st.companyHeadRow}>
            <View style={st.candidateAvatarWrap}>
              <Text style={st.candidateAvatarText}>{initials(contact.candidateName)}</Text>
            </View>
            <Text style={st.name}>{contact.candidateName}</Text>
          </View>
          {contact.candidateEmail && (
            <EmailButton label="Email candidate" st={st} T={T}
              onPress={() => open(`mailto:${contact.candidateEmail}`)} />
          )}
          {contact.candidatePhone ? (
            <Row icon="call-outline" label={contact.candidatePhone} st={st} T={T}
              onPress={() => open(`tel:${contact.candidatePhone}`)} />
          ) : null}
          {!contact.candidateEmail && !contact.candidatePhone ? (
            <Text style={st.metaText}>No contact details on file yet.</Text>
          ) : null}
        </>
      )}
    </View>
  );
}

function Row({ icon, label, onPress, st, T }: {
  icon: AppIconName;
  label: string;
  onPress: () => void;
  st: ReturnType<typeof makeStyles>;
  T: ThemePalette;
}) {
  return (
    <AnimatedPressable style={st.linkRow} onPress={onPress} accessibilityRole="link">
      <AppIcon name={icon} size={14} color={T.accent} />
      <Text style={st.linkText} numberOfLines={1}>{label}</Text>
    </AnimatedPressable>
  );
}

// Raw email addresses used to render as plain clickable text (e.g.
// "temi@gmail.com") — reads as unpolished and exposes the address to
// screenshots/scraping for no reason, since the mailto: action works just
// as well behind a labeled button that never prints the address itself.
function EmailButton({ label, onPress, st, T }: {
  label: string;
  onPress: () => void;
  st: ReturnType<typeof makeStyles>;
  T: ThemePalette;
}) {
  return (
    <AnimatedPressable style={st.emailBtn} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <AppIcon name="mail-outline" size={14} color={T.textOnAccent} />
      <Text style={st.emailBtnText}>{label}</Text>
    </AnimatedPressable>
  );
}

function withScheme(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
function cleanUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  // Was a solid emeraldBg fill edge-to-edge — read as a heavy, dated
  // "banner" rather than a card. T.card + a thin accent-colored top border
  // and a small badge (instead of a full-width green wash) carries the same
  // "this succeeded" signal with far less visual weight.
  card: {
    backgroundColor: T.card,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: T.border,
    borderTopWidth: 3,
    borderTopColor: T.emerald,
    padding: 16,
    gap: 4,
    ...ELEVATION.card,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  headBadge: {
    width: 18, height: 18, borderRadius: RADIUS.chip, backgroundColor: T.emeraldBg,
    alignItems: 'center', justifyContent: 'center',
  },
  headText: { fontSize: 12, fontWeight: '700', color: T.textSecondary, flex: 1 },
  companyHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  companyLogoWrap: {
    width: 28, height: 28, borderRadius: RADIUS.chip, backgroundColor: T.emeraldBg,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  companyLogo: { width: '100%', height: '100%' },
  candidateAvatarWrap: {
    width: 32, height: 32, borderRadius: RADIUS.control, backgroundColor: T.emeraldBg,
    borderWidth: 1, borderColor: T.emerald + '40', alignItems: 'center', justifyContent: 'center',
  },
  candidateAvatarText: { fontSize: 12, fontWeight: '800', color: T.emerald },
  name: { fontSize: 16, fontWeight: '800', color: T.textPrimary },
  subhead: { fontSize: 11, fontWeight: '700', color: T.textMuted, letterSpacing: 0.4, marginTop: 12, textTransform: 'uppercase' },
  contactName: { fontSize: 14, fontWeight: '600', color: T.textPrimary, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  metaText: { fontSize: 12, color: T.textSecondary },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 6 },
  linkText: { fontSize: 13, color: T.accentDim, fontWeight: '600', flexShrink: 1 },
  emailBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: T.accentSolid, borderRadius: RADIUS.control, height: 38, marginTop: 8,
  },
  emailBtnText: { fontSize: 13, fontWeight: '700', color: T.textOnAccent },
});
