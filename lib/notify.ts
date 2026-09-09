import { Alert, Platform } from 'react-native';

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

// BUG FIX (found while verifying the role-creation UI): react-native-web's
// Alert.alert is a total no-op — `static alert() {}` — so on web, every error
// or confirmation message the app tries to show via Alert.alert simply
// vanishes: no dialog, no console output, nothing. That made a real backend
// bug (see the roles RLS migration committed alongside this file) look like
// silent success/failure with zero feedback. Since web is this app's actual
// delivery surface right now, that's not a cosmetic gap — every Alert.alert
// call site in the app was affected.
//
// `notify()` is a drop-in replacement for Alert.alert: native platforms get
// the real thing unchanged; web falls back to window.alert/window.confirm,
// which at least surfaces something a person (or a Playwright test's
// `page.on('dialog')` handler) can see, without pulling in a custom modal
// component for what should eventually become in-app toasts/banners.
export function notify(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;
  const actionable = (buttons ?? []).filter((b) => b.style !== 'cancel');
  const cancel = (buttons ?? []).find((b) => b.style === 'cancel');

  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  if (window.confirm(text)) {
    (actionable[actionable.length - 1] ?? actionable[0])?.onPress?.();
  } else {
    cancel?.onPress?.();
  }
}
