import { StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';

export default function RolesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Roles</Text>
      <Text style={styles.placeholder}>Role posting coming in milestone 4</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  placeholder: { opacity: 0.5 },
});
