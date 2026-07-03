import { StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';

// Placeholder — milestone 2 builds the real auth flow
export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>
      <Text style={styles.placeholder}>Auth flow coming in milestone 2</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  placeholder: { opacity: 0.5 },
});
