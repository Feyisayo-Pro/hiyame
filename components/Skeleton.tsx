import { useEffect, useRef } from 'react';
import { Animated, Easing, View, ViewStyle } from 'react-native';
import { useTheme } from '@/lib/theme';

// A single pulsing placeholder block. Screens compose these into shapes that
// match their real content (a card outline, a row of stat tiles, etc.) so the
// loading state previews the layout instead of a bare centered spinner —
// replaces ActivityIndicator on Home, Shortlist and My Roles (the highest-
// traffic data screens).
export function SkeletonBlock({ width, height, radius = 8, style }: {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const T = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: T.surface, opacity },
        style,
      ]}
    />
  );
}

// A list-row skeleton — circular avatar + two text lines + a small pill.
// Matches the "recent introductions/matches" row shape on both Home screens.
export function SkeletonRow({ style }: { style?: ViewStyle }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }, style]}>
      <SkeletonBlock width={40} height={40} radius={20} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBlock width="60%" height={14} radius={6} />
        <SkeletonBlock width="40%" height={12} radius={6} />
      </View>
      <SkeletonBlock width={54} height={20} radius={8} />
    </View>
  );
}

// A generic card-shaped skeleton (border + a few lines) — matches the
// borderWidth/borderColor/borderRadius card pattern used across Shortlist,
// My Roles, etc.
export function SkeletonCard({ style }: { style?: ViewStyle }) {
  const T = useTheme();
  return (
    <View style={[{ backgroundColor: T.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: T.border, gap: 10 }, style]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <SkeletonBlock width={80} height={20} radius={8} />
        <SkeletonBlock width={50} height={14} radius={6} />
      </View>
      <SkeletonBlock width="70%" height={18} radius={6} />
      <SkeletonBlock width="45%" height={14} radius={6} />
    </View>
  );
}
