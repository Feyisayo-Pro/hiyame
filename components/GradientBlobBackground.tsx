import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { EASE } from '@/lib/motion';

// Ambient, continuously-drifting blurred color field behind the hero + how-
// it-works content — the single highest-impact "premium SaaS site" visual
// signature (Linear/Stripe-adjacent landing pages all use some version of
// this). Purely decorative, layered behind already-visible content — never
// gates anything on itself, so it doesn't run into MASTER.md's ban on
// opacity:0-until-observed content.
//
// Web-only `filter: blur()` — RN's core StyleSheet types don't include
// `filter` since it's a CSS-only concept with no native equivalent, but
// react-native-web passes unknown style keys straight through to the DOM,
// so the cast is the only way to reach it. Harmless no-op on native (blobs
// would just render as sharp-edged circles, and native isn't a real target
// for this app yet anyway).
const BLUR_STYLE = { filter: 'blur(70px)' } as any;

// The wrapper clips each blob's blur at its own rectangular bounding box
// (needed so the blobs can't cause horizontal/vertical page overflow) — but
// a blob's color is still fairly saturated right up to that clip line, so
// without this the whole field reads as a flat gradient box with a visible
// straight edge, not an ambient glow (confirmed live: exactly this artifact
// on how-it-works.tsx's intro section). A radial mask fades the entire
// wrapper to transparent well before its own edge, so wherever the hard
// clip actually falls, the content there is already invisible.
const FADE_MASK_STYLE = {
  WebkitMaskImage: 'radial-gradient(ellipse 55% 50% at 50% 30%, #000 15%, transparent 60%)',
  maskImage: 'radial-gradient(ellipse 55% 50% at 50% 30%, #000 15%, transparent 60%)',
} as any;

interface Blob {
  size: number;
  color: string;
  top?: number | string;
  left?: number | string;
  right?: number | string;
  bottom?: number | string;
  duration: number;
  delay: number;
  driftX: number;
  driftY: number;
}

const BLOBS_LIGHT: Blob[] = [
  { size: 480, color: 'rgba(29,161,242,0.22)', top: -120, left: -100, duration: 11000, delay: 0, driftX: 40, driftY: 30 },
  { size: 380, color: 'rgba(15,20,25,0.10)', top: 60, right: -120, duration: 13000, delay: 800, driftX: -35, driftY: 45 },
  { size: 340, color: 'rgba(29,161,242,0.16)', bottom: -140, left: '30%', duration: 15000, delay: 1600, driftX: 30, driftY: -35 },
];

// On a dark ground the light set's near-black blob would be almost
// invisible (it's meant to read as a faint shadow tint against a pale
// background) — swapped for a cyan tint so all 3 blobs actually read as an
// ambient glow instead of one of them doing nothing.
const BLOBS_DARK: Blob[] = [
  { size: 480, color: 'rgba(29,161,242,0.30)', top: -120, left: -100, duration: 11000, delay: 0, driftX: 40, driftY: 30 },
  { size: 380, color: 'rgba(6,182,212,0.20)', top: 60, right: -120, duration: 13000, delay: 800, driftX: -35, driftY: 45 },
  { size: 340, color: 'rgba(29,161,242,0.22)', bottom: -140, left: '30%', duration: 15000, delay: 1600, driftX: 30, driftY: -35 },
];

function BlobShape({ blob }: { blob: Blob }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: blob.duration, delay: blob.delay, easing: EASE.pulse, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: blob.duration, easing: EASE.pulse, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, blob.driftX] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, blob.driftY] });
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <Animated.View
      style={[
        st.blob,
        BLUR_STYLE,
        {
          width: blob.size, height: blob.size, borderRadius: blob.size / 2, backgroundColor: blob.color,
          top: blob.top, left: blob.left, right: blob.right, bottom: blob.bottom,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    />
  );
}

export default function GradientBlobBackground({ dark = false }: { dark?: boolean }) {
  const blobs = dark ? BLOBS_DARK : BLOBS_LIGHT;
  return (
    <View style={[st.wrap, FADE_MASK_STYLE]} pointerEvents="none">
      {blobs.map((b, i) => <BlobShape key={i} blob={b} />)}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  blob: { position: 'absolute' },
});
