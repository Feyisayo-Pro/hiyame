import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Themed';

// A from-scratch React Native adaptation of a shadcn/Next.js "liquid metal"
// button (originally: raw DOM refs + a WebGL fragment shader via
// @paper-design/shaders + lucide-react). None of that runs inside React
// Native's view tree, and this project has no Tailwind/shadcn — so this
// rebuilds the same *effect* (a dark metallic pill with a moving sheen, a
// press-depth squash, and a tap ripple) entirely with RN's Animated API and
// expo-linear-gradient, which render identically on native and web. Prop
// names follow this codebase's own convention (`onPress`, not `onClick`).

interface LiquidMetalButtonProps {
  label?: string;
  onPress?: () => void;
  viewMode?: 'text' | 'icon';
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

const SIZES = {
  text: { width: 142, height: 46, radius: 23 },
  icon: { width: 46, height: 46, radius: 23 },
} as const;

export function LiquidMetalButton({ label = 'Get Started', onPress, viewMode = 'text' }: LiquidMetalButtonProps) {
  const size = SIZES[viewMode];

  const [hovered, setHovered] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleId = useRef(0);

  const pressScale = useRef(new Animated.Value(1)).current;
  const sheenX = useRef(new Animated.Value(-1)).current;
  const sheenLoop = useRef<Animated.CompositeAnimation | null>(null);

  // The moving highlight band — a continuous sweep, faster while hovered
  // (mirrors the original's shaderMount.setSpeed() on hover/click).
  useEffect(() => {
    sheenLoop.current?.stop();
    const duration = hovered ? 1100 : 2200;
    sheenX.setValue(-1);
    sheenLoop.current = Animated.loop(
      Animated.timing(sheenX, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
    );
    sheenLoop.current.start();
    return () => sheenLoop.current?.stop();
  }, [hovered]);

  const translateX = sheenX.interpolate({ inputRange: [-1, 1], outputRange: [-size.width, size.width] });

  const handlePressIn = () => {
    Animated.spring(pressScale, { toValue: 0.96, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start();
  };

  const handlePress = (e: any) => {
    const { locationX, locationY } = e.nativeEvent;
    const id = rippleId.current++;
    setRipples((prev) => [...prev, { id, x: locationX, y: locationY }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 550);
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onHoverIn={Platform.OS === 'web' ? () => setHovered(true) : undefined}
      onHoverOut={Platform.OS === 'web' ? () => setHovered(false) : undefined}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: size.width, height: size.height }}
    >
      <Animated.View
        style={[
          styles.shadow,
          { width: size.width, height: size.height, borderRadius: size.radius, transform: [{ scale: pressScale }] },
          hovered && styles.shadowHovered,
        ]}
      >
        <LinearGradient
          colors={['#2A2A2A', '#0A0A0A']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.base, { width: size.width, height: size.height, borderRadius: size.radius }]}
        >
          {/* Metallic sheen sweep — a soft light band animating across the pill. */}
          <Animated.View style={[styles.sheenWrap, { transform: [{ translateX }] }]}>
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sheen}
            />
          </Animated.View>

          {/* Ripples */}
          {ripples.map((r) => (
            <Ripple key={r.id} x={r.x} y={r.y} />
          ))}

          <View style={styles.content} pointerEvents="none">
            {viewMode === 'icon' ? (
              <Ionicons name="sparkles" size={16} color="#B8B8B8" />
            ) : (
              <Text style={styles.label}>{label}</Text>
            )}
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

function Ripple({ x, y }: { x: number; y: number }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ripple,
        {
          left: x - 10,
          top: y - 10,
          opacity,
          transform: [{ scale: scale.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }) }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  shadowHovered: {
    shadowOpacity: 0.45,
    shadowRadius: 18,
  },
  base: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sheenWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  sheen: {
    width: '60%',
    height: '100%',
  },
  content: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#D8D8D8',
    letterSpacing: 0.1,
  },
  ripple: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});
