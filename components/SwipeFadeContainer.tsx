import { useEffect, useRef, ReactNode } from 'react';
import { Animated, Easing, ViewStyle, StyleProp } from 'react-native';

interface SwipeFadeContainerProps {
  children: ReactNode;
  /** Slide direction: 'left' = enter from right, 'right' = enter from left */
  direction?: 'left' | 'right';
  /** Horizontal offset in pixels (default 60) */
  offset?: number;
  /** Animation duration in ms (default 300) */
  duration?: number;
  /** Delay before animation starts — lets screen transitions finish (default 150) */
  delay?: number;
  /** Extra styles on the wrapper */
  style?: StyleProp<ViewStyle>;
  /** Change this value to re-trigger the animation (e.g. a step index) */
  triggerKey?: string | number;
}

export default function SwipeFadeContainer({
  children,
  direction = 'left',
  offset = 60,
  duration = 300,
  delay = 150,
  style,
  triggerKey,
}: SwipeFadeContainerProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startX = direction === 'left' ? offset : -offset;
    opacity.setValue(0);
    translateX.setValue(startX);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [triggerKey]);

  return (
    <Animated.View
      style={[
        { opacity, transform: [{ translateX }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
