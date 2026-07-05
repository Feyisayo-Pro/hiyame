import { useState, useMemo} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ThemePalette } from '@/lib/theme';

type UserRole = 'candidate' | 'company';

export default function RegisterScreen() {
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const insets = useSafeAreaInsets();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const roles: { key: UserRole; icon: keyof typeof Ionicons.glyphMap; title: string; desc: string }[] = [
    { key: 'candidate', icon: 'person-outline', title: 'Professional', desc: 'Get verified and receive matched opportunities across Africa' },
    { key: 'company', icon: 'business-outline', title: 'Company', desc: 'Hire verified African professionals for your team' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={T.textPrimary} />
      </Pressable>

      <View style={styles.content}>
        <View style={styles.logoRow}>
          <View style={styles.logoMark}>
            <Ionicons name="leaf" size={16} color={T.textOnAccent} />
          </View>
        </View>
        <Text style={styles.title}>Join hiyame</Text>
        <Text style={styles.subtitle}>Tell us how you would like to use the platform</Text>

        {roles.map((role) => {
          const isSelected = selectedRole === role.key;
          return (
            <Pressable
              key={role.key}
              style={[styles.roleCard, isSelected && styles.roleCardSelected]}
              onPress={() => setSelectedRole(role.key)}
            >
              <View style={[styles.roleIconWrap, isSelected && styles.roleIconWrapSelected]}>
                <Ionicons name={role.icon} size={24} color={isSelected ? T.accent : T.textSecondary} />
              </View>
              <View style={styles.roleTextWrap}>
                <Text style={[styles.roleTitle, isSelected && styles.roleTitleSelected]}>{role.title}</Text>
                <Text style={[styles.roleDesc, isSelected && { color: T.textPrimary }]}>{role.desc}</Text>
              </View>
              <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      {selectedRole && (
        <View style={[styles.bottomWrap, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={styles.continueButton}
            onPress={() => {
              if (selectedRole === 'candidate') {
                router.push('/(auth)/candidate-signup');
              } else {
                router.push('/(auth)/company-signup');
              }
            }}
          >
            <Text style={styles.continueText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={T.textOnAccent} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg, paddingHorizontal: 20 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.card, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 2, marginBottom: 24 },
  content: { flex: 1 },
  logoRow: { marginBottom: 20 },
  logoMark: { width: 40, height: 40, borderRadius: 12, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 15, color: T.textSecondary, marginBottom: 32 },
  roleCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.card, padding: 18, borderRadius: 16,
    borderWidth: 2, borderColor: T.border, marginBottom: 12,
  },
  roleCardSelected: {
    borderColor: T.accent,
    backgroundColor: 'rgba(29,161,242,0.05)',
  },
  roleIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: T.surface,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  roleIconWrapSelected: {
    backgroundColor: 'rgba(29,161,242,0.12)',
  },
  roleTextWrap: { flex: 1 },
  roleTitle: { fontSize: 17, fontWeight: '700', color: T.textPrimary, marginBottom: 3 },
  roleTitleSelected: { color: T.accent },
  roleDesc: { fontSize: 13, color: T.textSecondary, lineHeight: 18 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: T.border, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  radioOuterSelected: { borderColor: T.accent },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: T.accent },
  bottomWrap: { paddingTop: 12 },
  continueButton: { backgroundColor: T.accent, borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, shadowColor: T.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 4 },
  continueText: { color: T.textOnAccent, fontSize: 17, fontWeight: '700' },
});
