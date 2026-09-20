import { View } from 'react-native';
import { MotiView } from 'moti';
import { DURATION } from '@/lib/motion';

// First real usage of Moti in the app — a declarative layer over Reanimated
// (already installed, previously unused entirely: this session had hand-
// written the same "useRef + useEffect + Animated.loop + interpolate"
// breathing-pulse pattern from scratch half a dozen times elsewhere for
// things like this). The equivalent hand-rolled version of this exact pulse
// is ~15 lines; this is 6, and runs on Reanimated's worklet thread rather
// than the JS-driven core Animated API the rest of the app currently uses.
interface Props {
  color: string;
  size?: number;
}

export default function LiveDot({ color, size = 7 }: Props) {
  return (
    <View style={{ width: size, height: size }}>
      <MotiView
        from={{ opacity: 0.6, scale: 1 }}
        animate={{ opacity: 1, scale: 1.35 }}
        transition={{ type: 'timing', duration: DURATION.ambient, loop: true, repeatReverse: true }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, position: 'absolute' }}
      />
    </View>
  );
}
