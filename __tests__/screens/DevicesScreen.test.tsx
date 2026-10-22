// The Hubs screen (devices_screen.dart; spec 10 §2) as this part builds it: always the empty card,
// the + button and the ⋮ menu that do nothing yet, and Android Back asking "Leave App". Back is
// pressed the way React Native delivers it: the newest listener first, until one handles it.

import React from 'react';
import { BackHandler, View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PageBackHandler } from '../../src/components/layout/PopScope';
import { popMenu, PopupMenuHost } from '../../src/components/popups/PopupMenu';
import { PopupHost, popPopup } from '../../src/components/popups/popups';
import { DevicesScreen } from '../../src/screens/devices/DevicesScreen';
import {
  persistUser,
  resetUserPersistorForTests,
} from '../../src/services/data/userPersistor';
import { AuthBloc } from '../../src/state/auth/authBloc';
import { AuthBlocProvider } from '../../src/state/auth/AuthBlocContext';
import type { MainAppBloc } from '../../src/state/mainApp/mainAppBloc';
import { MainAppBlocProvider } from '../../src/state/mainApp/MainAppBlocContext';

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
const exitApp = jest.spyOn(BackHandler, 'exitApp').mockImplementation(() => {});
// The ⋮ button's box on a 360-wide phone: the last 48 of the toolbar, below a 36 dp status bar.
jest
  .spyOn(View.prototype as never, 'measureInWindow' as never)
  .mockImplementation(((cb: (...a: number[]) => void) =>
    cb(312, 40, 48, 48)) as never);

/** Android Back: newest listener first; nothing handling it means the system takes it. */
async function pressBack(): Promise<boolean> {
  let handled = false;
  await act(async () => {
    for (const handler of [...backHandlers].reverse()) {
      if (handler()) {
        handled = true;
        return;
      }
    }
  });
  return handled;
}

const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 36, left: 0, right: 0, bottom: 44 },
};

async function settle() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1000);
  });
}

beforeEach(async () => {
  jest.useFakeTimers();
  resetUserPersistorForTests();
  persistUser({
    id: 1,
    email: 'a@b.com',
    firstName: 'A',
    lastName: 'B',
    phoneNo: null,
    shouldSendEmails: false,
  });
  exitApp.mockClear();
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <PageBackHandler />
      <AuthBlocProvider bloc={{ add: jest.fn() } as unknown as AuthBloc}>
        <MainAppBlocProvider
          bloc={{ add: jest.fn() } as unknown as MainAppBloc}
        >
          <PopupHost>
            <DevicesScreen devices={[]} />
            <PopupMenuHost />
          </PopupHost>
        </MainAppBlocProvider>
      </AuthBlocProvider>
    </SafeAreaProvider>,
  );
});

afterEach(async () => {
  // Popups and menus live in module-level stores: close what a test left open (the Leave test
  // leaves its popup open on purpose) so the next test starts clean.
  for (let i = 0; i < 3; i++) {
    await act(async () => {
      popPopup();
      popMenu();
    });
    await settle();
  }
  jest.useRealTimers();
});

test('shows the title block and the empty card', () => {
  expect(screen.getByText('Hubs')).toBeTruthy();
  expect(screen.getByText('View existing HUBs or add a HUB')).toBeTruthy();
  expect(screen.getByText('No Hubs have been added.')).toBeTruthy();
  expect(
    screen.getByText('Press the plus button below to get started.'),
  ).toBeTruthy();
});

test('Back asks "Leave App" and does not leave the page', async () => {
  expect(await pressBack()).toBe(true);
  expect(screen.getByText('Leave App')).toBeTruthy();
  expect(
    screen.getByText('Are you sure you want to leave this app?'),
  ).toBeTruthy();
  expect(screen.getByText('Nevermind')).toBeTruthy();
  expect(exitApp).not.toHaveBeenCalled();
});

test('Nevermind closes the popup and stays', async () => {
  await pressBack();
  await fireEvent.press(screen.getByText('Nevermind'));
  await settle();
  expect(screen.queryByText('Leave App')).toBeNull();
  expect(exitApp).not.toHaveBeenCalled();
});

test('Leave sends the app to the background and leaves the popup open (Q51)', async () => {
  await pressBack();
  await fireEvent.press(screen.getByText('Leave'));
  await settle();
  expect(exitApp).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Leave App')).toBeTruthy();
});

test('Back with the popup open closes the popup', async () => {
  await pressBack();
  await pressBack();
  await settle();
  expect(screen.queryAllByText('Leave App')).toHaveLength(0);
});

test('Back with the drawer open asks "Leave App" and leaves the drawer open', async () => {
  await fireEvent.press(screen.getByLabelText('Open navigation menu'));
  await settle();
  expect(screen.getByText('Account Settings')).toBeTruthy();
  await pressBack();
  expect(screen.getByText('Leave App')).toBeTruthy();
  expect(screen.getByText('Account Settings')).toBeTruthy();
});

test('the + button does nothing yet', async () => {
  // Icons are hidden from screen readers, as Flutter's are without a semantic label.
  await fireEvent.press(screen.getByText('+', { includeHiddenElements: true }));
  await settle();
  expect(screen.getByText('No Hubs have been added.')).toBeTruthy();
});

describe('the ⋮ menu', () => {
  const layout = (width: number, height: number) => ({
    nativeEvent: { layout: { x: 0, y: 0, width, height } },
  });
  const openMenu = async () => {
    await fireEvent.press(screen.getByLabelText('Show menu'));
    // The menu measures its widest item, then lays out at the stepped width (Jest has no layout).
    await fireEvent(
      screen.getByTestId('popup-menu-measure', { includeHiddenElements: true }),
      'layout',
      layout(119, 56),
    );
    await fireEvent(
      screen.getByTestId('popup-menu-content'),
      'layout',
      layout(168, 72),
    );
    await settle();
  };

  test('opens with "Add Hub"; tapping it closes the menu and nothing else', async () => {
    await openMenu();
    expect(screen.getByText('Add Hub')).toBeTruthy();
    await fireEvent.press(screen.getByText('Add Hub'));
    await settle();
    expect(screen.queryByText('Add Hub')).toBeNull();
    expect(screen.getByText('No Hubs have been added.')).toBeTruthy();
  });

  test('Back closes the menu, not the page', async () => {
    await openMenu();
    await pressBack();
    await settle();
    expect(screen.queryByText('Add Hub')).toBeNull();
    expect(screen.queryByText('Leave App')).toBeNull();
  });
});
