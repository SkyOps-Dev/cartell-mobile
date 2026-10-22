// Account Settings (account_settings.dart; spec 11 §2, §2.1): the rows and where they lead, the
// Alexa line (quirk Q34), the three switches and their toasts, Delete Account (quirk Q2), and a
// user with no phone at all (quirk Q30).

import React from 'react';
import { BackHandler, View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorWidgetBoundary } from '../../src/components/ErrorWidget';
import { FontAwesomeIcons } from '../../src/components/icons/iconData';
import {
  PageBackHandler,
  PopScope,
} from '../../src/components/layout/PopScope';
import { popMenu, PopupMenuHost } from '../../src/components/popups/PopupMenu';
import { PopupHost, popPopup } from '../../src/components/popups/popups';
import {
  resetToastsForTests,
  ToastHost,
} from '../../src/components/popups/toasts';
import type { Profile } from '../../src/models/profile';
import type { User } from '../../src/models/user';
import { AccountSettings } from '../../src/screens/account/AccountSettings';
import {
  persistUser,
  resetUserPersistorForTests,
} from '../../src/services/data/userPersistor';
import { AuthRequestManager } from '../../src/services/requests/authRequests';
import { Result } from '../../src/services/result';
import { SecureStorage } from '../../src/services/secureStorage';
import {
  AuthBloc,
  GoToWelcomeScreenEvent,
} from '../../src/state/auth/authBloc';
import { AuthBlocProvider } from '../../src/state/auth/AuthBlocContext';
import {
  GoToAccountSettingsEditNameScreenEvent,
  GoToAccountSettingsEditPasswordScreenEvent,
  GoToAccountSettingsEditPhoneNumberScreenEvent,
  GoToHubsScreenEvent,
  MainAppBloc,
} from '../../src/state/mainApp/mainAppBloc';
import { MainAppBlocProvider } from '../../src/state/mainApp/MainAppBlocContext';
import { installFakeServer, RecordedRequest } from '../helpers/fakeServer';

const backHandlers: (() => boolean | null | undefined)[] = [];
jest
  .spyOn(BackHandler, 'addEventListener')
  .mockImplementation((_event, handler) => {
    backHandlers.push(handler as () => boolean);
    return {
      remove: () => {
        backHandlers.splice(backHandlers.indexOf(handler as () => boolean), 1);
      },
    };
  });
jest
  .spyOn(View.prototype as never, 'measureInWindow' as never)
  .mockImplementation(((cb: (...a: number[]) => void) =>
    cb(312, 40, 48, 48)) as never);

const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 36, left: 0, right: 0, bottom: 44 },
};

const baseUser: User = {
  id: 3,
  email: 'umair@example.com',
  firstName: 'Umair',
  lastName: 'Khan',
  phoneNo: '5551234567',
  shouldSendEmails: false,
};
const baseProfile: Profile = {
  user: 3,
  shouldSendNotification: true,
  locations: [],
  alexaEnabled: true,
};

let mainAdds: unknown[];
let authAdds: unknown[];
let requests: RecordedRequest[];

async function settle(ms = 1000) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

async function pump({
  user = baseUser,
  profile = baseProfile,
  routes = {},
}: {
  user?: User;
  profile?: Profile;
  routes?: Parameters<typeof installFakeServer>[0];
} = {}) {
  ({ requests } = installFakeServer({
    'GET /maintenance-mode/': { status: 200 },
    'GET /app/settings/': {
      status: 200,
      body: { id: 1, key: 'alexa_enabled', value: 'true' },
    },
    'PATCH /profiles/me/': { status: 200 },
    'PATCH /auth/users/me/': { status: 200 },
    'DELETE /auth/users/me/': { status: 204 },
    ...routes,
  }));
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <PageBackHandler />
      <AuthBlocProvider
        bloc={{ add: (e: unknown) => authAdds.push(e) } as unknown as AuthBloc}
      >
        <MainAppBlocProvider
          bloc={
            { add: (e: unknown) => mainAdds.push(e) } as unknown as MainAppBloc
          }
        >
          <ToastHost>
            <PopupHost>
              {/* The shell's PopScope: Back never leaves the page from here. */}
              <PopScope canPop={false}>
                <ErrorWidgetBoundary>
                  <AccountSettings user={user} profile={profile} />
                </ErrorWidgetBoundary>
              </PopScope>
              <PopupMenuHost />
            </PopupHost>
          </ToastHost>
        </MainAppBlocProvider>
      </AuthBlocProvider>
    </SafeAreaProvider>,
  );
  await settle();
}

