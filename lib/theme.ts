/**
 * hiyame Theme System
 * Light (default) + Dark mode with Twitter Blue (#1DA1F2) accent.
 */
import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';

// ── Palette type ──
export interface ThemePalette {
  mode: 'light' | 'dark';
  bg: string;
  card: string;
  cardElevated: string;
  surface: string;
  surfaceHover: string;
  accent: string;
  accentDim: string;
  // Same value in BOTH palettes, deliberately not theme-flipping like
  // accentDim (which goes darker in light mode, lighter in dark mode — right
  // for "accent-colored text sitting on the page's own ground"). A solid
  // button fill with white text on top needs the opposite property: dark
  // enough for white text to read regardless of which theme is active. Using
  // accentDim for this (an earlier version of this fix) put dark mode's much
  // lighter accentDim behind white text — 1.9:1, worse than the original
  // bug. Caught by this session's own accessibility E2E suite.
  accentSolid: string;
  accentBg: string;
  accentBg20: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnAccent: string;
  emerald: string;
  emeraldBg: string;
  danger: string;
  dangerBg: string;
  amber: string;
  amberBg: string;
  indigo: string;
  indigoBg: string;
  border: string;
  borderLight: string;
  white: string;
  overlay: string;
  tabBarBg: string;
  tabBarBorder: string;
  statusBarStyle: 'light' | 'dark';
  inputBg: string;
  inputText: string;
  inputPlaceholder: string;
}

// ── Light palette (default) ──
// Neutrals carry a faint cool bias toward the X-blue accent so they read as
// chosen, not default grey. Surfaces separate by tone + subtle elevation
// (ELEVATION below), not only a hairline border.
export const LIGHT: ThemePalette = {
  mode: 'light',
  bg: '#F6F7F9',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  surface: '#EEF0F3',
  surfaceHover: '#E5E8EC',
  accent: '#1DA1F2',
  // Was '#0C7ABF' — MASTER.md's own documented "accent text on light ground"
  // fix, but measured (not just eyeballed) at 4.3:1 against this app's real
  // `bg`/`accentBg`-composited surfaces, just under the 4.5:1 AA floor. This
  // darkens it further (same hue, ~0.67x value) to clear every real
  // background it sits on as text — 4.5:1 to 5.7:1 depending on surface,
  // confirmed via an axe-core sweep + precise sRGB contrast math, not eyeballed.
  accentDim: '#136CA2',
  // Same value as light's accentDim (a coincidence of the math, not a
  // shortcut) — see the interface comment above for why this doesn't flip
  // with the theme the way accentDim does.
  accentSolid: '#136CA2',
  accentBg: 'rgba(29,161,242,0.08)',
  accentBg20: 'rgba(29,161,242,0.14)',
  textPrimary: '#0F1419',
  textSecondary: '#5B6875',
  // Was '#8A97A4' (2.98:1 on card/bg — fails WCAG AA's 4.5:1 for text, found
  // via an axe-core sweep). MASTER.md documents '#6E7B8B' for this same
  // reason, but that measures 4.3:1 here too — still short. This is a further
  // 0.88x darkening of that same hue, clearing 4.5:1+ against card/bg/surface.
  textMuted: '#616C7A',
  textOnAccent: '#FFFFFF',
  emerald: '#17A75B',
  emeraldBg: 'rgba(23,167,91,0.09)',
  danger: '#E0245E',
  dangerBg: 'rgba(224,36,94,0.08)',
  amber: '#E0870B',
  amberBg: 'rgba(224,135,11,0.10)',
  indigo: '#6D4BC4',
  indigoBg: 'rgba(109,75,196,0.09)',
  border: '#E6E9ED',
  borderLight: '#D6DBE1',
  white: '#FFFFFF',
  overlay: 'rgba(15,20,25,0.45)',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E6E9ED',
  statusBarStyle: 'dark',
  inputBg: '#F1F3F6',
  inputText: '#0F1419',
  inputPlaceholder: '#8A97A4',
};

