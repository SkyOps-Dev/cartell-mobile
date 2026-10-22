// Ported from frontend/test/screens/account/edit_password_test.dart (Troy's 9/22 checklist, row 6:
// Submit showed nothing while the request ran, so a second press sent the spent current password
// again), plus the rest of spec 11 §5: the live rules, the confirm field (quirk Q26), the popups.

import React from 'react';
import { BackHandler } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  PageBackHandler,
  PopScope,
} from '../../src/components/layout/PopScope';
import { PopupHost, popPopup } from '../../src/components/popups/popups';
import type { User } from '../../src/models/user';
import { EditPassword } from '../../src/screens/account/EditPassword';
import {
  persistUser,
  resetUserPersistorForTests,
} from '../../src/services/data/userPersistor';
import * as reporter from '../../src/services/reportError';
import type { HttpResponse } from '../../src/services/requests/networkHelper';
import { SecureStorage } from '../../src/services/secureStorage';
import { AuthBloc } from '../../src/state/auth/authBloc';
import { AuthBlocProvider } from '../../src/state/auth/AuthBlocContext';
import {
  GoToAccountSettingsScreen,
  MainAppBloc,
} from '../../src/state/mainApp/mainAppBloc';
import { MainAppBlocProvider } from '../../src/state/mainApp/MainAppBlocContext';
import { MaterialColors } from '../../src/theme/colors';

const backHandlers: (() => boolean | null | undefined)[] = [];

const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 36, left: 0, right: 0, bottom: 44 },
};
const user: User = {
  id: 1,
  email: 'test@cartell.local',
  firstName: 'Test',
  lastName: 'User',
  phoneNo: null,
  shouldSendEmails: false,
};

let mainAdds: unknown[];

async function settle() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1000);
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((r, j) => {
    resolve = r;
    reject = j;
  });
  return { promise, resolve, reject };
}

async function pump(
  setPassword: (args: {
    body: Record<string, string>;
  }) => Promise<HttpResponse>,
) {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <PageBackHandler />
      <AuthBlocProvider bloc={{ add: jest.fn() } as unknown as AuthBloc}>
        <MainAppBlocProvider
          bloc={
            { add: (e: unknown) => mainAdds.push(e) } as unknown as MainAppBloc
          }
        >
          <PopupHost>
            <PopScope canPop={false}>
              <EditPassword user={user} setPassword={setPassword} />
            </PopScope>
          </PopupHost>
        </MainAppBlocProvider>
      </AuthBlocProvider>
    </SafeAreaProvider>,
  );
}

async function fillIn(
  current = 'OldPassw0rd!',
  next = 'NewPassw0rd!',
  confirm = next,
) {
  await fireEvent.changeText(screen.getByTestId('currentPassword'), current);
  await fireEvent.changeText(screen.getByTestId('newPassword'), next);
  // The confirm field appears once the new one is valid.
  await fireEvent.changeText(screen.getByTestId('confirmPassword'), confirm);
}

// Hidden from screen readers while the HUD's modal barrier is up, so include hidden elements.
const submitButton = () =>
  screen.getByLabelText('Submit', { includeHiddenElements: true });
const closeButton = () =>
  screen.getByText(String.fromCodePoint(0xf00d), {
    includeHiddenElements: true,
  });

beforeEach(() => {
  jest.useFakeTimers();
  // Re-made each test: afterEach restores every spy.
  jest
    .spyOn(BackHandler, 'addEventListener')
    .mockImplementation((_event, handler) => {
      backHandlers.push(handler as () => boolean);
      return {
        remove: () => {
          backHandlers.splice(
            backHandlers.indexOf(handler as () => boolean),
            1,
          );
        },
      };
    });
  resetUserPersistorForTests();
  persistUser({ ...user, phoneNo: '' });
  mainAdds = [];
});

