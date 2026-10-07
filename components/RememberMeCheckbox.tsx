import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import AppIcon from '@/components/AppIcon';
import AnimatedPressable from '@/components/AnimatedPressable';
import { useTheme, ThemePalette } from '@/lib/theme';

// Shared by candidate-signin.tsx and company-signin.tsx, same row as
// "Forgot password?". Controls lib/supabase.ts's storage adapter (set via
// setRememberMe right before signInWithPassword) — unchecked means the
// session lives in sessionStorage instead of localStorage, so closing the
// tab signs the person out instead of persisting indefinitely.
export default function RememberMeCheckbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  const T = useTheme();
  const s = useMemo(() => makeStyles(T), [T]);
  return (
    <AnimatedPressable
      style={s.row}
      onPress={onToggle}
      hitSlop={6}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel="Remember me"
    >
      <View style={[s.box, checked && s.boxChecked]}>
        {checked && <AppIcon name="checkmark" size={12} color={T.textOnAccent} />}
      </View>
      <Text style={s.label}>Remember me</Text>
    </AnimatedPressable>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  box: {
    width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: T.surface,
  },
  boxChecked: { backgroundColor: T.accentSolid, borderColor: T.accentSolid },
  label: { fontSize: 13, fontWeight: '600', color: T.textSecondary },
});
