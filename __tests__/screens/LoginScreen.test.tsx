// Ported from frontend/test/screens/welcome/login_screen_test.dart

import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoginScreen } from '../../src/screens/welcome/LoginScreen';
import { AttemptLoggingInEvent, AuthBloc } from '../../src/state/auth/authBloc';
import { AuthBlocProvider } from '../../src/state/auth/AuthBlocContext';
import { FontAwesomeIcons } from '../../src/components/icons/iconData';
import * as autofill from '../../src/services/autofill';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

type Props = Partial<React.ComponentProps<typeof LoginScreen>>;

function setup() {
  const bloc = new AuthBloc();
  const add = jest.spyOn(bloc, 'add').mockImplementation(() => {});
  const element = (p: Props) => (
    <SafeAreaProvider initialMetrics={metrics}>
      <AuthBlocProvider bloc={bloc}>
        <LoginScreen
          temporaryEmail={null}
          emailError={false}
          passwordError={false}
          isSubmitting={false}
          {...p}
        />
      </AuthBlocProvider>
    </SafeAreaProvider>
  );
  return { bloc, add, element };
}

const emailField = () => screen.getByPlaceholderText('Enter your email');
const passwordField = () => screen.getByPlaceholderText('Enter your password');

describe('LoginScreen — autofill wiring (A1)', () => {
  test('both credential fields sit inside a single AutofillGroup (PARITY_ISSUES P5)', async () => {
    const register = jest.spyOn(autofill, 'registerAutofillField');
    const { element } = setup();
    await render(element({}));
    expect(register).toHaveBeenCalledTimes(2);
    expect(register.mock.calls[0][0]).toBe(register.mock.calls[1][0]);
    register.mockRestore();
  });

  test('email advertises username and password advertises password', async () => {
    const { element } = setup();
    await render(element({}));
    expect(emailField().props.autoComplete).toBe('username');
    expect(emailField().props.textContentType).toBe('username');
    expect(passwordField().props.autoComplete).toBe('password');
    expect(passwordField().props.textContentType).toBe('password');
  });

  test('the autofill group cancels on dispose, never commits (PARITY_ISSUES P5)', async () => {
    const close = jest.spyOn(autofill, 'closeAutofillGroup');
    const finish = jest.spyOn(autofill, 'finishAutofillContext');
    const { element } = setup();
    await render(element({}));
    await act(async () => screen.unmount());
    expect(close).toHaveBeenCalledTimes(1);
    expect(finish).not.toHaveBeenCalled();
    close.mockRestore();
    finish.mockRestore();
  });

  test('email hands focus to the password field', async () => {
    const { element } = setup();
    await render(element({}));
    // "next" keeps the keyboard and moves on; submitting the email does not log in.
    expect(emailField().props.returnKeyType).toBe('next');
    expect(emailField().props.submitBehavior).toBe('submit');
    expect(passwordField().props.returnKeyType).toBe('done');
  });
});

describe('LoginScreen — empty-field errors (#513)', () => {
  test('shows no error text by default', async () => {
    const { element } = setup();
    await render(element({}));
    expect(screen.queryByText('Email field cannot be empty')).toBeNull();
    expect(screen.queryByText('Password field cannot be empty')).toBeNull();
  });

  test('renders the email error when the bloc sets emailError', async () => {
    const { element } = setup();
    await render(element({ emailError: true }));
    expect(screen.getByText('Email field cannot be empty')).toBeTruthy();
    expect(screen.queryByText('Password field cannot be empty')).toBeNull();
  });

  test('renders the password error when the bloc sets passwordError', async () => {
    const { element } = setup();
    await render(element({ passwordError: true }));
    expect(screen.getByText('Password field cannot be empty')).toBeTruthy();
  });

  test('renders both errors together', async () => {
    const { element } = setup();
    await render(element({ emailError: true, passwordError: true }));
    expect(screen.getByText('Email field cannot be empty')).toBeTruthy();
    expect(screen.getByText('Password field cannot be empty')).toBeTruthy();
  });
});

describe('LoginScreen — in-flight attempt', () => {
  test('isSubmitting drives the screen spinner', async () => {
    const { element } = setup();
    const { rerender } = await render(element({}));
    expect(screen.queryByRole('progressbar')).toBeNull();
    await rerender(element({ isSubmitting: true }));
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  test('the back button is disabled while an attempt is in flight', async () => {
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

  test('typed input survives a failed attempt', async () => {
    const { element } = setup();
    const { rerender } = await render(element({}));
    await fireEvent.changeText(emailField(), 'a@b.com');
    await fireEvent.changeText(passwordField(), 'secret');
    await rerender(element({ temporaryEmail: 'a@b.com', isSubmitting: true }));
    await rerender(element({ temporaryEmail: 'a@b.com' }));
    expect(screen.getByDisplayValue('a@b.com')).toBeTruthy();
    expect(screen.getByDisplayValue('secret')).toBeTruthy();
  });
});

describe('LoginScreen — A3 polish', () => {
  test('credential fields are leading-aligned', async () => {
    const { element } = setup();
    await render(element({}));
    expect(emailField().props.textAlign ?? 'left').toBe('left');
    expect(passwordField().props.textAlign ?? 'left').toBe('left');
  });

  test('the submit button is genuinely disabled mid-attempt', async () => {
    const { element, add } = setup();
    await render(element({ isSubmitting: true }));
    // The busy overlay hides the form from screen readers, so look past it.
    const button = screen.getByRole('button', {
      name: 'Log In',
      includeHiddenElements: true,
    });
    expect(button.props.accessibilityState).toEqual({ disabled: true });
    await fireEvent.press(button);
    expect(add).not.toHaveBeenCalled();
  });

  test('the password toggle and the back button are labelled', async () => {
    const { element } = setup();
    await render(element({}));
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
    await fireEvent.press(toggle);
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeTruthy();
  });
});

describe('LoginScreen — errors do not outlive the field (review #7)', () => {
  test('typing in a flagged field clears its message', async () => {
    const { element } = setup();
    await render(element({ emailError: true }));
    await fireEvent.changeText(emailField(), 'a');
    expect(screen.queryByText('Email field cannot be empty')).toBeNull();
  });

  test('clearing one message leaves the other alone', async () => {
    const { element } = setup();
    await render(element({ emailError: true, passwordError: true }));
    await fireEvent.changeText(emailField(), 'a');
    expect(screen.queryByText('Email field cannot be empty')).toBeNull();
    expect(screen.getByText('Password field cannot be empty')).toBeTruthy();
  });

  test('a fresh submit re-arms a dismissed message', async () => {
    const { element, add } = setup();
    const { rerender } = await render(element({ emailError: true }));
    await fireEvent.changeText(emailField(), 'a');
    await fireEvent.changeText(screen.getByDisplayValue('a'), '');
    expect(screen.queryByText('Email field cannot be empty')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Log In' }));
    expect(add).toHaveBeenCalledWith(expect.any(AttemptLoggingInEvent));
    // The bloc answers the empty submit with the same flags; the message is back.
    await act(async () => {
      await rerender(element({ emailError: true }));
    });
    expect(screen.getByText('Email field cannot be empty')).toBeTruthy();
  });
});

describe('LoginScreen — back button', () => {
  test('the arrow is onPrimaryContainer (#EADDFF), visible on the navy ground', async () => {
    const { element } = setup();
    await render(element({}));
    const arrow = screen.getByText(
      String.fromCodePoint(FontAwesomeIcons.arrowLeftLong.codePoint),
      { includeHiddenElements: true },
    );
    expect(StyleSheet.flatten(arrow.props.style).color).toBe('#EADDFF');
  });
});
