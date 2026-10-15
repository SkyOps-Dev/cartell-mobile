// Ported from frontend/test/screens/welcome/registration_screen_test.dart

import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  RegistrationScreen,
  validatePassword,
} from '../../src/screens/welcome/RegistrationScreen';
import * as autofill from '../../src/services/autofill';
import { AuthBloc } from '../../src/state/auth/authBloc';
import { AuthBlocProvider } from '../../src/state/auth/AuthBlocContext';
import { kCartellAlertRed } from '../../src/theme/colors';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

type Props = Partial<React.ComponentProps<typeof RegistrationScreen>>;

function setup() {
  const bloc = new AuthBloc();
  const add = jest.spyOn(bloc, 'add').mockImplementation(() => {});
  const element = (p: Props) => (
    <SafeAreaProvider initialMetrics={metrics}>
      <AuthBlocProvider bloc={bloc}>
        <RegistrationScreen
          temporaryEmail={null}
          temporaryFirstName={null}
          temporaryLastName={null}
          temporaryPhone={null}
          isSubmitting={false}
          {...p}
        />
      </AuthBlocProvider>
    </SafeAreaProvider>
  );
  return { bloc, add, element };
}

describe('RegistrationScreen — autofill wiring (A1)', () => {
  test('the form is one AutofillGroup that cancels on dispose (PARITY_ISSUES P5)', async () => {
    const register = jest.spyOn(autofill, 'registerAutofillField');
    const close = jest.spyOn(autofill, 'closeAutofillGroup');
    const finish = jest.spyOn(autofill, 'finishAutofillContext');
    const { element } = setup();
    await render(element({}));
    // First, Last, Email, Password and Phone; Confirm appears only once the password is valid.
    expect(register).toHaveBeenCalledTimes(5);
    const group = register.mock.calls[0][0];
    expect(register.mock.calls.every(([g]) => g === group)).toBe(true);
    await act(async () => screen.unmount());
    expect(close).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledWith(group);
    expect(finish).not.toHaveBeenCalled();
    register.mockRestore();
    close.mockRestore();
    finish.mockRestore();
  });

  test('the password field asks for a NEW password', async () => {
    const { element } = setup();
    await render(element({}));
    expect(screen.getByTestId('password').props.autoComplete).toBe(
      'new-password',
    );
    expect(screen.getByTestId('password').props.textContentType).toBe(
      'newPassword',
    );
  });

  test('the confirm field carries the same hint once it appears', async () => {
    const { element } = setup();
    await render(element({}));
    expect(screen.queryByTestId('confirmPassword')).toBeNull();
    await fireEvent.changeText(screen.getByTestId('password'), 'Passw0rd!');
    expect(screen.getByTestId('confirmPassword').props.autoComplete).toBe(
      'new-password',
    );
  });

  test('identity fields advertise themselves', async () => {
    const { element } = setup();
    await render(element({}));
    expect(screen.getByTestId('firstName').props.autoComplete).toBe(
      'name-given',
    );
    expect(screen.getByTestId('lastName').props.autoComplete).toBe(
      'name-family',
    );
    expect(screen.getByTestId('email').props.autoComplete).toBe('username');
    expect(screen.getByTestId('phone').props.autoComplete).toBe('tel');
  });
});

describe('RegistrationScreen — in-flight attempt', () => {
  test('isSubmitting drives the spinner', async () => {
    const { element } = setup();
    const { rerender } = await render(element({}));
    expect(screen.queryByRole('progressbar')).toBeNull();
    await rerender(element({ isSubmitting: true }));
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  test('the back button is disabled mid-attempt', async () => {
    const { element } = setup();
    await render(element({ isSubmitting: true }));
    expect(
      screen.getByRole('button', {
        name: 'Back',
        includeHiddenElements: true,
      }).props.accessibilityState,
    ).toEqual({
      disabled: true,
    });
  });

  test('typed input survives a rejected attempt', async () => {
    const { element } = setup();
    const { rerender } = await render(element({}));
    await fireEvent.changeText(screen.getByTestId('firstName'), 'Ann');
    await rerender(element({ temporaryFirstName: 'Ann', isSubmitting: true }));
    await rerender(element({ temporaryFirstName: 'Ann' }));
    expect(
      screen.getByTestId('firstName', { includeHiddenElements: true }).props
        .value,
    ).toBe('Ann');
  });
});

describe('RegistrationScreen — A3 polish', () => {
  test('Register is disabled mid-attempt', async () => {
    const { element, add } = setup();
    await render(element({ isSubmitting: true }));
    // The busy overlay hides the form from screen readers, so look past it.
    const button = screen.getByRole('button', {
      name: 'Register',
      includeHiddenElements: true,
    });
    expect(button.props.accessibilityState).toEqual({ disabled: true });
    await fireEvent.press(button);
    expect(add).not.toHaveBeenCalled();
  });

  test('validation errors use the brand red, not Material red', async () => {
    const { element } = setup();
    await render(element({}));
    await fireEvent.changeText(screen.getByTestId('email'), 'x');
    const message = screen.getByText('Please enter a valid email');
    expect(StyleSheet.flatten(message.props.style).color).toBe(
      kCartellAlertRed,
    );
  });

  test('both password toggles and the back button are labelled', async () => {
    const { element } = setup();
    await render(element({}));
    await fireEvent.changeText(screen.getByTestId('password'), 'Passw0rd!');
    expect(
      screen.getAllByRole('button', { name: 'Show password' }),
    ).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
  });
});

describe('password rules (spec 08 §6)', () => {
  test('empty reports only the empty rule', () => {
    expect(validatePassword('')).toBe('Password field cannot be empty\n');
  });

  test('every failing rule is listed, one per line', () => {
    expect(validatePassword('abc')).toBe(
      'Password must contain at least one uppercase letter\n' +
        'Password must contain at least one number\n' +
        'Password must contain at least one special character\n' +
        'Password must be at least 8 characters long\n',
    );
  });

  test('a password meeting every rule passes', () => {
    expect(validatePassword('Passw0rd!')).toBe('');
  });
});
