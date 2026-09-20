import { useRef } from 'react';
import { Animated } from 'react-native';
import { DURATION } from '@/lib/motion';

// A small horizontal-shake for form-level error feedback — the general-error
// banner on sign-in/sign-up currently just pops into existence silently.
// Shared across the auth screens rather than one-off Animated.Value setup
// duplicated in each.
export function useShake() {
  const value = useRef(new Animated.Value(0)).current;

  const shake = () => {
    value.setValue(0);
    Animated.sequence([
      Animated.timing(value, { toValue: 1, duration: DURATION.instant, useNativeDriver: true }),
      Animated.timing(value, { toValue: -1, duration: DURATION.instant, useNativeDriver: true }),
      Animated.timing(value, { toValue: 1, duration: DURATION.instant, useNativeDriver: true }),
      Animated.timing(value, { toValue: -1, duration: DURATION.instant, useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration: DURATION.instant, useNativeDriver: true }),
    ]).start();
  };

  const shakeStyle = {
    transform: [{ translateX: value.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] }) }],
  };

  return { shake, shakeStyle };
}
