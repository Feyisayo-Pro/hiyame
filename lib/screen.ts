import { Dimensions, Platform } from 'react-native';

// The app is designed at phone width; on web there's no OS window to cap it, so a
// raw Dimensions.get('window') on desktop returns the full monitor width and
// screen-width-dependent layout math breaks. This clamps that math to the width
// the root layout centers the app column inside (see app/_layout.tsx). Desktop
// web also gets a top nav bar instead of the bottom tab bar (components/TopNav).
export const WEB_APP_MAX_WIDTH = 1440;

function computeScreenSize() {
  const { width, height } = Dimensions.get('window');
  if (Platform.OS === 'web' && width > WEB_APP_MAX_WIDTH) {
    return { width: WEB_APP_MAX_WIDTH, height };
  }
  return { width, height };
}

const { width: SCREEN_W, height: SCREEN_H } = computeScreenSize();
export { SCREEN_W, SCREEN_H };
