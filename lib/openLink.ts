import { Linking, Platform } from 'react-native';

// A meeting link (or CV/portfolio link) opening in a real new tab, not a
// `notify(...)` popup showing the raw URL as text — `window.open` is the
// only way to *guarantee* a new tab on web; `Linking.openURL` existed
// already but its same-tab-vs-new-tab behavior isn't guaranteed across
// browsers, and this app is web-only right now anyway.
export function openInNewTab(url: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  Linking.openURL(url);
}
