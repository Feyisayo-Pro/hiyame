import { useRef } from 'react';
import { Animated, Pressable, PressableProps, GestureResponderEvent } from 'react-native';

interface Props extends Omit<PressableProps, 'style'> {
  style?: any;
  /** How far it scales down on press (default 0.96 — subtle, not bouncy) */
  scaleTo?: number;
}

// Drop-in Pressable with real press feedback (a quick spring scale) instead of
// the opacity-only feedback used across most of the app before this — the
// platform-wide "make it feel alive" pass. useNativeDriver works for
// transform on every platform this app targets, web included.
export default function AnimatedPressable({ style, scaleTo = 0.96, onPressIn, onPressOut, children, ...rest }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = (e: GestureResponderEvent) => {
    Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 50, bounciness: 6 }).start();
    onPressIn?.(e);
  };
  const pressOut = (e: GestureResponderEvent) => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start();
    onPressOut?.(e);
  };

  return (
    <Pressable onPressIn={pressIn} onPressOut={pressOut} {...rest}>
      {(state) => (
        <Animated.View style={[typeof style === 'function' ? style(state) : style, { transform: [{ scale }] }]}>
          {typeof children === 'function' ? children(state) : children}
        </Animated.View>
      )}
    </Pressable>
  );
}