afterEach(async () => {
  for (let i = 0; i < 2; i++) {
    await act(async () => popPopup());
    await settle();
  }
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('Submit sends one request and shows it is working', async () => {
  const request = deferred<HttpResponse>();
  let calls = 0;
  await pump(() => {
    calls++;
    return request.promise;
  });
  await fillIn();

  await fireEvent.press(submitButton());
  expect(submitButton().props.accessibilityState).toEqual({ disabled: true });
  // The HUD's spinner is up.
  expect(screen.getByRole('progressbar')).toBeTruthy();

  // The second press Troy made while waiting.
  await fireEvent.press(submitButton());
  expect(calls).toBe(1);

  await act(async () => request.resolve({ statusCode: 204, body: '' }));
  await settle();
  expect(screen.getByText('Password Change Successful!')).toBeTruthy();
  expect(screen.queryByRole('progressbar')).toBeNull();
});

test('a request that throws leaves the screen usable', async () => {
  const report = jest.spyOn(reporter, 'reportError');
  const error = new Error('network down');
  await pump(async () => {
    throw error;
  });
  await fillIn();
  await fireEvent.press(submitButton());
  await settle();
  expect(screen.getByText('An error occurred.')).toBeTruthy();
  expect(
    screen.getByText('Please try again. Contact support if errors persist.'),
  ).toBeTruthy();
  expect(report).toHaveBeenCalledWith(error);
  expect(submitButton().props.accessibilityState).toEqual({ disabled: false });
});

test('a refused change reports 38bcd and shows the same generic popup', async () => {
  const report = jest.spyOn(reporter, 'reportError');
  await pump(async () => ({
    statusCode: 400,
    body: '{"current_password":["Invalid password."]}',
  }));
  await fillIn();
  await fireEvent.press(submitButton());
  await settle();
  expect(screen.getByText('An error occurred.')).toBeTruthy();
  expect(
    report.mock.calls.map(([e]) => (e as { cause: string }).cause),
  ).toEqual(['Error Code 38bcd:']);
});

test('success: Okay deletes the legacy password and goes back to Account Settings', async () => {
  const deletePassword = jest.spyOn(SecureStorage, 'deletePassword');
  const setPassword = jest.fn(async () => ({ statusCode: 204, body: '' }));
  await pump(setPassword);
  await fillIn();
  await fireEvent.press(submitButton());
  await settle();
  expect(setPassword).toHaveBeenCalledWith({
    body: { current_password: 'OldPassw0rd!', new_password: 'NewPassw0rd!' },
  });
  await fireEvent.press(screen.getByText('Okay'));
  await settle();
  expect(deletePassword).toHaveBeenCalled();
  expect(mainAdds).toHaveLength(1);
  expect(mainAdds[0]).toBeInstanceOf(GoToAccountSettingsScreen);
  expect(screen.queryByText('Password Change Successful!')).toBeNull();
});

test('a confirmation that differs stops it with "Passwords Do Not Match"', async () => {
  const setPassword = jest.fn();
  await pump(setPassword);
  await fillIn('OldPassw0rd!', 'NewPassw0rd!', 'NewPassw0rd?');
  await fireEvent.press(submitButton());
  await settle();
  expect(screen.getByText('Passwords Do Not Match')).toBeTruthy();
  expect(
    screen.getByText(
      'Please make sure your new password and confirmation match.',
    ),
  ).toBeTruthy();
  expect(setPassword).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('Okay'));
  await settle();
  expect(screen.queryByText('Passwords Do Not Match')).toBeNull();
});

describe('the new password, checked as it is typed', () => {
  test('lists every unmet rule in red; confirm appears only once all pass', async () => {
    await pump(jest.fn());
    await fireEvent.changeText(screen.getByTestId('newPassword'), 'abc');
    const errors = screen.getByText(
      /Password must contain at least one uppercase letter/,
    );
    expect(errors).toHaveStyle({ color: MaterialColors.red });
    expect(screen.getByText(/at least one number/)).toBeTruthy();
    expect(screen.queryByTestId('confirmPassword')).toBeNull();

    await fireEvent.changeText(
      screen.getByTestId('newPassword'),
      'NewPassw0rd!',
    );
    expect(screen.queryByText(/uppercase/)).toBeNull();
    expect(screen.getByTestId('confirmPassword')).toBeTruthy();
  });

  test('turning invalid clears and hides confirm', async () => {
    await pump(jest.fn());
    await fireEvent.changeText(
      screen.getByTestId('newPassword'),
      'NewPassw0rd!',
    );
    await fireEvent.changeText(
      screen.getByTestId('confirmPassword'),
      'NewPassw0rd!',
    );
    await fireEvent.changeText(screen.getByTestId('newPassword'), 'New');
    expect(screen.queryByTestId('confirmPassword')).toBeNull();
    await fireEvent.changeText(
      screen.getByTestId('newPassword'),
      'NewPassw0rd!',
    );
    expect(screen.getByTestId('confirmPassword').props.value).toBe('');
  });

  test('one valid password edited into another keeps the old confirmation (Q26)', async () => {
    await pump(jest.fn());
    await fireEvent.changeText(
      screen.getByTestId('newPassword'),
      'NewPassw0rd!',
    );
    await fireEvent.changeText(
      screen.getByTestId('confirmPassword'),
      'NewPassw0rd!',
    );
    await fireEvent.changeText(
      screen.getByTestId('newPassword'),
      'NewPassw0rd!2',
    );
    expect(screen.getByTestId('confirmPassword').props.value).toBe(
      'NewPassw0rd!',
    );
  });
});

describe('leaving', () => {
  test('X and Back go to Account Settings, saving nothing', async () => {
    await pump(jest.fn());
    await fireEvent.press(closeButton());
    await act(async () => {
      [...backHandlers].reverse().some(handler => handler());
    });
    expect(mainAdds.map(e => (e as object).constructor)).toEqual([
      GoToAccountSettingsScreen,
      GoToAccountSettingsScreen,
    ]);
  });

  test('while the request runs, X is disabled and Back is ignored', async () => {
    const request = deferred<HttpResponse>();
    await pump(() => request.promise);
    await fillIn();
    await fireEvent.press(submitButton());
    await fireEvent.press(closeButton());
    await act(async () => {
      [...backHandlers].reverse().some(handler => handler());
    });
    expect(mainAdds).toHaveLength(0);
    await act(async () => request.resolve({ statusCode: 204, body: '' }));
    await settle();
  });
});
