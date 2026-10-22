// Edit Name and Edit Phone (edit_name.dart, edit_phone.dart; spec 11 §3, §4): what they show,
// Submit going back without waiting (quirk Q6), Edit Phone's two fetches of the user, and its
// error view.

import React from 'react';
import { BackHandler } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  PageBackHandler,
  PopScope,
} from '../../src/components/layout/PopScope';
import type { User } from '../../src/models/user';
import { EditName } from '../../src/screens/account/EditName';
import { EditPhone } from '../../src/screens/account/EditPhone';
import {
  persistUser,
  resetUserPersistorForTests,
} from '../../src/services/data/userPersistor';
import * as reporter from '../../src/services/reportError';
import { AuthRequestManager } from '../../src/services/requests/authRequests';
import { Result } from '../../src/services/result';
import { AuthBloc } from '../../src/state/auth/authBloc';
import { AuthBlocProvider } from '../../src/state/auth/AuthBlocContext';
import {
  GoToAccountSettingsScreen,
  MainAppBloc,
} from '../../src/state/mainApp/mainAppBloc';
import { MainAppBlocProvider } from '../../src/state/mainApp/MainAppBlocContext';
import { installFakeServer, RecordedRequest } from '../helpers/fakeServer';

const backHandlers: (() => boolean | null | undefined)[] = [];
const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 36, left: 0, right: 0, bottom: 44 },
};
const user: User = {
  id: 3,
  email: 'umair@example.com',
  firstName: 'Umair',
  lastName: 'Khan',
  phoneNo: '5551234567',
  shouldSendEmails: false,
};
const userJson = {
  id: 3,
  email: 'umair@example.com',
  first_name: 'Umair',
  last_name: 'Khan',
  phone_no: '5551234567',
  should_send_emails: false,
};

let mainAdds: unknown[];
let requests: RecordedRequest[];

async function settle() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1000);
  });
}

async function pump(
  screenElement: React.ReactElement,
  routes: Parameters<typeof installFakeServer>[0] = {},
) {
  ({ requests } = installFakeServer({
    'GET /maintenance-mode/': { status: 200 },
    'GET /auth/users/me/': { status: 200, body: userJson },
    'PATCH /auth/users/me/': { status: 200 },
    ...routes,
  }));
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <PageBackHandler />
      <AuthBlocProvider bloc={{ add: jest.fn() } as unknown as AuthBloc}>
        <MainAppBlocProvider
          bloc={
            { add: (e: unknown) => mainAdds.push(e) } as unknown as MainAppBloc
          }
        >
          <PopScope canPop={false}>{screenElement}</PopScope>
        </MainAppBlocProvider>
      </AuthBlocProvider>
    </SafeAreaProvider>,
  );
}

const sent = (method: string) =>
  requests.filter(r => r.method === method && r.path === '/auth/users/me/');

