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
export const LIGHT: ThemePalette = {
  mode: 'light',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  surface: '#F0F1F3',
  surfaceHover: '#E8E9EB',
  accent: '#1DA1F2',
  accentDim: '#0C7ABF',
  accentBg: 'rgba(29,161,242,0.08)',
  accentBg20: 'rgba(29,161,242,0.15)',
  textPrimary: '#14171A',
  textSecondary: '#536471',
  textMuted: '#6E7B8B',
  textOnAccent: '#FFFFFF',
  emerald: '#17BF63',
  emeraldBg: 'rgba(23,191,99,0.08)',
  danger: '#E0245E',
  dangerBg: 'rgba(224,36,94,0.08)',
  amber: '#FFAD1F',
  amberBg: 'rgba(255,173,31,0.08)',
  indigo: '#794BC4',
  indigoBg: 'rgba(121,75,196,0.08)',
  border: '#E1E8ED',
  borderLight: '#CCD6DD',
  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.4)',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E1E8ED',
  statusBarStyle: 'dark',
  inputBg: '#F5F8FA',
  inputText: '#14171A',
  inputPlaceholder: '#8899A6',
};

// ── Dark palette ──
export const DARK: ThemePalette = {
  mode: 'dark',
  bg: '#0D0D0C',
  card: '#161615',
  cardElevated: '#1E1E1D',
  surface: '#232322',
  surfaceHover: '#2A2A29',
  accent: '#1DA1F2',
  accentDim: '#0C7ABF',
  accentBg: 'rgba(29,161,242,0.12)',
  accentBg20: 'rgba(29,161,242,0.20)',
  textPrimary: '#F5F5F4',
  textSecondary: '#A3A3A2',
  textMuted: '#6B6B6A',
  textOnAccent: '#FFFFFF',
  emerald: '#34D399',
  emeraldBg: 'rgba(52,211,153,0.12)',
  danger: '#F87171',
  dangerBg: 'rgba(248,113,113,0.12)',
  amber: '#FBBF24',
  amberBg: 'rgba(251,191,36,0.12)',
  indigo: '#818CF8',
  indigoBg: 'rgba(129,140,248,0.12)',
  border: '#2A2A29',
  borderLight: '#333332',
  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.7)',
  tabBarBg: '#111110',
  tabBarBorder: '#1E1E1D',
  statusBarStyle: 'light',
  inputBg: '#232322',
  inputText: '#F5F5F4',
  inputPlaceholder: '#6B6B6A',
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
