// The two firmware screens (spec 14 §2, §4). Ports
// frontend/test/screens/devices/firmware_update/available_firmware_updates_screen_test.dart and
// frontend/test/screens/devices/firmware_update/update_device_screen_test.dart (every test that
// does not measure Flutter's own layout), plus the confirm popup, Back, the polled states, the
// ring's percentage, the error dialog and its barrier.

import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';

import { parseDevice } from '../../../src/models/device';
import { Firmware, FirmwareUpdate } from '../../../src/models/firmware';
import { FirmwareUpdates } from '../../../src/screens/devices/firmwareUpdate/FirmwareUpdates';
import { UpdateDeviceScreen } from '../../../src/screens/devices/firmwareUpdate/UpdateDeviceScreen';
import {
  FirmwareUpdateRejectedException,
  UpdateTokenFailedException,
} from '../../../src/services/exceptions';
import {
  GoToDeviceFirmwareUpdatesEvent,
  GoToSpecificDeviceEvent,
  GoToUpdateDeviceFirmwareScreen,
} from '../../../src/state/devices/devicesBloc';
import { parseDartDateTime } from '../../../src/utilities/dartDateTime';
import {
  advance,
  devicesBloc,
  freshHub,
  installSensorScreenHooks,
  onlyEvent,
  pressBack,
  show,
} from '../../helpers/sensorScreens';

installSensorScreenHooks();

const device = ({
  connected = true,
  esp = 1025 as number | null,
  rfm = 5013 as number | null,
  name = 'testerson 2',
} = {}) =>
  parseDevice(
    freshHub({
      name,
      device: {
        is_connected: connected,
        esp32_app_version: esp,
        rfm6601_app_version: rfm,
      },
    }),
  );

const fw = ({ id = 7, processor = 'ESP32', version = 1026 } = {}) =>
  new Firmware(id, version, null, null, null, processor);

const fwUpdate = ({
  id = 1,
  status = 'RUNNING',
  fileCursor = 10 as number | null,
  fileSize = 100 as number | null,
  firmware = fw() as Firmware | null,
  startedSecondsAgo = 30,
} = {}) =>
  new FirmwareUpdate(
    id,
    fileSize,
    fileCursor,
    status,
    null,
    parseDartDateTime(
      new Date(Date.now() - startedSecondsAgo * 1000).toISOString(),
    ),
    null,
    firmware,
  );

const firmwareScreen = (
  props: Partial<React.ComponentProps<typeof FirmwareUpdates>> = {},
) => (
  <FirmwareUpdates
    device={device()}
    espUpdate={null}
    rfmUpdate={null}
    currentUpdate={null}
    {...props}
  />
);

