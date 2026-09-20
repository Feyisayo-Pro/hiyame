import { Easing } from 'react-native';

// Named motion tokens — same reasoning as TYPE/SPACING/RADIUS in theme.ts:
// the same *kind* of interaction should use the same timing everywhere,
// instead of each screen picking its own close-but-different number.
//
// Built from an audit of every Animated.timing/spring call in the app
// (2026), not guessed: durations of 400/420/460/480 were all already being
// used for the same thing — a page section fading/sliding in on mount —
// and 220/240/250/260 for the same thing again one tier down — a card in a
// staggered list, or a tab/step's content swapping. Two real values,
// covering both.
export const DURATION = {
  instant: 60,     // a single shake tick (lib/useShake.ts) — must read as a
                    // shake, not a fade; too slow and it looks like lag
  fast: 160,        // a small state's own transition (focus glow, accordion
                    // chevron) — the state changed, not new content arriving
  stagger: 240,     // a card/row appearing in an already-mounted list, or a
                    // tab/step's content swapping — content already in view
  entrance: 420,    // a whole section fading/sliding in the first time it's
                    // seen (page load, a modal's content)
  shimmer: 700,     // one leg of a continuous loading-skeleton pulse
  ambient: 900,     // one leg of a continuous decorative pulse (LiveDot)
} as const;

export const EASE = {
  // Content arriving (SwipeFadeContainer's own entrance/stagger fades) —
  // decelerate in, never linear; nothing here decelerates OUT since these
  // only ever animate onto screen, not off.
  enter: Easing.out(Easing.cubic),
  // A value that's already visible changing to a new value symmetrically
  // (skeleton shimmer opacity).
  swap: Easing.inOut(Easing.ease),
  // Continuous back-and-forth ambient decoration (float, badge pulse, blob
  // drift) — every one of these already used this exact curve independently
  // before this file existed.
  pulse: Easing.inOut(Easing.sin),
  // A literal timer/progress fill (how-it-works' auto-advancing step bar) —
  // it's tracking elapsed time, not decorating an arrival.
  linear: Easing.linear,
} as const;

// RN's Animated.spring wants speed/bounciness, not duration/easing — same
// audit found AnimatedPressable's press/release feedback already hand-
// duplicated with identical numbers in welcome.tsx's two custom panel
// handlers, rather than sharing one source.
export const SPRING = {
  press: { speed: 50, bounciness: 6 } as const,     // pressIn feedback
  release: { speed: 30, bounciness: 8 } as const,   // pressOut feedback
  bounceIn: { speed: 14, bounciness: 12 } as const, // a mount bounce (checkmarks, badges)
  panelFocus: { speed: 14, bounciness: 6 } as const, // a heavier layout reacting (hero panel hover-expand)
} as const;
