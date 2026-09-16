/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */
import { StyleSheet, Text as DefaultText, View as DefaultView } from 'react-native';

import { useColorScheme } from './useColorScheme';
import { fontFamilyForWeight } from '@/lib/theme';

import Colors from '@/constants/Colors';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'];
export type ViewProps = ThemeProps & DefaultView['props'];

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme();
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  // App-wide typeface switch lives here, not in each of the ~40 screens:
  // every existing `fontWeight: '700'` (etc.) a component already sets
  // gets mapped to the matching loaded Plus Jakarta Sans weight file
  // automatically. `style`'s own explicit fontFamily (used for the
  // Bricolage Grotesque display face) still wins — it's spread after this
  // computed default in the array below.
  const flat = StyleSheet.flatten(style) as { fontWeight?: string | number } | undefined;
  const fontFamily = fontFamilyForWeight(flat?.fontWeight);

  return <DefaultText style={[{ color, fontFamily }, style]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}
