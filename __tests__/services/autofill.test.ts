// The autofill context (PARITY_ISSUES P5): save only on success, cancel when the screen goes away.

import { NativeModules, Platform } from 'react-native';

import {
  closeAutofillGroup,
  createAutofillGroup,
  finishAutofillContext,
  openAutofillGroup,
  registerAutofillField,
} from '../../src/services/autofill';

const nativeAutofill = { commit: jest.fn(), cancel: jest.fn() };
const field = () => ({ clear: jest.fn() });

beforeEach(() => {
  NativeModules.CartellAutofill = nativeAutofill;
  jest.clearAllMocks();
});
afterEach(() => {
  jest.restoreAllMocks();
});

function openGroupWith(...fields: { clear(): void }[]) {
  const group = createAutofillGroup();
  openAutofillGroup(group);
  fields.forEach(f => registerAutofillField(group, f));
  return group;
}

describe('Android: AutofillManager commit / cancel, as Flutter’s engine', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  test('saving commits', () => {
    const group = openGroupWith(field());
    finishAutofillContext({ shouldSave: true });
    expect(nativeAutofill.commit).toHaveBeenCalledTimes(1);
    closeAutofillGroup(group);
  });

  test('the group going away cancels', () => {
    const group = openGroupWith(field());
    closeAutofillGroup(group);
    expect(nativeAutofill.cancel).toHaveBeenCalledTimes(1);
    expect(nativeAutofill.commit).not.toHaveBeenCalled();
  });

  test('without the native module nothing throws', () => {
    NativeModules.CartellAutofill = undefined;
    const group = openGroupWith(field());
    expect(() => finishAutofillContext({ shouldSave: true })).not.toThrow();
    expect(() => closeAutofillGroup(group)).not.toThrow();
  });
});

describe('iOS: cancelling clears the fields before they go, saving leaves them', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'ios');
  });

  test('the group going away unsaved clears its fields', () => {
    const email = field();
    const password = field();
    const group = openGroupWith(email, password);
    closeAutofillGroup(group);
    expect(email.clear).toHaveBeenCalledTimes(1);
    expect(password.clear).toHaveBeenCalledTimes(1);
  });

  test('after a save the fields go away with their text, so iOS offers to save', () => {
    const email = field();
    const group = openGroupWith(email);
    finishAutofillContext({ shouldSave: true });
    closeAutofillGroup(group);
    expect(email.clear).not.toHaveBeenCalled();
  });

  test('a screen switch clears only the screen that is leaving', () => {
    // Registration → Login after a 201: Login's group is already open (with the email filled
    // in) when Registration's cancels.
    const leaving = field();
    const leavingGroup = openGroupWith(leaving);
    const arriving = field();
    const arrivingGroup = openGroupWith(arriving);
    closeAutofillGroup(leavingGroup);
    expect(leaving.clear).toHaveBeenCalledTimes(1);
    expect(arriving.clear).not.toHaveBeenCalled();
    closeAutofillGroup(arrivingGroup);
  });

  test('a removed field is not cleared', () => {
    const gone = field();
    const group = openGroupWith();
    const unregister = registerAutofillField(group, gone);
    unregister();
    closeAutofillGroup(group);
    expect(gone.clear).not.toHaveBeenCalled();
  });
});