// ── Dark palette ──
// Cool-neutral (not the previous warm/brown cast) so it sits under the blue
// accent cleanly. Surfaces step up in lightness as they come forward.
export const DARK: ThemePalette = {
  mode: 'dark',
  bg: '#0C0E12',
  card: '#15181D',
  cardElevated: '#1B1F26',
  surface: '#20242B',
  surfaceHover: '#282D35',
  accent: '#1DA1F2',
  accentDim: '#6FC3F7',
  accentSolid: '#136CA2',
  accentBg: 'rgba(29,161,242,0.14)',
  accentBg20: 'rgba(29,161,242,0.22)',
  textPrimary: '#F2F4F7',
  textSecondary: '#A7B0BC',
  // Was '#6C7784' — only 3.4-3.9:1 against dark card/surface (never caught
  // earlier since this session's a11y sweep only exercised light mode).
  // Lightened toward the same hue (0.16x mix to white) to clear 4.5:1+.
  textMuted: '#848D98',
  textOnAccent: '#FFFFFF',
  emerald: '#34D399',
  emeraldBg: 'rgba(52,211,153,0.14)',
  danger: '#F87171',
  dangerBg: 'rgba(248,113,113,0.14)',
  amber: '#FBBF24',
  amberBg: 'rgba(251,191,36,0.14)',
  indigo: '#8B8CF8',
  indigoBg: 'rgba(139,140,248,0.16)',
  border: '#262B33',
  borderLight: '#333A44',
  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.72)',
  tabBarBg: '#101318',
  tabBarBorder: '#20242B',
  statusBarStyle: 'light',
  inputBg: '#1B1F26',
  inputText: '#F2F4F7',
  inputPlaceholder: '#6C7784',
};

// ── Backward compat: static export for non-component code ──
export const THEME = LIGHT;

// ══════════════════════════════════════════════════════════════════════
// TYPOGRAPHY — Plus Jakarta Sans (body) + Bricolage Grotesque (display)
// ──────────────────────────────────────────────────────────────────────
// Was the platform system font with nothing loaded — genuinely no custom
// typeface anywhere in the app. That's a real, app-wide "generic/dated"
// signal, not just a marketing-page problem, so the fix lives here at the
// token level rather than as 40 individual file edits: components/
// Themed.tsx's shared <Text> now maps whatever `fontWeight` a style already
// carries to the matching loaded Plus Jakarta Sans weight automatically —
// every existing screen picks this up with zero changes to that screen.
//
// Bricolage Grotesque is the second, more characterful face for genuine
// hero/headline moments (TYPE.display / TYPE.title below, and the public
// pages' big headlines) — deliberately NOT applied by weight alone (that
// would put a display face on small bold badges/labels too), only where a
// screen explicitly opts in via TYPE.display/title or a direct fontFamily.
//
// Both loaded in app/_layout.tsx's useFonts() from @expo-google-fonts/*.
export const FONT_FAMILY = 'PlusJakartaSans_400Regular';
export const DISPLAY_FONT_FAMILY = 'BricolageGrotesque_800ExtraBold';

// Weight string (as RN wants it, e.g. '600') -> the matching loaded Plus
// Jakarta Sans font file. A single loaded "regular" file can't be faked
// bold reliably across platforms, so each weight actually used by TYPE
// below is its own named font.
export const BODY_FONT_BY_WEIGHT: Record<string, string> = {
  '400': 'PlusJakartaSans_400Regular',
  'normal': 'PlusJakartaSans_400Regular',
  '500': 'PlusJakartaSans_500Medium',
  '600': 'PlusJakartaSans_600SemiBold',
  '700': 'PlusJakartaSans_700Bold',
  'bold': 'PlusJakartaSans_700Bold',
  '800': 'PlusJakartaSans_800ExtraBold',
};

