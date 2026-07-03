import { useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type UserRole = 'candidate' | 'company';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const roles: { key: UserRole; icon: keyof typeof Ionicons.glyphMap; title: string; desc: string }[] = [
    { key: 'candidate', icon: 'person-outline', title: 'Professional', desc: 'Get verified and receive matched opportunities across Africa' },
    { key: 'company', icon: 'business-outline', title: 'Company', desc: 'Hire verified African professionals for your team' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <StatusBar style="dark" />

      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color="#1A1A1A" />
      </Pressable>

      <View style={styles.content}>
        <View style={styles.logoRow}>
          <View style={styles.logoMark}>
            <Ionicons name="leaf" size={16} color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.title}>Join Hiyame</Text>
        <Text style={styles.subtitle}>Tell us how you'd like to use the platform</Text>

        {roles.map((role) => {
          const isSelected = selectedRole === role.key;
          return (
            <Pressable
              key={role.key}
              style={[styles.roleCard, isSelected && styles.roleCardSelected]}
              onPress={() => setSelectedRole(role.key)}
            >
              <View style={[styles.roleIconWrap, isSelected && styles.roleIconWrapSelected]}>
                <Ionicons name={role.icon} size={24} color={isSelected ? '#FFFFFF' : '#6B7280'} />
              </View>
              <View style={styles.roleTextWrap}>
                <Text style={[styles.roleTitle, isSelected && styles.roleTitleSelected]}>{role.title}</Text>
                <Text style={styles.roleDesc}>{role.desc}</Text>
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
                router.replace('/(candidate)/');
              } else {
                router.replace('/(company)/');
              }
            }}
          >
            <Text style={styles.continueText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', paddingHorizontal: 20 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, marginBottom: 24 },
  content: { flex: 1 },
  logoRow: { marginBottom: 20 },
  logoMark: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#43A047', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#6B7280', marginBottom: 32 },
  roleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 18, borderRadius: 16, borderWidth: 2, borderColor: '#F3F4F6', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  roleCardSelected: { borderColor: '#43A047', backgroundColor: '#F8FFF8' },
  roleIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  roleIconWrapSelected: { backgroundColor: '#43A047' },
  roleTextWrap: { flex: 1 },
  roleTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 3 },
  roleTitleSelected: { color: '#43A047' },
  roleDesc: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  radioOuterSelected: { borderColor: '#43A047' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#43A047' },
  bottomWrap: { paddingTop: 12 },
  continueButton: { backgroundColor: '#1A1A1A', borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 4 },
  continueText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
