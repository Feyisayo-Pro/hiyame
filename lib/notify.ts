import { Alert, Platform } from 'react-native';
import Toast from 'react-native-toast-message';

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
// `notify()` is a drop-in replacement for Alert.alert. Two paths:
// - Single-button / no-decision calls (the vast majority — "Photo updated",
//   "Could not post role", etc.) are pure announcements, not decisions.
//   These now go through react-native-toast-message on web instead of
//   `window.alert` — a blocking native browser dialog was exactly the kind
//   of dated-feeling UI this app's whole design pass has been working
//   against, for something that was never actually asking the user
//   anything. Native platforms keep real Alert.alert unchanged (untested,
//   not this app's actual delivery surface right now — not the place to
//   introduce new unverified behavior).
// - True confirm/cancel decisions (2+ real buttons) still need something
//   that blocks and returns a choice, which a toast fundamentally can't do
//   (it's a passive, auto-dismissing announcement) — those keep using
//   window.confirm on web, Alert.alert on native, same as before.
export function notify(title: string, message?: string, buttons?: AlertButton[]): void {
  if (!buttons || buttons.length <= 1) {
    if (Platform.OS === 'web') {
      Toast.show({ type: toastType(title), text1: title, text2: message, position: 'top', visibilityTime: 4000 });
    } else {
      Alert.alert(title, message, buttons);
    }
    buttons?.[0]?.onPress?.();
    return;
  }

  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;
  const actionable = buttons.filter((b) => b.style !== 'cancel');
  const cancel = buttons.find((b) => b.style === 'cancel');

  if (window.confirm(text)) {
    (actionable[actionable.length - 1] ?? actionable[0])?.onPress?.();
  } else {
    cancel?.onPress?.();
  }
}

// Every call site writes a plain-English title ("Photo updated", "Could not
// post role", "Name required") rather than passing an explicit severity, so
// this infers one from the wording actually used across the app (checked
// against every real notify() call site) rather than requiring every one of
// them to be touched to add a type.
function toastType(title: string): 'success' | 'error' | 'info' {
  const t = title.toLowerCase();
  if (/wrong|failed|fail|error|invalid|can'?t|could not|required|didn'?t/.test(t)) return 'error';
  if (/updated|live|sent|added|invited|success/.test(t)) return 'success';
  return 'info';
}
