import { Dimensions, Platform } from 'react-native';

// The whole app is designed and tested at phone width. On web there's no OS window
// to cap it, so a raw Dimensions.get('window') on a desktop browser returns the full
// monitor width — cards, photos, and text all stretch to fill it and look broken.
// This clamps every screen-width-dependent layout to the same column width the root
// layout centers the app inside (see app/_layout.tsx).
export const WEB_APP_MAX_WIDTH = 480;

function computeScreenSize() {
  const { width, height } = Dimensions.get('window');
  if (Platform.OS === 'web' && width > WEB_APP_MAX_WIDTH) {
    return { width: WEB_APP_MAX_WIDTH, height };
  }
  return { width, height };
}

const { width: SCREEN_W, height: SCREEN_H } = computeScreenSize();
export { SCREEN_W, SCREEN_H };
