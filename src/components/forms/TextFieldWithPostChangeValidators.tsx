// Port of frontend/lib/components/forms/text_field_with_post_change_validators.dart: a TextField
// (kTextFieldDecoration: OutlinedTextField, hint "Enter a value") whose validators only start once
// the field has gained focus once (`_hasBeenEdited`, set by any focus change). From then on each
// edit runs them in order and shows the first message any of them returns (or none), until the
// next edit. The shown error is `errorText` when given, else the validators', else the
// decoration's own errorText as it was when the field was first built (`decorationErrorText`:
// Flutter keeps the first decoration it is given).
//
// The text lives in a controller (a ValueNotifier<string>, Flutter's TextEditingController), so
// the owner can read and set it. Text set on the controller in code shows at once and runs no
// formatter and no validator, as in Flutter. Each edit the user makes goes through
// `inputFormatters` in order (TextField's inputFormatters); `onChanged` and the validators get the
// formatted text, and only when it differs from the text before the edit.
// The validator state belongs to this field: a field mounted afresh starts unedited, with no
// message (Add Hub's name field is a new one each time the MAC field appears or goes).
// PORT-GAP: the cursor after an edit in the middle of formatted text. Flutter puts it where the
// formatter says; here it is wherever the platform leaves it once the text is replaced (Android
// keeps it after the edit, which matches when typing at the end).

import React, { useMemo, useState } from 'react';

import {
  applyFormatters,
  editFromTexts,
  type TextInputFormatter,
} from '../../services/textInputFormatters';
import {
  useValueListenable,
  type ValueNotifier,
} from '../../utilities/valueNotifier';
import { OutlinedTextField } from './OutlinedTextField';

type Props = {
  controller: ValueNotifier<string>;
  enabled?: boolean;
  onChanged?: (value: string) => void;
  inputFormatters?: TextInputFormatter[];
  labelText?: string;
  errorText?: string | null;
  /** The errorText inside the call site's InputDecoration. */
  decorationErrorText?: string | null;
  validatorsToRunAfterFirstEdit?: ((value: string) => string | null)[];
  testID?: string;
};

export function TextFieldWithPostChangeValidators({
  controller,
  enabled = true,
  onChanged,
  inputFormatters,
  labelText,
  errorText,
  decorationErrorText,
  validatorsToRunAfterFirstEdit,
  testID,
}: Props) {
  const [firstDecorationErrorText] = useState(decorationErrorText ?? null);
  const text = useValueListenable(controller);
  const [hasBeenEdited, setHasBeenEdited] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const formatters = useMemo(() => inputFormatters ?? [], [inputFormatters]);

  const handleChanged = (value: string) => {
    if (hasBeenEdited && validatorsToRunAfterFirstEdit !== undefined) {
      let errorMsg: string | null = null;
      for (
        let i = 0;
        errorMsg === null && i < validatorsToRunAfterFirstEdit.length;
        i++
      ) {
        errorMsg = validatorsToRunAfterFirstEdit[i](value);
      }
      setValidationError(errorMsg);
    }
    onChanged?.(value);
  };

  return (
    <OutlinedTextField
      testID={testID}
      enabled={enabled}
      labelText={labelText}
      hintText="Enter a value"
      errorText={errorText ?? validationError ?? firstDecorationErrorText}
      value={text}
      onChangeText={next => {
        const before = controller.value;
        const { oldValue, newValue } = editFromTexts(before, next);
        const formatted = applyFormatters(formatters, oldValue, newValue).text;
        controller.value = formatted;
        if (formatted !== before) {
          handleChanged(formatted);
        }
      }}
      onFocus={() => setHasBeenEdited(true)}
      onBlur={() => setHasBeenEdited(true)}
    />
  );
}
