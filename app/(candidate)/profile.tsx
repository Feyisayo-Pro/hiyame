import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CandidateProfileScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerRight}>
          <Ionicons name="settings-outline" size={20} color="#6B7280" />
        </View>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarLarge}>
          <Ionicons name="person" size={32} color="#43A047" />
        </View>
        <Text style={styles.name}>Amara Osei</Text>
        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" />
          <Text style={styles.verifiedText}>Verified Professional</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        {[
          { label: 'Matches', value: '6', icon: 'sparkles' as const },
          { label: 'Saved', value: '0', icon: 'bookmark' as const },
          { label: 'Intros', value: '0', icon: 'people' as const },
        ].map((stat) => (
          <View key={stat.label} style={styles.statItem}>
            <View style={styles.statIcon}>
              <Ionicons name={stat.icon} size={16} color="#43A047" />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.comingSoon}>
        <Ionicons name="construct-outline" size={40} color="#D1D5DB" />
        <Text style={styles.comingSoonTitle}>Profile editing coming soon</Text>
        <Text style={styles.comingSoonSub}>Identity verification, skills, and work history will be available in milestone 2.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  headerRight: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  profileCard: { alignItems: 'center', paddingVertical: 28, backgroundColor: '#FFFFFF', marginHorizontal: 20, marginTop: 20, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 1 },
  avatarLarge: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 3, borderColor: '#C8E6C0' },
  name: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#43A047', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 50 },
  verifiedText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 20, marginTop: 16, backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 1 },
  statItem: { alignItems: 'center' },
  statIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  statLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  comingSoon: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 48, paddingBottom: 80 },
  comingSoonTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 16, marginBottom: 6 },
  comingSoonSub: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
});
