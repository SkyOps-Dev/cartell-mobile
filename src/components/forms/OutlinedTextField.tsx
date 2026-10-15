// Port of a Flutter TextField decorated with kTextFieldDecoration (an outlined InputDecorator),
// with Material 3 defaults resolved from the Flutter 3.41.9 SDK (spec 07 §3.1, §4):
//
// - Box: 48 tall (min interactive height), border radius 32. Text starts 24 from the border
//   (contentPadding 20 + inputGap 4), or 52 with a prefix icon (48 box + 4). A suffix icon box sits
//   at the end with a 4 gap.
// - Borders: normal amber 1; focused amber 2; error → `errorBorderColor` 1 if the call site sets
//   an errorBorder, else error #F2B8B5 1; error + focused → #F2B8B5 2 (no focusedErrorBorder).
// - Input text: bodyLarge (16, 0.5, ×1.5), white. Cursor primary #D0BCFF.
// - Label: always white70 (kTextFieldDecoration.labelStyle wins over every state colour).
//   Resting 16 (height 1) at the text start; floats when focused or non-empty: scale 0.75,
//   centred on the top border line, x = 24, with a notch in the border. 167 ms fastOutSlowIn.
//   Its width is capped and ends in "…" (input_decorator.dart _RenderDecoration.performLayout):
//   box width − (4 × 2 + (prefix icon 48 or padding 20) + (padding 20, or the suffix width
//   resting, easing to 20 as it floats)), divided by the current scale. Resting "First Name"
//   beside an icon on a phone is therefore cut to "First Na…"; floated it fits.
// - Hint: bodyLarge onSurfaceVariant #CAC4D0. Shown when empty and either there is no label or
//   the label is floated. One line ending in "…" (TextField passes maxLines 1 as hintMaxLines),
//   so a narrow field shows "First Na…". Android's native placeholder cannot do that (it wraps
//   or cuts mid-letter), so the hint is drawn here over the input; the native placeholder stays,
//   transparent, for screen readers.
// - Error text: bodySmall (12, 0.4, ×1.33), #F2B8B5 unless `errorColor` is given, 4 below the box,
//   indented 24.
//
// The border notch is drawn by painting the floated label's background in `notchColor` (the
// screen colour behind the field), which looks the same as Flutter's gap on a plain background.
//
// On focus the field asks the enclosing RevealingScrollView, if any, to bring it into view.
// Inside an AutofillGroup it registers itself, so the group can clear it when it cancels (iOS).

