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
