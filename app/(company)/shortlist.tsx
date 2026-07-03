import { StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';

export default function ShortlistScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shortlist</Text>
      <Text style={styles.placeholder}>Shortlist + introductions coming in milestone 6</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  placeholder: { opacity: 0.5 },
});