beforeEach(() => {
  jest.useFakeTimers();
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
  jest
    .spyOn(AuthRequestManager.prototype, 'auth')
    .mockResolvedValue(Result.success());
  resetUserPersistorForTests();
  persistUser({ ...user });
  mainAdds = [];
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function leaveBothWays() {
  await fireEvent.press(
    screen.getByText(String.fromCodePoint(0xf00d), {
      includeHiddenElements: true,
    }),
  );
  await fireEvent.press(
    screen.getByText(String.fromCodePoint(0xf177), {
      includeHiddenElements: true,
    }),
  );
  await act(async () => {
    [...backHandlers].reverse().some(handler => handler());
  });
  expect(mainAdds.map(e => (e as object).constructor)).toEqual([
    GoToAccountSettingsScreen,
    GoToAccountSettingsScreen,
    GoToAccountSettingsScreen,
  ]);
}

describe('Edit Name', () => {
  test('starts from the names in hand and fetches nothing', async () => {
    await pump(<EditName user={user} />);
    expect(screen.getByText('Enter Your Name.')).toBeTruthy();
    expect(screen.getByText('Account Settings')).toBeTruthy();
    expect(screen.getByTestId('firstName').props.value).toBe('Umair');
    expect(screen.getByTestId('lastName').props.value).toBe('Khan');
    await settle();
    expect(requests.filter(r => r.path !== '/maintenance-mode/')).toEqual([]);
  });

  test('Submit goes back at once and sends both names without waiting (Q6)', async () => {
    await pump(<EditName user={user} />, {
      // A refused save is never shown.
      'PATCH /auth/users/me/': { status: 400 },
    });
    await fireEvent.changeText(screen.getByTestId('firstName'), '');
    await fireEvent.changeText(screen.getByTestId('lastName'), 'K & Co');
    await fireEvent.press(screen.getByLabelText('Submit'));
    // Dispatched before the request has even gone out.
    expect(mainAdds).toHaveLength(1);
    expect(mainAdds[0]).toBeInstanceOf(GoToAccountSettingsScreen);
    await settle();
    expect(sent('PATCH').map(r => r.body)).toEqual([
      'first_name=&last_name=K+%26+Co',
    ]);
  });

  test('X, ← and Back go back saving nothing', async () => {
    await pump(<EditName user={user} />);
    await leaveBothWays();
    await settle();
    expect(sent('PATCH')).toHaveLength(0);
  });
});

describe('Edit Phone', () => {
  test('fetches the user twice: once for the screen, once for the field', async () => {
    await pump(<EditPhone user={user} />);
    await settle();
    expect(sent('GET')).toHaveLength(2);
    expect(screen.getByText('Enter Your Phone Number.')).toBeTruthy();
    expect(screen.getByTestId('phone').props.value).toBe('5551234567');
  });

  test('a spinner while the user is on its way', async () => {
    const { fetchMock } = installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
    });
    const answer = fetchMock.getMockImplementation()!;
    // The screen's own fetch: answered only once the spinner has been seen.
    fetchMock.mockImplementation((url: string, init?: RequestInit) =>
      url.endsWith('/auth/users/me/')
        ? new Promise(() => {})
        : answer(url, init),
    );
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <AuthBlocProvider bloc={{ add: jest.fn() } as unknown as AuthBloc}>
          <MainAppBlocProvider
            bloc={{ add: jest.fn() } as unknown as MainAppBloc}
          >
            <EditPhone user={user} />
          </MainAppBlocProvider>
        </AuthBlocProvider>
      </SafeAreaProvider>,
    );
    await settle();
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.queryByText('Enter Your Phone Number.')).toBeNull();
  });

  test('Submit sends the number exactly as typed and goes back at once (Q6)', async () => {
    await pump(<EditPhone user={user} />);
    await settle();
    await fireEvent.changeText(screen.getByTestId('phone'), ' 555-0100 ');
    await fireEvent.press(screen.getByLabelText('Submit'));
    expect(mainAdds[0]).toBeInstanceOf(GoToAccountSettingsScreen);
    await settle();
    expect(sent('PATCH').map(r => r.body)).toEqual(['phone_no=+555-0100+']);
  });

  test('a failed fetch shows the friendly error, reporting 855df and c34bc', async () => {
    const report = jest.spyOn(reporter, 'reportError');
    await pump(<EditPhone user={user} />, {
      'GET /auth/users/me/': { status: 500 },
    });
    await settle();
    expect(
      screen.getByText('Something went wrong. Please try again.'),
    ).toBeTruthy();
    expect(screen.queryByText('Enter Your Phone Number.')).toBeNull();
    const codes = report.mock.calls.map(
      ([e]) => (e as { cause: string }).cause,
    );
    expect(codes).toContain('Error Code 855df:');
    expect(codes).toContain('Error Code c34bc:');
  });

  test('X, ← and Back go back saving nothing', async () => {
    await pump(<EditPhone user={user} />);
    await settle();
    await leaveBothWays();
  });
});
