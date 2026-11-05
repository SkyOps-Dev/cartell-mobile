// Port of frontend/lib/services/text_formatters.dart (CapitalizationFormatter), with the part of
// Flutter's TextInputFormatter contract (services/text_formatter.dart) the app's formatters use:
// a formatter turns the field's value before an edit and the edited value into the value shown.
// A TextField runs its formatters in order on each edit the user makes, never on text set in code.
// Not ported: CharRange, which nothing in the app uses.

/** TextEditingValue: the text and the selection (start ≤ end, in UTF-16 code units). */
export type TextEditingValue = {
  text: string;
  selection: { start: number; end: number };
};

export interface TextInputFormatter {
  formatEditUpdate(
    oldValue: TextEditingValue,
    newValue: TextEditingValue,
  ): TextEditingValue;
}

/** Upper-cases the edited text and keeps its selection. */
export class CapitalizationFormatter implements TextInputFormatter {
  formatEditUpdate(
    _oldValue: TextEditingValue,
    newValue: TextEditingValue,
  ): TextEditingValue {
    return { text: newValue.text.toUpperCase(), selection: newValue.selection };
  }
}

/**
 * Runs `formatters` over an edit, as TextField does: each gets the value before the edit and the
 * previous formatter's result.
 */
export function applyFormatters(
  formatters: TextInputFormatter[],
  oldValue: TextEditingValue,
  newValue: TextEditingValue,
): TextEditingValue {
  return formatters.reduce(
    (value, formatter) => formatter.formatEditUpdate(oldValue, value),
    newValue,
  );
}

/**
 * The edit React Native reports as only the new text, as a TextEditingValue pair: the old value's
 * selection is taken to be the span that changed (the longest common start and end of the two
 * texts), and the new one sits at the end of what was put in. For typing and pasting at the cursor
 * that is exactly the selection Flutter sees. For Backspace Flutter sees the cursor after the
 * deleted character and this sees that character selected; MaskTextInputFormatter works both out
 * to the same change (the same replace start and length). Replacing a selection with text that
 * begins or ends the same way reads as a smaller edit.
 */
export function editFromTexts(
  oldText: string,
  newText: string,
): { oldValue: TextEditingValue; newValue: TextEditingValue } {
  let prefix = 0;
  const shorter = Math.min(oldText.length, newText.length);
  while (prefix < shorter && oldText[prefix] === newText[prefix]) {
    prefix++;
  }
  let suffix = 0;
  while (
    suffix < shorter - prefix &&
    oldText[oldText.length - 1 - suffix] ===
      newText[newText.length - 1 - suffix]
  ) {
    suffix++;
  }
  const oldEnd = oldText.length - suffix;
  const newEnd = newText.length - suffix;
  return {
    oldValue: { text: oldText, selection: { start: prefix, end: oldEnd } },
    newValue: { text: newText, selection: { start: newEnd, end: newEnd } },
  };
}
