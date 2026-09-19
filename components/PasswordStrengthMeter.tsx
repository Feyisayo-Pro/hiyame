import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import { useTheme, ThemePalette } from '@/lib/theme';

// Signup forms only ever validated the password on submit (length >= 6,
// nothing else) — no feedback while typing at all. This doesn't add a new
// requirement (still 6 chars minimum, same as the real validate() check
// this sits next to), it just gives real-time feedback on what you're
// typing instead of silence until you hit submit.
export function passwordStrength(pw: string): { label: string; color: 'danger' | 'amber' | 'emerald'; segments: number } {
  if (!pw) return { label: '', color: 'danger', segments: 0 };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { label: 'Weak', color: 'danger', segments: 1 };
  if (score <= 3) return { label: 'Fair', color: 'amber', segments: 2 };
  return { label: 'Strong', color: 'emerald', segments: 3 };
}

export default function PasswordStrengthMeter({ password }: { password: string }) {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  if (!password) return null;

  const { label, color, segments } = passwordStrength(password);
  const activeColor = T[color];

  return (
    <View style={st.wrap}>
      <View style={st.bars}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[st.bar, i < segments && { backgroundColor: activeColor }]} />
        ))}
      </View>
      <Text style={[st.label, { color: activeColor }]}>{label}</Text>
    </View>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginLeft: 4 },
  bars: { flexDirection: 'row', gap: 4, flex: 1, maxWidth: 120 },
  bar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: T.border },
  label: { fontSize: 11.5, fontWeight: '700' },
});