const sent = (method: string, path: string) =>
  requests.filter(r => r.method === method && r.path === path);

beforeEach(() => {
  jest.useFakeTimers();
  jest
    .spyOn(AuthRequestManager.prototype, 'auth')
    .mockResolvedValue(Result.success());
  resetUserPersistorForTests();
  persistUser({ ...baseUser });
  mainAdds = [];
  authAdds = [];
});

afterEach(async () => {
  for (let i = 0; i < 3; i++) {
    await act(async () => {
      popPopup();
      popMenu();
    });
    await settle();
  }
  await act(async () => resetToastsForTests());
  await SecureStorage.deleteBiometricsEnabled();
  jest.useRealTimers();
});

/** A quick tap on the switch whose label is `label`. */
async function tapSwitch(label: string) {
  const labels = [
    'Unlock with Biometrics: ',
    'Receive Notifications: ',
    'Receive Email Notifications: ',
  ].filter(text => screen.queryByText(text) !== null);
  const index = labels.indexOf(label);
  const handlers = screen.getAllByRole('switch')[index].props as {
    onResponderGrant: (e: unknown) => void;
    onResponderRelease: (e: unknown) => void;
  };
  const touch = {
    touchActive: true,
    startPageX: 0,
    startPageY: 0,
    startTimeStamp: 1,
    currentPageX: 0,
    currentPageY: 0,
    currentTimeStamp: 1,
    previousPageX: 0,
    previousPageY: 0,
    previousTimeStamp: 1,
  };
  const event = {
    nativeEvent: { pageX: 0, pageY: 0, timestamp: 1 },
    touchHistory: {
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: 1,
      touchBank: [touch],
    },
  };
  await act(async () => {
    handlers.onResponderGrant(event);
    handlers.onResponderRelease(event);
  });
  await settle();
}

const switchState = (label: string) => {
  const labels = [
    'Unlock with Biometrics: ',
    'Receive Notifications: ',
    'Receive Email Notifications: ',
  ].filter(text => screen.queryByText(text) !== null);
  return screen.getAllByRole('switch')[labels.indexOf(label)].props
    .accessibilityState.checked;
};

describe('the rows', () => {
  test('name, email, "Change" and the formatted phone, under the amber title', async () => {
    await pump();
    expect(screen.getByText('Account Settings')).toBeTruthy();
    for (const text of [
      'Name',
      'Umair Khan',
      'Email',
      'umair@example.com',
      'Password',
      'Change',
      'Phone',
      '(555) 123-4567',
    ]) {
      expect(screen.getByText(text)).toBeTruthy();
    }
  });

  test.each([
    ['', 'Enter Phone Number'],
    ['N/A', 'N/A'],
    ['+1 555 123', '+1 555 123'],
  ])('a phone of %j shows %j', async (phoneNo, shown) => {
    await pump({ user: { ...baseUser, phoneNo } });
    expect(screen.getByText(shown)).toBeTruthy();
  });

  test('a user with no phone at all breaks the screen into the grey error box (Q30)', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await pump({ user: { ...baseUser, phoneNo: null } });
    expect(screen.getByTestId('error-widget')).toHaveStyle({
      backgroundColor: 'rgba(192, 192, 192, 0.941)',
    });
    expect(screen.queryByText('Account Settings')).toBeNull();
  });

  test.each([
    ['Umair Khan', GoToAccountSettingsEditNameScreenEvent],
    ['Change', GoToAccountSettingsEditPasswordScreenEvent],
    ['(555) 123-4567', GoToAccountSettingsEditPhoneNumberScreenEvent],
  ])('%s opens its edit form with the user', async (text, Event) => {
    await pump();
    await fireEvent.press(screen.getByText(text));
    expect(mainAdds).toHaveLength(1);
    expect(mainAdds[0]).toBeInstanceOf(Event);
    expect((mainAdds[0] as { user: User }).user).toEqual(baseUser);
  });

  test('the email row does nothing', async () => {
    await pump();
    await fireEvent.press(screen.getByText('umair@example.com'));
    expect(mainAdds).toHaveLength(0);
  });

  test('← and Back go to the Hubs screen', async () => {
    await pump();
    await fireEvent.press(
      screen.getByText(
        String.fromCodePoint(FontAwesomeIcons.arrowLeftLong.codePoint),
        { includeHiddenElements: true },
      ),
    );
    await act(async () => {
      [...backHandlers].reverse().some(handler => handler());
    });
    expect(mainAdds.map(e => (e as object).constructor)).toEqual([
      GoToHubsScreenEvent,
      GoToHubsScreenEvent,
    ]);
  });
});

