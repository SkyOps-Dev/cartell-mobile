// Port of Flutter's autofill context (services/autofill.dart TextInput.finishAutofillContext,
// widgets/autofill.dart AutofillGroup with onDisposeAction cancel; PARITY_ISSUES P5).
//
// The credential fields of a screen form one context. Finishing it with shouldSave: true is
// the only thing that makes the platform offer "Save password?"; finishing it with false throws
// it away. The auth screens finish it with true on success, and their AutofillGroup cancels it
// when the screen goes away, so a password the server rejected is never offered.
//
// What each platform does, as Flutter's engine does it:
// - Android: AutofillManager.commit() / cancel(), through the CartellAutofill native module.
// - iOS: the system offers to save credential fields that are removed while they still hold
//   text. Flutter saves by removing them as they are and cancels by clearing their text first
//   (FlutterTextInputPlugin). A group's fields are cleared the same way when it cancels, unless
//   the context was saved while it was open: they then go away with their text, and iOS offers
//   to save.
//
// Each group keeps its own fields and its own "saved" mark: during a screen switch the next
// screen's group is already open while the previous one cancels, and only the previous one's
// fields may be cleared.

import { NativeModules, Platform } from 'react-native';

type AutofillNative = { commit(): boolean; cancel(): boolean };
type Clearable = { clear(): void };

export type AutofillContextGroup = {
  fields: Set<Clearable>;
  saved: boolean;
};

const native = (): AutofillNative | undefined =>
  NativeModules.CartellAutofill as AutofillNative | undefined;

const openGroups = new Set<AutofillContextGroup>();

export function createAutofillGroup(): AutofillContextGroup {
  return { fields: new Set(), saved: false };
}

/** An AutofillGroup appeared. */
export function openAutofillGroup(group: AutofillContextGroup): void {
  openGroups.add(group);
}

/** A field inside `group`; returns its removal. */
export function registerAutofillField(
  group: AutofillContextGroup,
  field: Clearable,
): () => void {
  group.fields.add(field);
  return () => {
    group.fields.delete(field);
  };
}

function cancel(groups: Iterable<AutofillContextGroup>): void {
  if (Platform.OS === 'android') {
    native()?.cancel();
    return;
  }
  for (const group of groups) {
    if (!group.saved) {
      group.fields.forEach(field => field.clear());
    }
  }
}

/** The group went away: AutofillContextAction.cancel. */
export function closeAutofillGroup(group: AutofillContextGroup): void {
  openGroups.delete(group);
  cancel([group]);
}

/** TextInput.finishAutofillContext, for the whole open context. */
export function finishAutofillContext({
  shouldSave = true,
}: { shouldSave?: boolean } = {}): void {
  if (!shouldSave) {
    cancel(openGroups);
    return;
  }
  if (Platform.OS === 'android') {
    native()?.commit();
  }
  openGroups.forEach(group => {
    group.saved = true;
  });
}
