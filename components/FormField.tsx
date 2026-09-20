import { useMemo, useRef, useState, ReactNode } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from '@/components/Themed';
import { useTheme, ThemePalette } from '@/lib/theme';
import { DURATION } from '@/lib/motion';

// Every auth form (candidate/company signup + signin) hand-rolled the same
// `fieldWrap`/`label`/`inputWrap` trio with a static, unstyled border — so
// the ONLY focus indicator was the browser's raw default `outline` (a
// generic blue ring with no relationship to the app's own radius/accent),
// exactly what showed up in the screenshot flagged as "not dope". This
// replaces that with a real branded focus state — animated border + soft
// accent glow — and kills the native outline so ours is the only one that
// shows.
//
// Render-prop children (same convention AnimatedPressable already uses for
// its `state.hovered`) so each call site keeps composing its own icon /
// TextInput / right-side button exactly as before, just wiring the exposed
// onFocus/onBlur onto its own TextInput instead of the inputWrap.
interface RenderProps {
  onFocus: () => void;
  onBlur: () => void;
  focused: boolean;
}

interface Props {
  label?: string;
  error?: string;
  hint?: string;
  style?: ViewStyle;
  /** Overrides the inner bordered box — e.g. the bio textarea needs
   * alignItems:'flex-start' and an auto height instead of the fixed
   * height:52 every single-line field uses. */
  innerStyle?: ViewStyle;
  /** The caller already renders `error`'s text itself (e.g. sharing one
   * footer row with a character count) — still turn the border red, just
   * skip FormField's own duplicate <Text>. */
  hideErrorText?: boolean;
  children: (props: RenderProps) => ReactNode;
}

export default function FormField({ label, error, hint, style, innerStyle, hideErrorText, children }: Props) {
  const T = useTheme();
  const st = useMemo(() => makeStyles(T), [T]);
  const anim = useRef(new Animated.Value(0)).current;
  const [focused, setFocused] = useState(false);

  const onFocus = () => {
    setFocused(true);
    Animated.timing(anim, { toValue: 1, duration: DURATION.fast, useNativeDriver: false }).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.timing(anim, { toValue: 0, duration: DURATION.fast, useNativeDriver: false }).start();
  };

  const borderColor = error ? T.danger : anim.interpolate({ inputRange: [0, 1], outputRange: [T.border, T.accent] });
  const shadowOpacity = error ? 0 : anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] });

  return (
    <View style={[st.fieldWrap, style]}>
      {label ? <Text style={st.label}>{label}</Text> : null}
      <Animated.View
        style={[
          st.inputWrap,
          error ? st.inputErrorBg : null,
          { borderColor, shadowOpacity },
          innerStyle,
        ]}
      >
        {children({ onFocus, onBlur, focused })}
      </Animated.View>
      {error && !hideErrorText ? <Text style={st.errorText}>{error}</Text> : hint ? <Text style={st.hintText}>{hint}</Text> : null}
    </View>
  );
}

const makeStyles = (T: ThemePalette) => StyleSheet.create({
  fieldWrap: { marginBottom: 22 },
  label: { fontSize: 13, fontWeight: '700', color: T.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: T.surface, borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16, height: 52,
    // The animated glow — a soft accent-colored shadow that fades in with
    // the border color, instead of the browser's flat default ring.
    shadowColor: T.accent, shadowOffset: { width: 0, height: 0 }, shadowRadius: 10, elevation: 0,
  },
  inputErrorBg: { backgroundColor: T.dangerBg },
  errorText: { fontSize: 12, color: T.danger, fontWeight: '500', marginTop: 6, marginLeft: 4 },
  hintText: { fontSize: 12, color: T.textMuted, fontWeight: '500', marginTop: 6, marginLeft: 4 },
});

// Web-only: kills the browser's own default focus outline on the inner
// TextInput so FormField's animated border/glow is the only focus
// indicator shown — otherwise both render at once (the native ring sitting
// awkwardly inside our own rounded border). `outlineStyle` isn't a real RN
// StyleSheet property (it's CSS-only), but react-native-web passes unknown
// style keys straight through to the DOM, same escape hatch already used
// for `filter: blur()` elsewhere in this app.
export const NO_NATIVE_OUTLINE = { outlineStyle: 'none' } as any;