describe('Connected Services', () => {
  test('shows with the Amazon logo when the setting is on and Alexa is linked', async () => {
    await pump();
    expect(screen.getByText('Connected Services: ')).toBeTruthy();
    expect(
      screen.getByText(
        String.fromCodePoint(FontAwesomeIcons.amazon.codePoint),
        {
          includeHiddenElements: true,
        },
      ),
    ).toHaveStyle({ fontFamily: 'FontAwesome7Brands-Regular' });
  });

  test('without Alexa linked, only the words', async () => {
    await pump({ profile: { ...baseProfile, alexaEnabled: false } });
    expect(screen.getByText('Connected Services: ')).toBeTruthy();
    expect(
      screen.queryByText(
        String.fromCodePoint(FontAwesomeIcons.amazon.codePoint),
        { includeHiddenElements: true },
      ),
    ).toBeNull();
  });

  test.each([
    [
      'off',
      { status: 200, body: { id: 1, key: 'alexa_enabled', value: 'false' } },
    ],
    ['missing', { status: 404, body: { error: 'Setting not found' } }],
  ])('hidden when the setting is %s', async (_name, reply) => {
    await pump({ routes: { 'GET /app/settings/': reply } });
    expect(screen.queryByText('Connected Services: ')).toBeNull();
  });

  test('is fetched on every build: twice on opening (Q34)', async () => {
    await pump();
    expect(sent('GET', '/app/settings/')).toHaveLength(2);
  });
});

describe('Receive Notifications', () => {
  test('flipping it sends the new value and toasts it', async () => {
    await pump();
    expect(switchState('Receive Notifications: ')).toBe(true);
    await tapSwitch('Receive Notifications: ');
    expect(sent('PATCH', '/profiles/me/').map(r => r.body)).toEqual([
      'should_send_notification=false',
    ]);
    expect(switchState('Receive Notifications: ')).toBe(false);
    expect(screen.getByText('Notifications turned off.')).toBeTruthy();
  });

  test('a refused save flips it back and names the error type', async () => {
    await pump({ routes: { 'PATCH /profiles/me/': { status: 500 } } });
    await tapSwitch('Receive Notifications: ');
    expect(switchState('Receive Notifications: ')).toBe(true);
    expect(
      screen.getByText(
        'Error encountered of type: UnableToUpdateUserInformationException. Notifications are still on. Please try again soon.',
      ),
    ).toBeTruthy();
  });

  test('no answer at all names ClientException, as package:http does', async () => {
    await pump({
      routes: {
        'PATCH /profiles/me/': () => {
          throw new TypeError('Network request failed');
        },
      },
    });
    await tapSwitch('Receive Notifications: ');
    expect(
      screen.getByText(
        'Error encountered of type: ClientException. Notifications are still on. Please try again soon.',
      ),
    ).toBeTruthy();
  });
});

test('Receive Email Notifications sends should_send_emails and toasts it', async () => {
  await pump();
  expect(switchState('Receive Email Notifications: ')).toBe(false);
  await tapSwitch('Receive Email Notifications: ');
  expect(sent('PATCH', '/auth/users/me/').map(r => r.body)).toEqual([
    'should_send_emails=true',
  ]);
  expect(screen.getByText('Email notifications turned on.')).toBeTruthy();
});

