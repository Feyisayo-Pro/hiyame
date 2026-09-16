import { useRef } from 'react';
import { Animated, Pressable, PressableProps, PressableStateCallbackType, GestureResponderEvent, StyleProp, StyleSheet, ViewStyle } from 'react-native';

interface Props extends Omit<PressableProps, 'style'> {
  // Typed like RN's own Pressable style prop (a value or a function of
  // {pressed, hovered, focused}) instead of `any` — `any` erased the
  // callback-form parameter's type, forcing every caller using
  // `style={(state) => ...}` to annotate `state` by hand or hit a TS7006.
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
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
      {(state) => {
        // RN style arrays replace a whole key rather than merging array
        // entries, so a caller's own `transform` (e.g. a hover-lift
        // translateY) would otherwise be silently overwritten by the
        // press-scale below instead of both applying together. Flatten and
        // merge them into one transform array so callers can freely add
        // their own transforms without knowing about this internal.
        const resolved = (StyleSheet.flatten(typeof style === 'function' ? style(state) : style) || {}) as ViewStyle;
        const { transform: callerTransform, ...restStyle } = resolved;
        const transform = [...(Array.isArray(callerTransform) ? callerTransform : []), { scale }];
        return (
          <Animated.View style={[restStyle, { transform }]}>
            {typeof children === 'function' ? children(state) : children}
          </Animated.View>
        );
      }}
    </Pressable>
  );
}