import React, {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import {
  ColorScheme,
  kCartellYellow,
  kScaffoldBackground,
  MaterialColors,
  withOpacity,
} from '../../theme/colors';
import { M3, textStyle } from '../../theme/typography';
import { Icon } from '../icons/Icon';
import { AutofillGroupContext } from './AutofillGroup';
import { ScrollRevealContext } from '../layout/RevealingScrollView';
import { useAnimatedRef } from 'react-native-reanimated';
import type { IconData } from '../icons/iconData';

const FIELD_HEIGHT = 48;
const RADIUS = 32;
const CONTENT_START = 20;
const INPUT_GAP = 4;
const ICON_BOX = 48;
const LABEL_SCALE = 0.75;
const FLOAT_MS = 167;
// Curves.fastOutSlowIn = Cubic(0.4, 0.0, 0.2, 1.0); reverse uses the flipped curve.
const fastOutSlowIn = Easing.bezier(0.4, 0.0, 0.2, 1.0);
const fastOutSlowInFlipped = Easing.bezier(0.8, 0.0, 0.6, 1.0);

const inputStyle = textStyle(M3.bodyLarge, { color: MaterialColors.white });
const INPUT_LINE_HEIGHT = M3.bodyLarge.fontSize * M3.bodyLarge.height;

/** Points an animated ref at a node; it is a callback ref on device and an object in tests. */
function attachRef(target: unknown, node: unknown) {
  if (typeof target === 'function') {
    target(node);
  } else if (target && typeof target === 'object') {
    (target as { current: unknown }).current = node;
  }
}
const errorTextStyle = textStyle(M3.bodySmall);
const LABEL_FONT = 16;

export type OutlinedTextFieldProps = Omit<
  TextInputProps,
  'style' | 'placeholder' | 'placeholderTextColor'
> & {
  labelText?: string;
  hintText?: string;
  /** InputDecoration.errorText / error. Any non-null value puts the field in the error state. */
  errorText?: string | null;
  /** Colour of the error text when the call site styles it (Registration: #FF5252). */
  errorColor?: string;
  /** The call site's errorBorder colour, if it sets one (width 1). */
  errorBorderColor?: string;
  prefixIcon?: { icon: IconData; color: string };
  /** Rendered in the suffix slot (e.g. the show/hide-password IconButton). */
  suffix?: React.ReactNode;
  /** Background behind the field, used to cut the notch for the floated label. */
  notchColor?: string;
};

export const OutlinedTextField = forwardRef<
  React.ComponentRef<typeof TextInput>,
  OutlinedTextFieldProps
>(function OutlinedTextFieldImpl(
  {
    labelText,
    hintText,
    errorText,
    errorColor,
    errorBorderColor,
    prefixIcon,
    suffix,
    notchColor = kScaffoldBackground,
    value,
    defaultValue,
    onChangeText,
    onFocus,
    onBlur,
    ...inputProps
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(value ?? defaultValue ?? '');
  const currentText = value ?? text;
  const hasError = errorText !== undefined && errorText !== null;
  const floated = focused || currentText.length > 0;

  // Measured on the UI thread by the enclosing RevealingScrollView.
  const inputRef = useAnimatedRef<never>();
  const registerAutofillField = useContext(AutofillGroupContext);
  const unregisterAutofill = useRef<(() => void) | null>(null);
  const setInputRef = useCallback(
    (node: React.ComponentRef<typeof TextInput> | null) => {
      attachRef(inputRef, node);
      unregisterAutofill.current?.();
      unregisterAutofill.current =
        node !== null && registerAutofillField !== null
          ? registerAutofillField(node)
          : null;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [inputRef, ref, registerAutofillField],
  );
  const reveal = useContext(ScrollRevealContext);

  const progress = useRef(new Animated.Value(floated ? 1 : 0)).current;
  // The label's width cap follows the animation, so it is tracked here as well.
  const [labelProgress, setLabelProgress] = useState(floated ? 1 : 0);
  useEffect(() => {
    const id = progress.addListener(state => setLabelProgress(state.value));
    return () => progress.removeListener(id);
  }, [progress]);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    Animated.timing(progress, {
      toValue: floated ? 1 : 0,
      duration: FLOAT_MS,
      easing: floated ? fastOutSlowIn : fastOutSlowInFlipped,
      useNativeDriver: true,
    }).start();
  }, [floated, progress]);

  const [labelWidth, setLabelWidth] = useState(0);
  const onLabelLayout = (event: LayoutChangeEvent) =>
    setLabelWidth(event.nativeEvent.layout.width);
  const [boxWidth, setBoxWidth] = useState(0);
  const [suffixWidth, setSuffixWidth] = useState(ICON_BOX);

  const borderColor = hasError
    ? focused
      ? ColorScheme.error
      : errorBorderColor ?? ColorScheme.error
    : kCartellYellow;
  const borderWidth = focused ? 2 : 1;

  const inputStart = prefixIcon
    ? ICON_BOX + INPUT_GAP
    : CONTENT_START + INPUT_GAP;
  const floatedX = CONTENT_START + INPUT_GAP;
  // Floated: centre the scaled label on the top border line (input_decorator.dart paint()).
  const floatedY = (-LABEL_FONT * LABEL_SCALE) / 2 + 1 / 2;
  const restingY = (FIELD_HEIGHT - LABEL_FONT) / 2;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const labelSpace = Math.max(
    0,
    boxWidth -
      (INPUT_GAP * 2 +
        (prefixIcon ? ICON_BOX : CONTENT_START) +
        (suffix !== undefined
          ? lerp(suffixWidth, CONTENT_START, labelProgress)
          : CONTENT_START)),
  );
  const labelMaxWidth = labelSpace * lerp(1, 1 / LABEL_SCALE, labelProgress);

  const showHint =
    hintText !== undefined &&
    currentText.length === 0 &&
    (labelText === undefined || floated);

  return (
    <View>
      <View
        style={styles.box}
        onLayout={event => setBoxWidth(event.nativeEvent.layout.width)}
      >
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.border,
            { borderColor, borderWidth },
          ]}
        />
        {prefixIcon && (
          <View style={styles.iconBox}>
            <Icon icon={prefixIcon.icon} color={prefixIcon.color} />
          </View>
        )}
        <TextInput
          ref={setInputRef}
          {...inputProps}
          value={value}
          defaultValue={defaultValue}
          onChangeText={next => {
            setText(next);
            onChangeText?.(next);
          }}
          onFocus={event => {
            setFocused(true);
            reveal?.({ input: inputRef, lineHeight: INPUT_LINE_HEIGHT });
            onFocus?.(event);
          }}
          onBlur={event => {
            setFocused(false);
            onBlur?.(event);
          }}
          placeholder={showHint ? hintText : undefined}
          placeholderTextColor="transparent"
          numberOfLines={1}
          cursorColor={ColorScheme.primary}
          selectionColor={withOpacity(ColorScheme.primary, 0.4)}
          underlineColorAndroid="transparent"
          style={[
            styles.input,
            inputStyle,
            {
              marginLeft: prefixIcon ? INPUT_GAP : CONTENT_START + INPUT_GAP,
              marginRight: suffix ? INPUT_GAP : CONTENT_START + INPUT_GAP,
            },
          ]}
        />
        {showHint && (
          <View
            pointerEvents="none"
            style={[
              styles.hintBox,
              {
                left: inputStart,
                right:
                  suffix !== undefined
                    ? suffixWidth + INPUT_GAP
                    : CONTENT_START + INPUT_GAP,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[inputStyle, styles.hintText]}
            >
              {hintText}
            </Text>
          </View>
        )}
        {suffix !== undefined && (
          <View
            style={styles.suffixBox}
            onLayout={event => setSuffixWidth(event.nativeEvent.layout.width)}
          >
            {suffix}
          </View>
        )}
        {labelText !== undefined && (
          <Animated.View
            pointerEvents="none"
            onLayout={onLabelLayout}
            style={[
              styles.label,
              // Hidden until the box is measured, so the uncapped label never shows.
              boxWidth > 0 ? null : styles.hidden,
              {
                maxWidth: labelMaxWidth,
                transform: [
                  {
                    translateX: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [inputStart, floatedX],
                    }),
                  },
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [restingY, floatedY],
                    }),
                  },
                  // Scale around the label's left/top corner, as Flutter's paint does.
                  { translateX: -labelWidth / 2 },
                  { translateY: -LABEL_FONT / 2 },
                  {
                    scale: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, LABEL_SCALE],
                    }),
                  },
                  { translateX: labelWidth / 2 },
                  { translateY: LABEL_FONT / 2 },
                ],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.notch,
                {
                  backgroundColor: notchColor,
                  opacity: progress.interpolate({
                    inputRange: [0, 0.01, 1],
                    outputRange: [0, 1, 1],
                  }),
                },
              ]}
            />
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={styles.labelText}
            >
              {labelText}
            </Text>
          </Animated.View>
        )}
      </View>
      {hasError && errorText !== '' && (
        <Text
          style={[
            styles.error,
            errorTextStyle,
            { color: errorColor ?? ColorScheme.error },
          ]}
        >
          {errorText}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  box: {
    minHeight: FIELD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  border: { borderRadius: RADIUS },
  iconBox: {
    width: ICON_BOX,
    height: ICON_BOX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // At least 48 × 48; wider when the call site pads its suffix (Login: 5 each side).
  suffixBox: {
    minWidth: ICON_BOX,
    minHeight: ICON_BOX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 0,
    minHeight: FIELD_HEIGHT,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  hidden: { opacity: 0 },
  hintBox: {
    position: 'absolute',
    top: 0,
    height: FIELD_HEIGHT,
    justifyContent: 'center',
  },
  hintText: {
    color: ColorScheme.onSurfaceVariant,
    includeFontPadding: false,
  },
  label: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  // The 4-px gap padding either side of the floated label (OutlineInputBorder.gapPadding).
  notch: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -INPUT_GAP / LABEL_SCALE,
    right: -INPUT_GAP / LABEL_SCALE,
  },
  labelText: {
    fontSize: LABEL_FONT,
    lineHeight: LABEL_FONT,
    letterSpacing: M3.bodyLarge.letterSpacing,
    color: MaterialColors.white70,
    includeFontPadding: false,
  },
  error: {
    marginTop: 4,
    marginLeft: CONTENT_START + INPUT_GAP,
  },
});
