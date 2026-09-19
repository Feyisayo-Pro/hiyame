import { BaseToast, ToastConfig } from 'react-native-toast-message';
import { fontFamilyForWeight } from '@/lib/theme';

// Matches this app's actual palette (lib/theme.ts's LIGHT palette accent/
// emerald/danger) and body font instead of shipping react-native-toast-
// message's generic default look, which would've been the exact kind of
// off-the-shelf, unstyled component this whole design pass has been
// replacing everywhere else in the app.
const ACCENT = '#1DA1F2';
const EMERALD = '#17A75B';
const DANGER = '#E0245E';
const TEXT_PRIMARY = '#0F1419';
const TEXT_SECONDARY = '#536471';

const base = {
  style: { borderLeftWidth: 4, borderRadius: 14, height: 'auto' as const, paddingVertical: 10 },
  contentContainerStyle: { paddingHorizontal: 14 },
  text1Style: { fontSize: 14, fontWeight: '700' as const, color: TEXT_PRIMARY, fontFamily: fontFamilyForWeight('700') },
  text2Style: { fontSize: 12.5, fontWeight: '500' as const, color: TEXT_SECONDARY, fontFamily: fontFamilyForWeight('500') },
  text2NumberOfLines: 3,
};

export const toastConfig: ToastConfig = {
  success: (props) => <BaseToast {...props} {...base} style={[base.style, { borderLeftColor: EMERALD }]} />,
  error: (props) => <BaseToast {...props} {...base} style={[base.style, { borderLeftColor: DANGER }]} />,
  info: (props) => <BaseToast {...props} {...base} style={[base.style, { borderLeftColor: ACCENT }]} />,
};