describe('Unlock with Biometrics', () => {
  test('hidden on a phone with no biometrics and the preference never set', async () => {
    await pump();
    expect(screen.queryByText('Unlock with Biometrics: ')).toBeNull();
  });

  test('shown while the preference is on; turning it off saves it on the phone only', async () => {
    await SecureStorage.setBiometricsEnabled(true);
    await pump();
    expect(screen.getByText('Unlock with Biometrics: ')).toBeTruthy();
    expect(switchState('Unlock with Biometrics: ')).toBe(true);
    await tapSwitch('Unlock with Biometrics: ');
    expect(await SecureStorage.getBiometricsEnabled()).toBe(false);
    expect(screen.getByText('Biometric unlock turned off.')).toBeTruthy();
    expect(
      requests.filter(
        r => r.path !== '/maintenance-mode/' && r.method !== 'GET',
      ),
    ).toHaveLength(0);
  });
});

describe('Delete Account', () => {
  const layout = (width: number, height: number) => ({
    nativeEvent: { layout: { x: 0, y: 0, width, height } },
  });
  async function openDeletePopup() {
    await fireEvent.press(screen.getByLabelText('Show menu'));
    await fireEvent(
      screen.getByTestId('popup-menu-measure', { includeHiddenElements: true }),
      'layout',
      layout(160, 56),
    );
    await fireEvent(
      screen.getByTestId('popup-menu-content'),
      'layout',
      layout(196, 72),
    );
    await settle();
    await fireEvent.press(screen.getByText('Delete Account'));
    await settle();
  }

  test('asks for the password; Delete sends it, signs out whatever the answer, and says it is removed (Q2)', async () => {
    await SecureStorage.setRefreshToken('R');
    await pump({ routes: { 'DELETE /auth/users/me/': { status: 400 } } });
    await openDeletePopup();
    expect(
      screen.getByText(
        'You are about to delete your account. Possible data loss can occur. If you are sure that you want to delete your account, please enter your password.',
      ),
    ).toBeTruthy();
    await fireEvent.changeText(
      screen.getByTestId('delete-account-password'),
      'wrong password',
    );
    await fireEvent.press(screen.getByText('Delete'));
    await settle();
    expect(sent('DELETE', '/auth/users/me/').map(r => r.body)).toEqual([
      'current_password=wrong+password',
    ]);
    expect(await SecureStorage.getRefreshToken()).toBeNull();
    expect(screen.getByText('Account Successfully Removed')).toBeTruthy();
    expect(screen.getByText('Your account has been removed.')).toBeTruthy();

    await fireEvent.press(screen.getByText('Okay'));
    await settle();
    expect(authAdds).toHaveLength(1);
    expect(authAdds[0]).toBeInstanceOf(GoToWelcomeScreenEvent);
    expect(screen.queryByText('Account Successfully Removed')).toBeNull();
    expect(screen.queryByText('Delete')).toBeNull();
  });

  test('no network: the first popup just stays open', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await pump({
      routes: {
        'DELETE /auth/users/me/': () => {
          throw new TypeError('Network request failed');
        },
      },
    });
    await openDeletePopup();
    await fireEvent.press(screen.getByText('Delete'));
    await settle();
    expect(screen.getByText('Delete')).toBeTruthy();
    expect(screen.queryByText('Account Successfully Removed')).toBeNull();
    expect(authAdds).toHaveLength(0);
  });

  test('Cancel closes it, and the field keeps its text for next time', async () => {
    await pump();
    await openDeletePopup();
    await fireEvent.changeText(
      screen.getByTestId('delete-account-password'),
      'typed once',
    );
    await fireEvent.press(screen.getByText('Cancel'));
    await settle();
    expect(screen.queryByText('Delete')).toBeNull();
    await openDeletePopup();
    expect(screen.getByTestId('delete-account-password').props.value).toBe(
      'typed once',
    );
  });
});
