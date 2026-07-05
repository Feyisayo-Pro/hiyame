/**
 * SwipeHint — subtle pill indicator that nudges users to swipe.
 * Shows "Swipe to explore" with a gentle icon, then fades out after 3s.
 */
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme';

export default function SwipeHint() {
  const T = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in, hold, fade out
    const anim = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.pill,
        {
          opacity,
          backgroundColor: T.mode === 'dark' ? 'rgba(29,161,242,0.15)' : 'rgba(29,161,242,0.10)',
          borderColor: T.mode === 'dark' ? 'rgba(29,161,242,0.25)' : 'rgba(29,161,242,0.20)',
        },
      ]}
      pointerEvents="none"
    >
      <Ionicons name="swap-horizontal" size={16} color={T.accent} />
      <Animated.Text style={[styles.text, { color: T.accent }]}>
        Swipe to explore
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
