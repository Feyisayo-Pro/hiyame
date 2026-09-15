import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';

// Floating bottom pill toggle — the "I'm hiring / Looking for a job" switcher
// from viamatch.ai's /for-employers page (confirmed live: a real
// `position: fixed; bottom: 40px` element, not part of their bare homepage —
// but the ask was to bring it onto ours). Sits as a sibling of the page's
// ScrollView, not inside it, so it stays put while the page scrolls.
export type PersonaMode = 'hiring' | 'candidate';

interface Props {
  mode: PersonaMode;
  onChange: (mode: PersonaMode) => void;
}

export default function PersonaSwitcher({ mode, onChange }: Props) {
  const anim = useRef(new Animated.Value(mode === 'hiring' ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: mode === 'hiring' ? 0 : 1, useNativeDriver: false, speed: 16, bounciness: 6 }).start();
  }, [mode]);

  const hiringBg = anim.interpolate({ inputRange: [0, 1], outputRange: ['#0F1419', 'transparent'] });
  const candidateBg = anim.interpolate({ inputRange: [0, 1], outputRange: ['transparent', '#0F1419'] });
  const hiringText = anim.interpolate({ inputRange: [0, 1], outputRange: ['#FFFFFF', '#8A97A4'] });
  const candidateText = anim.interpolate({ inputRange: [0, 1], outputRange: ['#8A97A4', '#FFFFFF'] });

  return (
    <View style={st.wrap} pointerEvents="box-none">
      <View style={st.pill}>
        <Pressable onPress={() => onChange('hiring')} hitSlop={4}>
          <Animated.View style={[st.segment, { backgroundColor: hiringBg }]}>
            <View style={[st.dot, mode === 'hiring' && st.dotActive]} />
            <Animated.Text style={[st.segmentText, { color: hiringText }]}>I'm hiring</Animated.Text>
          </Animated.View>
        </Pressable>
        <Pressable onPress={() => onChange('candidate')} hitSlop={4}>
          <Animated.View style={[st.segment, { backgroundColor: candidateBg }]}>
            <Text style={st.segmentIcon}>👤</Text>
            <Animated.Text style={[st.segmentText, { color: candidateText }]}>Looking for a job</Animated.Text>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    // 'fixed' isn't in RN's ViewStyle['position'] union (only 'absolute' |
    // 'relative') because it's a web-only CSS value — react-native-web still
    // passes it straight through to the DOM, hence the cast. Native falls
    // back to 'absolute', which is harmless since this app's only real
    // target today is web.
    position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as 'absolute',
    bottom: 24, left: 0, right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  pill: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 999, padding: 4,
    shadowColor: '#0B1220', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 24, elevation: 10,
  },
  segment: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 999 },
  segmentText: { fontSize: 13.5, fontWeight: '700' },
  segmentIcon: { fontSize: 12 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#536471' },
  dotActive: { backgroundColor: '#17A75B' },
});