// Nearest-neighbor fallback for any fontWeight not in the table above
// (e.g. '300' from a component this pass didn't touch) — never leaves a
// weight silently unmapped back to the system font.
export function fontFamilyForWeight(weight: string | number | undefined): string {
  const key = String(weight ?? '400');
  if (BODY_FONT_BY_WEIGHT[key]) return BODY_FONT_BY_WEIGHT[key];
  const n = parseInt(key, 10);
  if (Number.isNaN(n)) return BODY_FONT_BY_WEIGHT['400'];
  if (n <= 450) return BODY_FONT_BY_WEIGHT['400'];
  if (n <= 550) return BODY_FONT_BY_WEIGHT['500'];
  if (n <= 650) return BODY_FONT_BY_WEIGHT['600'];
  return BODY_FONT_BY_WEIGHT['700'];
}

// Use these tokens instead of hardcoding fontSize / fontWeight in a
// StyleSheet. Weights are strings because React Native wants '600', not 600.
export const TYPE = {
  // size + the line height that pairs with it
  display: { fontSize: 28, lineHeight: 32, fontWeight: '800' as const, letterSpacing: -0.4, fontFamily: DISPLAY_FONT_FAMILY },
  title:   { fontSize: 22, lineHeight: 27, fontWeight: '800' as const, letterSpacing: -0.3, fontFamily: DISPLAY_FONT_FAMILY },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '700' as const, letterSpacing: -0.2 },
  body:    { fontSize: 15, lineHeight: 22, fontWeight: '400' as const, letterSpacing: 0 },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const, letterSpacing: 0 },
  callout: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const, letterSpacing: 0 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const, letterSpacing: 0.1 },
  // ALL-CAPS eyebrow / section labels — the tracking is load-bearing here
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700' as const, letterSpacing: 0.6 },
} as const;

// 4-point spacing scale. Prefer layout gap over per-element margins.
export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

// Corner radii by role — not one radius stamped on everything.
export const RADIUS = { chip: 8, control: 12, card: 16, sheet: 20, pill: 999 } as const;

// One icon-size scale. Use these, not arbitrary 20/22/17 values — consistent
// sizing is most of what makes an interface read as "considered".
export const ICON = { xs: 13, sm: 15, md: 18, lg: 20, xl: 24 } as const;

// Subtle elevation — premium reads as restraint, not heavy drop shadows.
// `card` for standard raised surfaces, `raised` for the one thing that should
// float (a sheet, an active FAB). RN maps shadow* on iOS/web, elevation on
// Android.
export const ELEVATION = {
  card: {
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  raised: {
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 6,
  },
} as const;

// Minimum interactive target (WCAG 2.5.5 / platform HIG). Icon-only buttons
// smaller than this visually must carry hitSlop to reach it, plus an
// accessibilityLabel.
export const MIN_TOUCH = 44;

// ── Context ──
interface ThemeContextValue {
  theme: ThemePalette;
  mode: 'light' | 'dark';
  toggleTheme: () => void;
  setMode: (mode: 'light' | 'dark') => void;
}

const ThemeCtx = createContext<ThemeContextValue>({
  theme: LIGHT,
  mode: 'light',
  toggleTheme: () => {},
  setMode: () => {},
});

export function HiyameThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const toggleTheme = useCallback(() => setMode((m) => (m === 'light' ? 'dark' : 'light')), []);
  const theme = mode === 'light' ? LIGHT : DARK;

  const value = useMemo(() => ({ theme, mode, toggleTheme, setMode }), [theme, mode, toggleTheme]);

  return React.createElement(ThemeCtx.Provider, { value }, children);
}

export function useTheme(): ThemePalette {
  return useContext(ThemeCtx).theme;
}

export function useThemeToggle() {
  const { mode, toggleTheme, setMode } = useContext(ThemeCtx);
  return { mode, toggleTheme, setMode };
}
