import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="candidate-signin" />
      <Stack.Screen name="company-signin" />
      <Stack.Screen name="candidate-signup" />
      <Stack.Screen name="company-signup" />
    </Stack>
  );
}
