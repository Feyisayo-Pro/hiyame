import { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * Caps + centres screen content on wide desktop web.
 *
 * Expo Router's <Tabs> renders each screen into a scene container that, on web,
 * ignores parent width constraints and `sceneStyle` — a screen laid out with
 * `flex: 1` fills the whole viewport regardless of what the layout wraps it in.
 * The only reliable fix is to constrain the content *inside* each screen: this
 * wrapper sits directly under the screen's SafeAreaView and gives its subtree a
 * max width that stays centred, while still flexing to fill height and shrinking
 * to full width on mobile.
 */
export const CONTENT_MAX_WIDTH = 1180;

export default function ScreenFrame({ children, style }: { children: ReactNode; style?: any }) {
  return <View style={[styles.body, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  body: { flex: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' },
});
