import { useEffect } from 'react';
import { Platform } from 'react-native';

// The one genuine accessibility gap flagged in the UX review: nothing in the
// app showed a visible focus state for keyboard navigation (bare Pressables,
// no :focus-visible styling anywhere) — a keyboard/switch user tabbing
// through the app had no way to see where they were.
//
// Fixed once, globally, instead of touching every Pressable/TextInput call
// site: every interactive element React Native Web renders is a real DOM
// node with a tabIndex (Pressable) or is natively focusable (TextInput,
// links, buttons), so a single :focus-visible rule covers all of them.
// :focus-visible itself is what does the hard part — it's the browser's own
// heuristic for "this focus came from a keyboard/switch, not a mouse click",
// so clicking a card with a mouse still won't show a ring, only Tabbing to it
// will.
const FOCUS_RING_STYLE_ID = 'hiyame-focus-ring';
const FOCUS_RING_CSS = `
  [tabindex]:focus-visible,
  button:focus-visible,
  a:focus-visible,
  input:focus-visible,
  textarea:focus-visible,
  select:focus-visible {
    outline: 2px solid #1DA1F2;
    outline-offset: 2px;
    border-radius: 4px;
  }
`;

export function useGlobalFocusRing(): void {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (document.getElementById(FOCUS_RING_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = FOCUS_RING_STYLE_ID;
    style.textContent = FOCUS_RING_CSS;
    document.head.appendChild(style);
  }, []);
}
