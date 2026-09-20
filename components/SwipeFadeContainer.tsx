import { useEffect, useRef, ReactNode } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';
import { DURATION, EASE } from '@/lib/motion';

interface SwipeFadeContainerProps {
  children: ReactNode;
  /** Slide direction: 'left' = enter from right, 'right' = enter from left (axis 'x'); ignored for axis 'y' (always rises from below) */
  direction?: 'left' | 'right';
  /** 'x' slides horizontally (default, original behaviour); 'y' rises in from below — a better fit for staggered card grids/lists */
  axis?: 'x' | 'y';
  /** Offset in pixels (default 60) */
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
  axis = 'x',
  offset = 60,
  duration = DURATION.entrance,
  delay = 150,
  style,
  triggerKey,
}: SwipeFadeContainerProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const start = axis === 'y' ? offset : direction === 'left' ? offset : -offset;
    opacity.setValue(0);
    translate.setValue(start);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: EASE.enter,
        useNativeDriver: true,
      }),
      Animated.timing(translate, {
        toValue: 0,
        duration,
        delay,
        easing: EASE.enter,
        useNativeDriver: true,
      }),
    ]).start();
  }, [triggerKey]);

  const transform = axis === 'y' ? [{ translateY: translate }] : [{ translateX: translate }];

  return (
    <Animated.View
      style={[
        { opacity, transform },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
