import { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Themed';
import { useTheme, ThemePalette } from '@/lib/theme';
import type { IntroductionContact } from '@/lib/introductionContact';

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
        <Ionicons name="sparkles" size={14} color={T.emerald} />
        <Text style={st.headText}>Introduction accepted — you can now reach out directly</Text>
      </View>

      {viewer === 'candidate' ? (
        <>
          <Text style={st.name}>{contact.companyName}</Text>
          <View style={st.metaRow}>
            <Ionicons name="business-outline" size={13} color={T.textSecondary} />
            <Text style={st.metaText}>
              {[contact.companyIndustry, contact.companySizeRange].filter(Boolean).join(' · ') || 'Company'}
            </Text>
          </View>
          {contact.companyWebsite ? (
            <Row icon="globe-outline" label={cleanUrl(contact.companyWebsite)} st={st} T={T}
              onPress={() => open(withScheme(contact.companyWebsite!))} />
          ) : null}

          <Text style={st.subhead}>Hiring contact</Text>
          <Text style={st.contactName}>{contact.hiringContactName ?? 'Hiring team'}</Text>
          {contact.hiringContactEmail ? (
            <Row icon="mail-outline" label={contact.hiringContactEmail} st={st} T={T}
              onPress={() => open(`mailto:${contact.hiringContactEmail}`)} />
          ) : (
            <Text style={st.metaText}>No email on file yet.</Text>
          )}
        </>
      ) : (
        <>
          <Text style={st.name}>{contact.candidateName}</Text>
          {contact.candidateEmail ? (
            <Row icon="mail-outline" label={contact.candidateEmail} st={st} T={T}
              onPress={() => open(`mailto:${contact.candidateEmail}`)} />
          ) : null}
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
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  st: ReturnType<typeof makeStyles>;
  T: ThemePalette;
}) {
  return (
    <Pressable style={st.linkRow} onPress={onPress} accessibilityRole="link">
      <Ionicons name={icon} size={14} color={T.accent} />
      <Text style={st.linkText} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function withScheme(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
function cleanUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  card: {
    backgroundColor: T.emeraldBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.emerald + '40',
    padding: 14,
    gap: 4,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  headText: { fontSize: 11, fontWeight: '700', color: T.emerald, flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: T.textPrimary },
  subhead: { fontSize: 11, fontWeight: '700', color: T.textMuted, letterSpacing: 0.4, marginTop: 12, textTransform: 'uppercase' },
  contactName: { fontSize: 14, fontWeight: '600', color: T.textPrimary, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  metaText: { fontSize: 12, color: T.textSecondary },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 6 },
  linkText: { fontSize: 13, color: T.accent, fontWeight: '600', flexShrink: 1 },
});
