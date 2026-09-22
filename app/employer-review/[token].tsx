import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemePalette, DISPLAY_FONT_FAMILY } from '@/lib/theme';
import PageHead from '@/components/PageHead';

// Public, unauthenticated route — reached only via the emailed link
// api/request-employer-review.ts sends. No sign-in, no Hiyame account: the
// token in the URL is the reviewer's only credential, checked server-side
// by api/submit-employer-review-token.ts. app/_layout.tsx's AuthGate has a
// short allowlist so a signed-out visitor here isn't bounced to /welcome
// the way every other route would be.

function StarRow({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  const T = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label}</Text>
      <View style={s.starRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={6}>
            <AppIcon name={n <= value ? 'star' : 'star-outline'} size={28} color={n <= value ? T.amber : T.textMuted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function EmployerReviewScreen() {
  const T = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  const { token } = useLocalSearchParams<{ token: string }>();

  const [quality, setQuality] = useState(0);
  const [reliability, setReliability] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [wouldRehire, setWouldRehire] = useState<boolean | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const canSubmit = quality > 0 && reliability > 0 && communication > 0 && wouldRehire !== null && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/employer-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          token,
          qualityRating: quality,
          reliabilityRating: reliability,
          communicationRating: communication,
          wouldRehire,
          reviewText,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Could not submit your review.');
      setDone(true);
    } catch (e: any) {
      setError(e?.message || 'Could not submit your review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={s.container} edges={['top', 'left', 'right', 'bottom']}>
        <PageHead title="Thank You" />
        <View style={s.centerWrap}>
          <View style={s.doneIconWrap}>
            <AppIcon name="checkmark-circle" size={40} color={T.emerald} />
          </View>
          <Text style={s.title}>Thank you</Text>
          <Text style={s.body}>Your review has been submitted. You can close this page.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'left', 'right', 'bottom']}>
      <PageHead title="Leave a Reference" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.brand}>Hiyame</Text>
          <Text style={s.title}>Leave a Reference</Text>
          <Text style={s.subtitle}>You were listed as a past employer or client. This takes under a minute — no account needed.</Text>
        </View>

        <StarRow label="Quality of work" value={quality} onChange={setQuality} />
        <StarRow label="Reliability" value={reliability} onChange={setReliability} />
        <StarRow label="Communication" value={communication} onChange={setCommunication} />

        <View style={s.fieldWrap}>
          <Text style={s.label}>Would you work with them again?</Text>
          <View style={s.rehireRow}>
            <Pressable style={[s.rehireBtn, wouldRehire === true && s.rehireBtnActive]} onPress={() => setWouldRehire(true)}>
              <Text style={[s.rehireBtnText, wouldRehire === true && s.rehireBtnTextActive]}>Yes</Text>
            </Pressable>
            <Pressable style={[s.rehireBtn, wouldRehire === false && s.rehireBtnActive]} onPress={() => setWouldRehire(false)}>
              <Text style={[s.rehireBtnText, wouldRehire === false && s.rehireBtnTextActive]}>No</Text>
            </Pressable>
          </View>
        </View>

        <View style={s.fieldWrap}>
          <Text style={s.label}>Additional comments (optional)</Text>
          <TextInput
            style={s.textArea}
            value={reviewText}
            onChangeText={setReviewText}
            placeholder="Anything else worth sharing about working with them"
            placeholderTextColor={T.textMuted}
            multiline
            numberOfLines={4}
          />
        </View>

        {error ? <Text style={s.errorText}>{error}</Text> : null}

        <Pressable style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]} onPress={submit} disabled={!canSubmit}>
          {submitting ? <ActivityIndicator color={T.textOnAccent} /> : <Text style={s.submitBtnText}>Submit Review</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { padding: 24, paddingBottom: 48, maxWidth: 480, width: '100%', alignSelf: 'center' },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  doneIconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: T.emeraldBg, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },

  header: { marginBottom: 24 },
  brand: { fontSize: 14, fontWeight: '800', color: T.accentDim, marginBottom: 12, letterSpacing: -0.2 },
  title: { fontSize: 24, fontWeight: '800', color: T.textPrimary, fontFamily: DISPLAY_FONT_FAMILY, textAlign: 'center' },
  subtitle: { fontSize: 14, color: T.textSecondary, marginTop: 6, lineHeight: 20 },
  body: { fontSize: 14, color: T.textSecondary, textAlign: 'center', lineHeight: 20 },

  fieldWrap: { marginBottom: 22 },
  label: { fontSize: 13, fontWeight: '700', color: T.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.3 },
  starRow: { flexDirection: 'row', gap: 10 },

  rehireRow: { flexDirection: 'row', gap: 10 },
  rehireBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface },
  rehireBtnActive: { borderColor: T.accent, backgroundColor: T.accentBg },
  rehireBtnText: { fontSize: 14, fontWeight: '700', color: T.textSecondary },
  rehireBtnTextActive: { color: T.accentDim },

  textArea: { minHeight: 90, borderRadius: 14, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface, padding: 14, fontSize: 14, color: T.textPrimary, textAlignVertical: 'top' },

  errorText: { fontSize: 13, color: T.danger, marginBottom: 12, textAlign: 'center' },
  submitBtn: { backgroundColor: T.accentSolid, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: T.textOnAccent, fontWeight: '700', fontSize: 15 },
});
