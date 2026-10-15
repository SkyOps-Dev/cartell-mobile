// Ported from frontend/test/components/navbar_drawer_dismissal_test.dart (#604: tapping the entry
// for the screen already showing left the drawer open; the fix closes it with closeDrawer, never a
// Navigator pop, because the same NavBar is an inline rail above 800 dp) and from
// navbar_wiring_test.dart (every entry closes the drawer before it dispatches). Plus the header
// (spec 10 §1).

import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppScaffold } from '../../src/components/layout/AppScaffold';
import { NavBar } from '../../src/components/NavBar';
import {
  persistUser,
  resetUserPersistorForTests,
} from '../../src/services/data/userPersistor';
import { AttemptLogOutEvent, AuthBloc } from '../../src/state/auth/authBloc';
import { AuthBlocProvider } from '../../src/state/auth/AuthBlocContext';

let mockWindow = { width: 400, height: 1200, scale: 1, fontScale: 1 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockWindow,
}));

const metrics = {
  frame: { x: 0, y: 0, width: 400, height: 1200 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const user = {
  id: 1,
  email: 'test@cartell.local',
  firstName: 'Test',
  lastName: 'User',
  phoneNo: null,
  shouldSendEmails: false,
};

let authAdds: unknown[];

beforeEach(() => {
  jest.useFakeTimers();
  mockWindow = { width: 400, height: 1200, scale: 1, fontScale: 1 };
  resetUserPersistorForTests();
  persistUser({ ...user });
  authAdds = [];
});

afterEach(() => {
  jest.useRealTimers();
});

async function pumpAppScaffold({ showNavigation = true } = {}) {
  const authBloc = {
    add: (event: unknown) => authAdds.push(event),
  } as unknown as AuthBloc;
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <AuthBlocProvider bloc={authBloc}>
        <AppScaffold
          showNavigation={showNavigation}
          body={<Text>hubs screen</Text>}
        />
      </AuthBlocProvider>
    </SafeAreaProvider>,
  );
}

async function settle() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1000);
  });
}

async function openDrawer() {
  await fireEvent.press(screen.getByLabelText('Open navigation menu'));
  await settle();
}

describe('the NavBar as a drawer, at or below LARGE_SCREEN_SIZE', () => {
  test('there is a hamburger and no menu until it is opened', async () => {
    await pumpAppScaffold();
    expect(screen.getByLabelText('Open navigation menu')).toBeTruthy();
    expect(screen.queryByText('HUBs')).toBeNull();
    await openDrawer();
    expect(screen.getByText('HUBs')).toBeTruthy();
  });

  test('tapping an entry closes the drawer, even for the screen already showing', async () => {
    await pumpAppScaffold();
    await openDrawer();
    await fireEvent.press(screen.getByText('HUBs'));
    await settle();
    expect(screen.queryByText('HUBs')).toBeNull();
    expect(screen.getByText('hubs screen')).toBeTruthy();
  });

  test.each(['Account Settings', 'Event History', 'Help'])(
    '%s closes the drawer (its screen comes in a later part)',
    async title => {
      await pumpAppScaffold();
      await openDrawer();
      await fireEvent.press(screen.getByText(title));
      await settle();
      expect(screen.queryByText(title)).toBeNull();
      expect(authAdds).toHaveLength(0);
    },
  );

  test('Log Out closes the drawer and runs the real log-out', async () => {
    await pumpAppScaffold();
    await openDrawer();
    await fireEvent.press(screen.getByText('Log Out'));
    // The drawer is already on its way out when the event is added.
    expect(authAdds).toHaveLength(1);
    expect(authAdds[0]).toBeInstanceOf(AttemptLogOutEvent);
    expect((authAdds[0] as AttemptLogOutEvent).shouldLogOut).toBe(false);
    await settle();
    expect(screen.queryByText('Log Out')).toBeNull();
  });

  test('a tap on the scrim closes it', async () => {
    await pumpAppScaffold();
    await openDrawer();
    const scrim = screen.getByLabelText('Dismiss');
    await act(async () => {
      scrim.props.onResponderRelease();
    });
    await settle();
    expect(screen.queryByText('HUBs')).toBeNull();
  });

  test('the header shows the first user: name and email', async () => {
    persistUser({ ...user, id: 2, firstName: 'Other', email: 'o@x.com' });
    await pumpAppScaffold();
    await openDrawer();
    expect(screen.getByText('Test User')).toBeTruthy();
    expect(screen.getByText('test@cartell.local')).toBeTruthy();
  });

  test('at very large text the email is left out', async () => {
    mockWindow = { ...mockWindow, fontScale: 1.5 };
    await pumpAppScaffold();
    await openDrawer();
    expect(screen.getByText('Test User')).toBeTruthy();
    expect(screen.queryByText('test@cartell.local')).toBeNull();
  });
});

describe('AppScaffold decides whether there is a drawer at all', () => {
  test('at exactly 800 the NavBar is the drawer', async () => {
    mockWindow = { ...mockWindow, width: 800 };
    await pumpAppScaffold();
    expect(screen.getByLabelText('Open navigation menu')).toBeTruthy();
    expect(screen.queryByText('HUBs')).toBeNull();
  });

  test('above 800 it is an inline rail, with no hamburger, and an entry pops nothing', async () => {
    mockWindow = { ...mockWindow, width: 900 };
    await pumpAppScaffold();
    expect(screen.queryByLabelText('Open navigation menu')).toBeNull();
    expect(screen.getByText('HUBs')).toBeTruthy();
    await fireEvent.press(screen.getByText('HUBs'));
    await settle();
    // closeDrawer is a no-op with no drawer: the page and the rail stay.
    expect(screen.getByText('hubs screen')).toBeTruthy();
    expect(screen.getByText('HUBs')).toBeTruthy();
  });

  test('showNavigation false removes the drawer at any width', async () => {
    await pumpAppScaffold({ showNavigation: false });
    expect(screen.queryByLabelText('Open navigation menu')).toBeNull();
    expect(screen.queryByText('HUBs')).toBeNull();
  });
});

test('with no user held, building the menu throws NoUserObjectFound', async () => {
  resetUserPersistorForTests();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await expect(
    render(
      <SafeAreaProvider initialMetrics={metrics}>
        <AuthBlocProvider bloc={{} as AuthBloc}>
          <NavBar />
        </AuthBlocProvider>
      </SafeAreaProvider>,
    ),
  ).rejects.toThrow("The user doesn't seem to be set in the userPersistor()");
});

test('a user with an empty email gets the fallback message instead of the menu', async () => {
  resetUserPersistorForTests();
  persistUser({ ...user, email: '' });
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <AuthBlocProvider bloc={{} as AuthBloc}>
        <NavBar />
      </AuthBlocProvider>
    </SafeAreaProvider>,
  );
  expect(
    screen.getByText(
      'Unable to get current user. Please restart the app and try again.',
    ),
  ).toBeTruthy();
  expect(screen.queryByText('HUBs')).toBeNull();
});
