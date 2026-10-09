import type { CSSProperties } from 'react';
import { Platform, TextInput } from 'react-native';
import { ThemePalette, RADIUS } from '@/lib/theme';

// Scheduling an interview used to mean typing "2026-03-05" and "14:30" into
// two free-text boxes against a placeholder hint — real feedback: this
// should be something you tick, not write out by hand. On web (the current
// delivery surface) these render the browser's own native date/time
// picker — a calendar grid and a clock face — via a real <input type="date"
// | "time">, not a styled TextInput pretending to be one. Native
// (iOS/Android) has no picker dependency installed yet, so it falls back to
// the same typed TextInput as before; this app doesn't ship there today.
//
// <input type="date"> already returns value as "YYYY-MM-DD" and
// <input type="time"> as "HH:MM" (24-hour) — exactly the format every
// caller's validation/submit logic already expects, so no changes needed
// there, only to how the value gets typed in.

interface FieldProps {
  value: string;
  onChange: (value: string) => void;
  T: ThemePalette;
}

function webInputStyle(T: ThemePalette): CSSProperties {
  return {
    // Native date/time inputs resist plain CSS more than a text input —
    // browsers apply their own baseline chrome (background, border weight,
    // intrinsic height) that a bare backgroundColor/border override doesn't
    // fully replace, which is why this looked visibly different from the
    // Meeting URL text field right next to it even with matching style
    // props. appearance:none strips that baseline so the rest of the style
    // actually wins; explicit height matches the sibling text input's
    // implicit height (padding 12 top/bottom + 14px text) so the row
    // doesn't look shorter/taller once the native chrome is gone. The
    // picker-indicator icon itself isn't affected by appearance:none — it
    // stays clickable.
    WebkitAppearance: 'none',
    appearance: 'none',
    display: 'block',
    width: '100%',
    height: 44,
    boxSizing: 'border-box',
    border: `1.5px solid ${T.border}`,
    backgroundColor: T.surface,
    borderRadius: RADIUS.control,
    paddingLeft: 14,
    paddingRight: 14,
    fontSize: 14,
    fontFamily: 'inherit',
    color: T.textPrimary,
    colorScheme: T.bg === '#0D0D0C' ? 'dark' : 'light',
  };
}

export function DateField({ value, onChange, T }: FieldProps) {
  if (Platform.OS === 'web') {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={webInputStyle(T)}
        aria-label="Date"
      />
    );
  }
  return (
    <TextInput
      style={{ borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface, borderRadius: RADIUS.control, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: T.textPrimary }}
      value={value}
      onChangeText={onChange}
      placeholder="YYYY-MM-DD"
      placeholderTextColor={T.textMuted}
    />
  );
}

export function TimeField({ value, onChange, T }: FieldProps) {
  if (Platform.OS === 'web') {
    return (
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={webInputStyle(T)}
        aria-label="Time"
      />
    );
  }
  return (
    <TextInput
      style={{ borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface, borderRadius: RADIUS.control, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: T.textPrimary }}
      value={value}
      onChangeText={onChange}
      placeholder="HH:MM"
      placeholderTextColor={T.textMuted}
    />
  );
}
