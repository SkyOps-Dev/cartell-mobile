// Port of a Flutter TextField with a plain InputDecoration (no theme override), as the pairing
// wizard's Wi-Fi password field uses it: Material 3's underline InputDecorator, with defaults
// resolved from the Flutter 3.41.9 SDK (input_decorator.dart _InputDecoratorDefaultsM3):
//
// - Box: content padding 0 across, 8 above and below the 24-tall input line (bodyLarge 16 × 1.5),
//   stretched to the 48 minimum interactive height, the input centred in it.
// - Underline along the bottom: onSurfaceVariant #CAC4D0 1; focused primary #D0BCFF 2; with an
//   error, error #F2B8B5 1, focused 2. It grows upwards, so nothing below moves.
// - Input text: bodyLarge in onSurface #E6E0E9; cursor primary.
// - Hint: bodyLarge in onSurfaceVariant, shown while empty.
// - Error text: bodySmall (12, 0.4, ×1.33) in error, 4 below the box (subtextGap), up to
//   `errorMaxLines` lines.
// Autofill can be switched off (Flutter's empty autofillHints), with suggestions and autocorrect.
// On focus it asks the enclosing RevealingScrollView, if any, to bring it into view.

import React, { useContext, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useAnimatedRef } from 'react-native-reanimated';

import { ColorScheme } from '../../theme/colors';
import { M3, textStyle } from '../../theme/typography';
import { ScrollRevealContext } from '../layout/RevealingScrollView';

const MIN_HEIGHT = 48;
const CONTENT_PADDING_VERTICAL = 8;
const SUBTEXT_GAP = 4;
const INPUT_LINE_HEIGHT = M3.bodyLarge.fontSize * M3.bodyLarge.height;

const inputStyle = textStyle(M3.bodyLarge, { color: ColorScheme.onSurface });
const errorStyle = textStyle(M3.bodySmall, { color: ColorScheme.error });

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  hintText?: string;
  errorText?: string | null;
  errorMaxLines?: number;
  obscureText?: boolean;
  /** autofillHints: const <String>[], enableSuggestions: false, autocorrect: false. */
  noAutofill?: boolean;
  testID?: string;
};

export function UnderlineTextField({
  value,
  onChangeText,
  hintText,
  errorText = null,
  errorMaxLines,
  obscureText = false,
  noAutofill = false,
  testID,
}: Props) {
  const [focused, setFocused] = useState(false);
  const inputRef = useAnimatedRef<TextInput>();
  const reveal = useContext(ScrollRevealContext);
  const hasError = errorText !== null && errorText !== undefined;
  let underlineColor: string = ColorScheme.onSurfaceVariant;
  if (hasError) {
    underlineColor = ColorScheme.error;
  } else if (focused) {
    underlineColor = ColorScheme.primary;
  }
  return (
    <View>
      <View style={styles.box}>
        <TextInput
          ref={inputRef}
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => {
            setFocused(true);
            reveal?.({
              input: inputRef as never,
              lineHeight: INPUT_LINE_HEIGHT,
            });
          }}
          onBlur={() => setFocused(false)}
          placeholder={hintText}
          placeholderTextColor={ColorScheme.onSurfaceVariant}
          secureTextEntry={obscureText}
          selectionColor={ColorScheme.primary}
          cursorColor={ColorScheme.primary}
          {...(noAutofill
            ? {
                autoComplete: 'off' as const,
                importantForAutofill: 'no' as const,
                textContentType: 'none' as const,
                autoCorrect: false,
                spellCheck: false,
              }
            : {})}
          style={[styles.input, inputStyle]}
        />
        <View
          style={[
            styles.underline,
            focused ? styles.underlineFocused : styles.underlineResting,
            { backgroundColor: underlineColor },
          ]}
        />
      </View>
      {hasError && (
        <Text numberOfLines={errorMaxLines} style={[styles.error, errorStyle]}>
          {errorText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { minHeight: MIN_HEIGHT, justifyContent: 'center' },
  input: {
    paddingHorizontal: 0,
    paddingVertical: CONTENT_PADDING_VERTICAL,
    includeFontPadding: false,
  },
  underline: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  underlineResting: { height: 1 },
  underlineFocused: { height: 2 },
  error: { marginTop: SUBTEXT_GAP, includeFontPadding: false },
});
