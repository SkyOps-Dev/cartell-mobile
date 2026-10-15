// Ported from frontend/test/screens/bloc_widgets/auth_bloc_widget_wiring_test.dart (updateMode and
// the maintenance arm). The Flutter tests read the Dart source; these send server modes through
// ModeWatcherHelper and check which event and screen come out.

import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthRouter, eventForMode } from '../../src/screens/AuthRouter';
import {
  AutoLoginEvent,
  MaintenanceModeEvent,
} from '../../src/state/auth/authBloc';
import { ModeDebouncer } from '../../src/utilities/modeDebouncer';
import { Mode, ModeWatcherHelper } from '../../src/utilities/modeWatcher';
import { flush } from '../helpers/fakeServer';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const UNREACHABLE =
  "We can't reach Cartell right now.\nCheck your internet connection and try again.";
const MAINTENANCE =
  'The server is currently undergoing an update. Please check back later.';

describe('updateMode maps each Mode to the right event', () => {
  test('UNREACHABLE adds MaintenanceModeEvent(isUnreachable: true)', () => {
    const event = eventForMode(new ModeDebouncer(), Mode.UNREACHABLE);
    expect(event).toBeInstanceOf(MaintenanceModeEvent);
    expect((event as MaintenanceModeEvent).isUnreachable).toBe(true);
  });

  test('MAINTENANCE_MODE adds MaintenanceModeEvent(isUnreachable: false)', () => {
    const event = eventForMode(new ModeDebouncer(), Mode.MAINTENANCE_MODE);
    expect(event).toBeInstanceOf(MaintenanceModeEvent);
    expect((event as MaintenanceModeEvent).isUnreachable).toBe(false);
  });

  test('NORMAL after an outage adds AutoLoginEvent', () => {
    const debouncer = new ModeDebouncer();
    eventForMode(debouncer, Mode.UNREACHABLE);
    expect(eventForMode(debouncer, Mode.NORMAL)).toBeInstanceOf(AutoLoginEvent);
  });

  test('goes through the debouncer: a held reading adds nothing', () => {
    const debouncer = new ModeDebouncer();
    expect(eventForMode(debouncer, Mode.NORMAL)).toBeNull();
    eventForMode(debouncer, Mode.UNREACHABLE);
    expect(eventForMode(debouncer, Mode.MAINTENANCE_MODE)).toBeNull();
  });
});

describe('AuthRouter shows the maintenance screen with the right flag', () => {
  const mount = async () => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <AuthRouter />
      </SafeAreaProvider>,
    );
    await act(flush);
  };
  const report = (mode: Mode) =>
    act(async () => {
      ModeWatcherHelper.notifyListeners(mode);
      await flush();
    });

  test('unreachable copy, maintenance after two agreeing probes, then sign-in again', async () => {
    await mount();
    await report(Mode.UNREACHABLE);
    expect(screen.getByText(UNREACHABLE)).toBeTruthy();

    await report(Mode.MAINTENANCE_MODE);
    expect(screen.queryByText(MAINTENANCE)).toBeNull();
    await report(Mode.MAINTENANCE_MODE);
    expect(screen.getByText(MAINTENANCE)).toBeTruthy();

    // Back to NORMAL: auto-login runs (no session is stored, so it lands on Welcome).
    await report(Mode.NORMAL);
    await act(flush);
    expect(screen.getAllByText('Log In').length).toBeGreaterThan(0);
  });

  test('stops listening when it goes away', async () => {
    const remove = jest.spyOn(ModeWatcherHelper, 'removeEventListener');
    await mount();
    await act(async () => screen.unmount());
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