describe('FirmwareUpdates', () => {
  test('renders the current firmware and "up to date"', async () => {
    await show(firmwareScreen());
    expect(screen.getByText('Current firmware')).toBeTruthy();
    expect(screen.getByText('Controller')).toBeTruthy();
    expect(screen.getByText('v1025')).toBeTruthy();
    expect(screen.getByText('Transmitter')).toBeTruthy();
    expect(screen.getByText('v5013')).toBeTruthy();
    expect(screen.getByText('HUB connected')).toBeTruthy();
    expect(screen.getByText('Firmware is up to date')).toBeTruthy();
    expect(
      screen.getByText('Both components are running the latest versions.'),
    ).toBeTruthy();
  });

  test('a long hub name stays bounded', async () => {
    await show(firmwareScreen({ device: device({ name: 'a'.repeat(32) }) }));
    const title = screen.getByText('a'.repeat(32));
    expect(title.props.numberOfLines).toBe(2);
    expect(title.props.ellipsizeMode).toBe('tail');
  });

  test('an available update offers an enabled action', async () => {
    await show(firmwareScreen({ espUpdate: fw() }));
    expect(screen.getByText('1 update available')).toBeTruthy();
    expect(screen.getByText('Controller firmware')).toBeTruthy();
    expect(screen.getByText('v1025 → v1026')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Update now' }).props
        .accessibilityState?.disabled,
    ).toBeFalsy();
  });

  test('two offers: Controller first, then Transmitter', async () => {
    await show(
      firmwareScreen({
        espUpdate: fw(),
        rfmUpdate: fw({ id: 8, processor: 'RFM6601', version: 5014 }),
      }),
    );
    expect(screen.getByText('2 updates available')).toBeTruthy();
    const titles = screen
      .getAllByText(/^(Controller|Transmitter) firmware$/)
      .map(t => t.props.children as string);
    expect(titles).toEqual(['Controller firmware', 'Transmitter firmware']);
    expect(screen.getByText('v5013 → v5014')).toBeTruthy();
    expect(screen.getAllByText('Update now')).toHaveLength(2);
  });

  test('an offline hub cannot start an update', async () => {
    await show(
      firmwareScreen({ device: device({ connected: false }), espUpdate: fw() }),
    );
    expect(screen.getByText('Reconnect the hub before updating.')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Update now' }).props
        .accessibilityState?.disabled,
    ).toBe(true);
  });

  test('an offline hub says the versions are last-known', async () => {
    await show(firmwareScreen({ device: device({ connected: false }) }));
    expect(
      screen.getByText('HUB offline — versions shown are the last we heard'),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Both components were on the latest versions when the hub last checked in.',
      ),
    ).toBeTruthy();
  });

  test('a version the hub never reported is named, not "vnull"', async () => {
    await show(firmwareScreen({ device: device({ esp: null }) }));
    expect(screen.getByText('Not reported')).toBeTruthy();
    expect(screen.queryByText(/vnull/)).toBeNull();
  });

  test('an offer for an unreported version reads "v?"', async () => {
    await show(
      firmwareScreen({ device: device({ esp: null }), espUpdate: fw() }),
    );
    expect(screen.getByText('v? → v1026')).toBeTruthy();
  });

  test('changed offers replace the old ones on rebuild', async () => {
    const hub = device();
    await show(firmwareScreen({ device: hub }));
    expect(screen.getByText('Firmware is up to date')).toBeTruthy();
    await show(firmwareScreen({ device: hub, espUpdate: fw() }));
    expect(screen.queryByText('Firmware is up to date')).toBeNull();
    expect(screen.getByText('1 update available')).toBeTruthy();
  });

  test('an in-progress update replaces the update offers', async () => {
    await show(
      firmwareScreen({
        espUpdate: fw(),
        currentUpdate: fwUpdate({ id: 55, firmware: fw() }),
      }),
    );
    expect(screen.getByText('Update in progress')).toBeTruthy();
    expect(
      screen.getByText(
        'Controller firmware is updating to v1026. Keep the hub powered on.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Update now')).toBeNull();
    expect(screen.queryByText('1 update available')).toBeNull();
  });

  test('"View progress" dispatches the update screen with the resume id', async () => {
    const hub = device();
    const firmware = fw({ processor: 'RFM6601', version: 5014 });
    await show(
      firmwareScreen({
        device: hub,
        currentUpdate: fwUpdate({ id: 55, firmware }),
      }),
    );
    expect(
      screen.getByText(
        'Transmitter firmware is updating to v5014. Keep the hub powered on.',
      ),
    ).toBeTruthy();
    await fireEvent.press(screen.getByText('View progress'));
    const event = onlyEvent();
    expect(event).toBeInstanceOf(GoToUpdateDeviceFirmwareScreen);
    expect(event.device).toBe(hub);
    expect(event.firmware).toBe(firmware);
    expect(event.resumeUpdateId).toBe(55);
  });

  test('Update now asks first: "Update" opens the update, "Not now" closes', async () => {
    const hub = device();
    const firmware = fw();
    await show(firmwareScreen({ device: hub, espUpdate: firmware }));
    await fireEvent.press(screen.getByText('Update now'));
    await advance(200);
    expect(screen.getByText('Update this hub?')).toBeTruthy();
    await fireEvent.press(screen.getByText('Not now'));
    await advance(200);
    expect(screen.queryByText('Update this hub?')).toBeNull();
    expect(devicesBloc.add).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText('Update now'));
    await advance(200);
    await fireEvent.press(screen.getByText('Update'));
    await advance(200);
    expect(screen.queryByText('Update this hub?')).toBeNull();
    const event = onlyEvent();
    expect(event).toBeInstanceOf(GoToUpdateDeviceFirmwareScreen);
    expect(event.device).toBe(hub);
    expect(event.firmware).toBe(firmware);
    expect(event.resumeUpdateId).toBeNull();
  });

  test('the back arrow and Android Back return to the hub', async () => {
    const hub = device();
    await show(firmwareScreen({ device: hub }));
    await fireEvent.press(screen.getByLabelText('Back to hub'));
    await pressBack();
    expect(devicesBloc.add).toHaveBeenCalledTimes(2);
    for (const [event] of devicesBloc.add.mock.calls) {
      expect(event).toBeInstanceOf(GoToSpecificDeviceEvent);
      expect(event.device).toBe(hub);
    }
  });
});

