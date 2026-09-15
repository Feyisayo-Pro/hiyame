import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { Text, TextProps } from '@/components/Themed';

// Counts up from 0 to `value` once, on mount/when value first arrives — the
// small "alive" touch viamatch.ai's stats tiles have that a static number
// doesn't. Purely cosmetic: the value itself is real (passed in by the
// caller from a live DB count), this only animates how it's revealed.
interface Props extends TextProps {
  value: number;
  suffix?: string;
  duration?: number;
}

export default function AnimatedCounter({ value, suffix = '', duration = 900, style, ...rest }: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    anim.setValue(0);
    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    Animated.timing(anim, { toValue: value, duration, useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [value]);

  return (
    <Text style={style} {...rest}>
      {display.toLocaleString()}{suffix}
    </Text>
  );
}
