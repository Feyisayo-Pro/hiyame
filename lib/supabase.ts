import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Secure token storage using OS keychain (iOS Keychain / Android Keystore)
// per architecture doc §8 — never use plain AsyncStorage for auth tokens.
const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// "Remember me" (web only — the checkbox on candidate/company sign-in)
// — a plain, non-sensitive flag that itself always lives in localStorage
// (it has to survive the very decision it's recording), read here to
// decide WHERE the real session token goes: localStorage (survives closing
// the browser) when remembered, sessionStorage (gone the moment the tab
// closes) when not. Defaults to remembered — true — when unset, which
// matches this app's behavior before this flag existed, so nobody already
// signed in gets silently logged out by this shipping.
const REMEMBER_ME_KEY = 'hiyame-remember-me';

export function setRememberMe(remember: boolean) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(REMEMBER_ME_KEY, remember ? '1' : '0');
  }
}

function rememberMe(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(REMEMBER_ME_KEY) !== '0';
}

// Web fallback — SecureStore is not available on web
const webStorageAdapter = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    // Only one of the two ever actually holds it (setItem below writes to
    // exactly one and clears the other), so checking both is safe either way.
    return window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    if (rememberMe()) {
      window.localStorage.setItem(key, value);
      window.sessionStorage.removeItem(key);
    } else {
      window.sessionStorage.setItem(key, value);
      window.localStorage.removeItem(key);
    }
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env and fill in your project values.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? webStorageAdapter : secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // not needed for mobile
  },
});