describe('UpdateDeviceScreen', () => {
  const failed = (id: number) =>
    fwUpdate({ id, status: 'FAILED', fileCursor: 10, fileSize: 100 });

  test('retrying a resumed update starts a fresh flash', async () => {
    let startCalls = 0;
    const fetchedIds: number[] = [];
    await show(
      <UpdateDeviceScreen
        device={device()}
        firmware={fw()}
        resumeUpdateId={55}
        startFwUpdate={async () => {
          startCalls++;
          return 88;
        }}
        fetchUpdateStatus={async id => {
          fetchedIds.push(id);
          return failed(id);
        }}
      />,
    );
    await advance(1100);

    expect(startCalls).toBe(0);
    expect(fetchedIds).toContain(55);
    expect(screen.getByText('Update did not finish')).toBeTruthy();
    expect(screen.getByText('Reference: 3')).toBeTruthy();
    expect(screen.queryByText('Elapsed')).toBeNull();

    await fireEvent.press(screen.getByText('Try again'));
    await advance(1100);

    expect(startCalls).toBe(1);
    expect(fetchedIds).toContain(88);
  });

  test('an expired session does not read as a hub problem', async () => {
    await show(
      <UpdateDeviceScreen
        device={device()}
        firmware={fw()}
        startFwUpdate={async () => {
          throw new UpdateTokenFailedException('Failed to start');
        }}
        fetchUpdateStatus={async id => failed(id)}
      />,
    );
    await advance(300);
    expect(screen.getByText('Sign in again')).toBeTruthy();
    expect(screen.getByText(/session expired/)).toBeTruthy();
    expect(screen.queryByText('Lost contact')).toBeNull();
    expect(
      screen.queryByText(/powered on and connected, then open/),
    ).toBeNull();
  });

  test('a server refusal shows the server reason; OK returns to Firmware', async () => {
    const hub = device();
    await show(
      <UpdateDeviceScreen
        device={hub}
        firmware={fw()}
        startFwUpdate={async () => {
          throw new FirmwareUpdateRejectedException(
            'An update is already running for this device.',
          );
        }}
        fetchUpdateStatus={async id => failed(id)}
      />,
    );
    await advance(300);
    expect(screen.getByText('Cannot start update')).toBeTruthy();
    expect(
      screen.getByText('An update is already running for this device.'),
    ).toBeTruthy();
    expect(screen.queryByText('Lost contact')).toBeNull();

    await fireEvent.press(screen.getByText('OK'));
    await advance(300);
    expect(screen.queryByText('Cannot start update')).toBeNull();
    const event = onlyEvent();
    expect(event).toBeInstanceOf(GoToDeviceFirmwareUpdatesEvent);
    expect(event.deviceId).toBe(hub.id);
  });

  test('five missed polls: "Lost contact"; tapping outside closes it and stays', async () => {
    let fetches = 0;
    await show(
      <UpdateDeviceScreen
        device={device()}
        firmware={fw()}
        resumeUpdateId={55}
        fetchUpdateStatus={async () => {
          fetches++;
          throw new Error('offline');
        }}
      />,
    );
    await advance(4100);
    expect(screen.queryByText('Lost contact')).toBeNull();
    await advance(1300);
    expect(fetches).toBe(5);
    expect(screen.getByText('Lost contact')).toBeTruthy();
    await advance(3000);
    expect(fetches).toBe(5); // the poll has stopped

    await fireEvent(screen.getByTestId('popup-barrier'), 'responderRelease');
    await advance(300);
    expect(screen.queryByText('Lost contact')).toBeNull();
    expect(devicesBloc.add).not.toHaveBeenCalled();
    expect(screen.getByText('Starting update')).toBeTruthy();
  });

  test('running: the ring eases to the new percentage; Elapsed and Remaining', async () => {
    const announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => {});
    await show(
      <UpdateDeviceScreen
        device={device()}
        firmware={fw()}
        resumeUpdateId={55}
        fetchUpdateStatus={async id =>
          fwUpdate({ id, fileCursor: 25, fileSize: 100 })
        }
      />,
    );
    expect(screen.getByText('Starting update')).toBeTruthy();
    expect(screen.getByText('Keep the hub powered on.')).toBeTruthy();
    expect(screen.getAllByText('Calculating...')).toHaveLength(2);
    expect(screen.getByText('0%')).toBeTruthy();

    await advance(1000);
    await advance(400);
    // Half way through the 800 ms tween.
    const midway = Number(
      String(screen.getByText(/^\d+%$/).props.children).replace('%', ''),
    );
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(25);
    await advance(600);
    expect(screen.getByText('25%')).toBeTruthy();
    expect(
      screen.getByRole('progressbar', { name: 'Firmware update progress' })
        .props.accessibilityValue,
    ).toEqual({ min: 0, max: 100, now: 25 });

    expect(screen.getByText('Updating firmware')).toBeTruthy();
    expect(
      screen.getByText(
        'Keep the hub powered on. You can leave this screen — the update keeps running.',
      ),
    ).toBeTruthy();
    // Started 30 s before each poll: a quarter done, so three times that left.
    expect(screen.getByText('00:30')).toBeTruthy();
    expect(screen.getByText('01:30')).toBeTruthy();
    expect(screen.getByText('Version')).toBeTruthy();
    expect(screen.getByText('v1026')).toBeTruthy();
    expect(screen.queryByText(/Reference/)).toBeNull();
    expect(announce).toHaveBeenCalledWith(
      'Firmware update 20 percent complete',
    );
  });

  test('success: the tick, the new version, no times; Back returns to Firmware', async () => {
    const hub = device();
    const announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => {});
    await show(
      <UpdateDeviceScreen
        device={hub}
        firmware={fw()}
        resumeUpdateId={55}
        fetchUpdateStatus={async id =>
          fwUpdate({ id, status: 'SUCCEEDED', fileCursor: 100 })
        }
      />,
    );
    await advance(1100);
    expect(screen.getByText('Update complete')).toBeTruthy();
    expect(
      screen.getByText(
        'Your hub is now running v1026 and is back to watching for vehicles.',
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText('Update complete')).toBeTruthy();
    expect(screen.queryByText('Elapsed')).toBeNull();
    expect(screen.queryByText('Try again')).toBeNull();
    expect(screen.queryByText(/Reference/)).toBeNull();
    expect(hub.device.esp32AppVersion).toBe(1026);
    expect(announce).toHaveBeenCalledWith('Update complete');

    await pressBack();
    const event = onlyEvent();
    expect(event).toBeInstanceOf(GoToDeviceFirmwareUpdatesEvent);
    expect(event.deviceId).toBe(hub.id);
  });

  test('the back arrow stops the poll and returns to Firmware', async () => {
    let fetches = 0;
    await show(
      <UpdateDeviceScreen
        device={device()}
        firmware={fw()}
        resumeUpdateId={55}
        fetchUpdateStatus={async id => {
          fetches++;
          return fwUpdate({ id });
        }}
      />,
    );
    await advance(1100);
    expect(fetches).toBe(1);
    await fireEvent.press(screen.getByLabelText('Back to firmware'));
    expect(onlyEvent()).toBeInstanceOf(GoToDeviceFirmwareUpdatesEvent);
    await act(async () => {});
    await advance(3000);
    expect(fetches).toBe(1);
  });
});
