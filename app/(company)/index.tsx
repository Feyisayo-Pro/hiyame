import { StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';

export default function CompanyDashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Company Dashboard</Text>
      <Text style={styles.placeholder}>PRD 10 dashboard coming in later milestones</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  placeholder: { opacity: 0.5 },
});
