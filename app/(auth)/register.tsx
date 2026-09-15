import { Redirect } from 'expo-router';

// The old two-step welcome → register flow is now one screen (welcome.tsx
// itself is the candidate/company split). This redirect exists only so
// anything still linking to /(auth)/register — login.tsx, the sign-in
// screens' "Sign up" links — keeps working without needing to touch them.
export default function RegisterScreen() {
  return <Redirect href="/(auth)/welcome" />;
}
