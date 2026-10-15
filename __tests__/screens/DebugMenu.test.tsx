// The Debug Info panel (debug_menu.dart) and the Welcome screen's button that opens it.

import React from 'react';
import { NativeModules, StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Keychain from 'react-native-keychain';

import {
  CupertinoModalPopupHost,
  popModalPopup,
} from '../../src/components/popups/CupertinoModalPopup';
import { PopupHost } from '../../src/components/popups/popups';
import {
  config,
  getEnvironmentName,
  setEnvironmentName,
} from '../../src/config/environment';
import { DebugMenu } from '../../src/screens/misc/DebugMenu';
import { WelcomeScreen } from '../../src/screens/welcome/WelcomeScreen';
import { reportError } from '../../src/services/reportError';

jest.mock('../../src/services/reportError', () => ({ reportError: jest.fn() }));
jest.mock('../../src/state/auth/AuthBlocContext', () => ({
  useAuthBloc: () => ({ add: jest.fn() }),
}));

const store = (
  Keychain as unknown as { __store: Map<string, { password: string }> }
).__store;

const original = {
  baseDomain: config.baseDomain,
  shouldUseTLS: config.shouldUseTLS,
  environmentName: getEnvironmentName(),
};

beforeAll(() => jest.useFakeTimers());
afterAll(() => jest.useRealTimers());
afterEach(async () => {
  config.baseDomain = original.baseDomain;
  config.shouldUseTLS = original.shouldUseTLS;
  setEnvironmentName(original.environmentName);
  store.clear();
  jest.clearAllMocks();
  await act(async () => {
    popModalPopup();
    jest.advanceTimersByTime(1000);
  });
});

const mount = () =>
  render(<DebugMenu screenHeight={2400} version="1.12.5" buildNumber="193" />);

describe('DebugMenu — info view', () => {
  test('shows the version, build number and environment name', async () => {
    await mount();
    expect(screen.getByText('Version: 1.12.5')).toBeTruthy();
    expect(screen.getByText('Build Number: 193')).toBeTruthy();
    expect(screen.getByText('Environment Name: TEST')).toBeTruthy();
  });

  test('is 30% of the screen height in physical pixels tall', async () => {
    await mount();
    const panel = StyleSheet.flatten(
      screen.getByTestId('debug-menu').props.style,
    );
    expect(panel.height).toBe(720);
  });

  test('a debug build on a test server shows every button', async () => {
    // Jest runs as a debug build (__DEV__) on the TEST environment (isTestBuild).
    await mount();
    [
      'Test Connection',
      'Verify Sentry Setup',
      'Reset Show Feedback',
      'Change Environment',
      'Close',
    ].forEach(title => expect(screen.getByText(title)).toBeTruthy());
  });

  test('Reset Show Feedback stores the feedback flag as "true" for this environment', async () => {
    await mount();
    await fireEvent.press(screen.getByText('Reset Show Feedback'));
    await act(async () => {});
    expect(store.get('TEST_feedbackToken')?.password).toBe('true');
  });

  test('Verify Sentry Setup reports the test exception and shows nothing', async () => {
    await mount();
    await fireEvent.press(screen.getByText('Verify Sentry Setup'));
    expect(reportError).toHaveBeenCalledWith(
      new Error('This is a test exception'),
    );
    expect(screen.getByText('Version: 1.12.5')).toBeTruthy();
  });

  test('Test Connection opens the popup with the four checks', async () => {
    (global as unknown as { fetch: unknown }).fetch = jest.fn(
      () => new Promise(() => {}),
    );
    await render(
      <PopupHost>
        <DebugMenu screenHeight={2400} version="1.12.5" buildNumber="193" />
      </PopupHost>,
    );
    await fireEvent.press(screen.getByText('Test Connection'));
    expect(screen.getByText('Internet Access')).toBeTruthy();
    expect(screen.getByText('Can Post to Server')).toBeTruthy();
    expect(screen.getByText('Okay')).toBeTruthy();
  });
});

describe('DebugMenu — Switch Environment', () => {
  async function openSwitch() {
    await mount();
    await fireEvent.press(screen.getByText('Change Environment'));
  }

  test('lists the three servers, the current one checked', async () => {
    await openSwitch();
    expect(screen.getByText('Switch Environment')).toBeTruthy();
    expect(
      screen.getByText(
        'Warning: When using Beta or Production environments, pairing new hubs to the server will not work.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('beta.cartellap.com')).toBeTruthy();
    expect(screen.getByText('cartellap.com')).toBeTruthy();
    expect(screen.getByRole('radio', { checked: true })).toBe(
      screen.getAllByRole('radio')[1],
    );
  });

  test('choosing one switches the server and returns to the info view', async () => {
    await openSwitch();
    await fireEvent.press(screen.getByText('Beta'));
    expect(config.baseDomain).toBe('beta.cartellap.com');
    expect(config.shouldUseTLS).toBe(true);
    expect(getEnvironmentName()).toBe('BETA');
    expect(screen.getByText('Environment Name: BETA')).toBeTruthy();
  });

  test('switching to Production still shows Change Environment (decided at startup, Q9)', async () => {
    await openSwitch();
    await fireEvent.press(screen.getByText('Production'));
    expect(getEnvironmentName()).toBe('LIVE');
    expect(screen.getByText('Change Environment')).toBeTruthy();
  });

  test('Back returns without switching', async () => {
    await openSwitch();
    await fireEvent.press(screen.getByText('Back'));
    expect(getEnvironmentName()).toBe('TEST');
    expect(screen.getByText('Version: 1.12.5')).toBeTruthy();
  });
});

describe('WelcomeScreen — Open Debug Info', () => {
  async function mountWelcome() {
    await render(
      <>
        <WelcomeScreen />
        <CupertinoModalPopupHost />
      </>,
    );
  }

  test('opens the panel with the installed version and build number', async () => {
    NativeModules.CartellPackageInfo = {
      fromPlatform: jest.fn(async () => ({
        version: '1.12.5',
        buildNumber: '193',
      })),
    };
    await mountWelcome();
    await act(async () => {});
    await fireEvent.press(screen.getByText('Open Debug Info'));
    expect(screen.getByText('Version: 1.12.5')).toBeTruthy();
    expect(screen.getByText('Build Number: 193')).toBeTruthy();
    await fireEvent.press(screen.getByText('Close'));
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.queryByTestId('debug-menu')).toBeNull();
  });

  test('a tap before the version has been read reports the null check and opens nothing', async () => {
    NativeModules.CartellPackageInfo = {
      fromPlatform: jest.fn(() => new Promise(() => {})),
    };
    await mountWelcome();
    await fireEvent.press(screen.getByText('Open Debug Info'));
    expect(reportError).toHaveBeenCalledWith(
      new TypeError('Null check operator used on a null value'),
    );
    expect(screen.queryByTestId('debug-menu')).toBeNull();
  });
});
