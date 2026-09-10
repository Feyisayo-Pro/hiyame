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
  accentDim: '#0C7ABF',
  accentBg: 'rgba(29,161,242,0.08)',
  accentBg20: 'rgba(29,161,242,0.14)',
  textPrimary: '#0F1419',
  textSecondary: '#5B6875',
  textMuted: '#8A97A4',
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
  accentBg: 'rgba(29,161,242,0.14)',
  accentBg20: 'rgba(29,161,242,0.22)',
  textPrimary: '#F2F4F7',
  textSecondary: '#A7B0BC',
  textMuted: '#6C7784',
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
// TYPOGRAPHY — Instagram-style scale
// ──────────────────────────────────────────────────────────────────────
// Direction (see design-system/hiyame/MASTER.md): the platform system font
// — which is exactly what instagram.com uses on web — with a tight, modern
// hierarchy. No custom typeface is loaded; if a branded face is ever wanted,
// register it in app/_layout.tsx's useFonts() and set FONT_FAMILY here.
//
// Use these tokens instead of hardcoding fontSize / fontWeight in a
// StyleSheet. Weights are strings because React Native wants '600', not 600.
export const FONT_FAMILY: string | undefined = undefined; // system default

export const TYPE = {
  // size + the line height that pairs with it
  display: { fontSize: 28, lineHeight: 32, fontWeight: '800' as const, letterSpacing: -0.4 },
  title:   { fontSize: 22, lineHeight: 27, fontWeight: '800' as const, letterSpacing: -0.3 },
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
