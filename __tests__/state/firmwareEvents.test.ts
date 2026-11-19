// The firmware screens' bloc events and requests (spec 14 §1; firmware_requests.dart,
// firmware_update_requests.dart, device_requests.dart startFwUpdateAndGetFileSize), on Node: the
// four reads side by side, which offers are made, the quirks that throw (an empty latest list, a
// hub with no version), and each request's answers.

import * as Keychain from 'react-native-keychain';

import { parseDevice } from '../../src/models/device';
import {
  Firmware,
  parseFirmware,
  parseFirmwareUpdate,
} from '../../src/models/firmware';
import {
  ESP32UnableToGetLatestFirmware,
  FirmwareUpdateRejectedException,
  NoHubInformationAvailableException,
  UnrecognizedFirmwareUpdate,
} from '../../src/services/exceptions';
import { AuthRequestManager } from '../../src/services/requests/authRequests';
import { startFwUpdateAndGetFileSize } from '../../src/services/requests/deviceRequests';
import {
  checkForRunningFirmwareUpdate,
  getDeviceUpdateStatus,
  getLatestESP32APPFirmware,
  getLatestRFM6601APPFirmware,
} from '../../src/services/requests/firmwareRequests';
import { SecureStorage } from '../../src/services/secureStorage';
import { AuthBloc } from '../../src/state/auth/authBloc';
import {
  DevicesBloc,
  DevicesState,
  GoToDeviceFirmwareUpdatesEvent,
  GoToUpdateDeviceFirmwareScreen,
  IsLoadingDevicesScreenState,
  IsOnDeviceFirmwareUpdatesScreen,
  IsUpdatingDeviceFirmwareState,
} from '../../src/state/devices/devicesBloc';
import { MainAppBloc } from '../../src/state/mainApp/mainAppBloc';
import { flush, installFakeServer } from '../helpers/fakeServer';
import { hubJson } from '../helpers/hubJson';

const keychain = (Keychain as unknown as { __store: Map<string, unknown> })
  .__store;

// As Django's (and Node's) FirmwareSerializer and FirmwareUpdateSerializer send them.
const espJson = {
  id: 3,
  version_number: 1026,
  release_date: '2026-11-18',
  processor: 'ESP32',
};
const rfmJson = {
  id: 4,
  version_number: 7,
  release_date: '2026-11-18',
  processor: 'RFM6601',
};
const updateJson = {
  id: 55,
  file_size: 3000,
  file_cursor: 1024,
  status: 'RUNNING',
  message: null,
  date_started: '2026-11-18T06:58:08.890123-06:00',
  date_ended: null,
  firmware: espJson,
};

let mainAppBloc: MainAppBloc;
let requests: { method: string; path: string; body: string | undefined }[];
let hub: ReturnType<typeof hubJson>;
let hubId: number;
let nextHubId = 9700;

async function settle() {
  for (let i = 0; i < 20; i++) {
    await flush();
  }
}

function serve(replies: Record<string, { status: number; body?: unknown }>) {
  ({ requests } = installFakeServer({
    'GET /maintenance-mode/': { status: 200 },
    'POST /auth/jwt/verify': { status: 200 },
    'GET /devices/': { status: 200, body: [hub] },
    [`POST /devices/${hubId}/message/get_health/`]: { status: 202 },
    [`GET /devices/${hubId}/`]: { status: 200, body: hub },
    'GET /latest-esp32-app/': { status: 200, body: [espJson] },
    'GET /latest-rfm6601-app/': { status: 200, body: [rfmJson] },
    [`GET /devices/${hubId}/check_existing_firmware_update/`]: {
      status: 200,
      body: [],
    },
    ...replies,
  }));
}

beforeEach(async () => {
  AuthRequestManager.resetSingleFlightForTesting();
  keychain.clear();
  installFakeServer({ 'GET /maintenance-mode/': { status: 200 } });
  const authBloc = new AuthBloc();
  for (let i = 0; i < 10; i++) {
    await flush();
  }
  await SecureStorage.setAccessToken('A');
  await SecureStorage.setRefreshToken('R');
  mainAppBloc = new MainAppBloc(authBloc);
  await flush();
  hubId = nextHubId++;
  hub = hubJson({
    id: hubId,
    device: { esp32_app_version: 1025, rfm6601_app_version: 7 },
  });
  serve({});
  await settle();
});

afterEach(() => jest.restoreAllMocks());

const paths = () =>
  requests
    .filter(
      r => r.path !== '/maintenance-mode/' && r.path !== '/auth/jwt/verify',
    )
    .map(r => `${r.method} ${r.path}`);

async function devicesBloc() {
  const bloc = new DevicesBloc(mainAppBloc, [parseDevice(hub)]);
  await settle();
  requests.length = 0;
  const states: DevicesState[] = [bloc.state];
  bloc.subscribe(() => states.push(bloc.state));
  return { bloc, states };
}

describe('GoToDeviceFirmwareUpdatesEvent', () => {
  test('loading, then the four reads side by side, then the offers', async () => {
    const { bloc, states } = await devicesBloc();
    bloc.add(new GoToDeviceFirmwareUpdatesEvent(hubId));
    await settle();

    expect(states[1]).toBeInstanceOf(IsLoadingDevicesScreenState);
    expect(paths().sort()).toEqual(
      [
        `POST /devices/${hubId}/message/get_health/`,
        `GET /devices/${hubId}/`,
        'GET /latest-esp32-app/',
        'GET /latest-rfm6601-app/',
        `GET /devices/${hubId}/check_existing_firmware_update/`,
      ].sort(),
    );
    const shown = bloc.state as IsOnDeviceFirmwareUpdatesScreen;
    expect(shown).toBeInstanceOf(IsOnDeviceFirmwareUpdatesScreen);
    expect(shown.device.id).toBe(hubId);
    // ESP32 1025 < 1026: offered. RFM6601 7 is not below 7: not offered.
    expect(shown.espUpdate?.id).toBe(espJson.id);
    expect(shown.rfmUpdate).toBeNull();
    expect(shown.currentRunning).toBeNull();
    expect(shown.isPoppable).toBe(true);
  });

  test('the first running update is carried (202 is accepted too)', async () => {
    serve({
      [`GET /devices/${hubId}/check_existing_firmware_update/`]: {
        status: 202,
        body: [updateJson, { ...updateJson, id: 56 }],
      },
    });
    const { bloc } = await devicesBloc();
    bloc.add(new GoToDeviceFirmwareUpdatesEvent(hubId));
    await settle();
    const shown = bloc.state as IsOnDeviceFirmwareUpdatesScreen;
    expect(shown.currentRunning?.id).toBe(55);
    expect(shown.currentRunning?.firmware?.processor).toBe('ESP32');
  });

  const failing: [
    string,
    () => Record<string, { status: number; body?: unknown }>,
  ][] = [
    [
      'an empty latest list',
      () => ({ 'GET /latest-rfm6601-app/': { status: 200, body: [] } }),
    ],
    [
      'a hub with no reported version',
      () => ({
        [`GET /devices/${hubId}/`]: {
          status: 200,
          body: hubJson({ id: hubId, device: { esp32_app_version: null } }),
        },
      }),
    ],
    [
      'a failed running-update check',
      () => ({
        [`GET /devices/${hubId}/check_existing_firmware_update/`]: {
          status: 500,
          body: '',
        },
      }),
    ],
  ];

  test.each(failing)(
    '%s goes to the error recovery (quirk)',
    async (_, replies) => {
      const recover = jest
        .spyOn(DevicesBloc.prototype, 'recover')
        .mockResolvedValue();
      serve(replies());
      const { bloc } = await devicesBloc();
      bloc.add(new GoToDeviceFirmwareUpdatesEvent(hubId));
      await settle();
      expect(recover).toHaveBeenCalledTimes(1);
      expect(bloc.state).toBeInstanceOf(IsLoadingDevicesScreenState);
      // Every read was still made: all four settle before the failure is raised.
      expect(paths()).toContain('GET /latest-esp32-app/');
      expect(paths()).toContain(
        `GET /devices/${hubId}/check_existing_firmware_update/`,
      );
    },
  );
});

test('GoToUpdateDeviceFirmwareScreen: the progress screen at once, poppable', async () => {
  const { bloc } = await devicesBloc();
  const device = parseDevice(hub);
  const firmware = parseFirmware(espJson);
  bloc.add(new GoToUpdateDeviceFirmwareScreen(device, firmware, 55));
  await settle();
  const shown = bloc.state as IsUpdatingDeviceFirmwareState;
  expect(shown).toBeInstanceOf(IsUpdatingDeviceFirmwareState);
  expect(shown.device).toBe(device);
  expect(shown.firmware).toBe(firmware);
  expect(shown.resumeUpdateId).toBe(55);
  expect(shown.isPoppable).toBe(true);
  expect(paths()).toEqual([]);
});

describe('the firmware requests', () => {
  test('the latest firmware: the first of the list; another status throws', async () => {
    const esp = await getLatestESP32APPFirmware();
    expect(esp).toBeInstanceOf(Firmware);
    expect([esp.id, esp.versionNumber, esp.processor, esp.releaseDate]).toEqual(
      [3, 1026, 'ESP32', '2026-11-18'],
    );
    expect(esp.stable).toBeNull();
    expect((await getLatestRFM6601APPFirmware()).processor).toBe('RFM6601');

    serve({ 'GET /latest-esp32-app/': { status: 500, body: '' } });
    await expect(getLatestESP32APPFirmware()).rejects.toBeInstanceOf(
      ESP32UnableToGetLatestFirmware,
    );
    serve({ 'GET /latest-esp32-app/': { status: 200, body: [] } });
    await expect(getLatestESP32APPFirmware()).rejects.toBeInstanceOf(
      RangeError,
    );
  });

  test('the running-update check: 200 or 202; anything else throws', async () => {
    serve({
      [`GET /devices/${hubId}/check_existing_firmware_update/`]: {
        status: 200,
        body: [updateJson],
      },
    });
    const [running] = await checkForRunningFirmwareUpdate(hubId);
    expect(running.fileSize).toBe(3000);
    expect(running.fileCursor).toBe(1024);
    expect(running.status).toBe('RUNNING');
    // Chicago, to the microsecond.
    expect(running.dateStarted?.microsecondsSinceEpoch).toBe(
      Date.UTC(2026, 10, 18, 12, 58, 8, 890) * 1000 + 123,
    );
    expect(running.dateEnded).toBeNull();

    serve({
      [`GET /devices/${hubId}/check_existing_firmware_update/`]: {
        status: 404,
        body: { detail: 'Not found.' },
      },
    });
    await expect(checkForRunningFirmwareUpdate(hubId)).rejects.toBeInstanceOf(
      UnrecognizedFirmwareUpdate,
    );
  });

  test('an update’s status: /firmware_update/{id} with no slash, parsed whatever the status', async () => {
    serve({ 'GET /firmware_update/55': { status: 200, body: updateJson } });
    const update = await getDeviceUpdateStatus(55);
    expect(update.id).toBe(55);
    expect(paths()).toContain('GET /firmware_update/55');

    serve({
      'GET /firmware_update/55': {
        status: 404,
        body: { detail: 'Not found.' },
      },
    });
    // No firmware in the body: Dart's cast of null to a Map.
    await expect(getDeviceUpdateStatus(55)).rejects.toBeInstanceOf(TypeError);
  });

  test('starting: the firmware id, form-encoded; the new update’s id back', async () => {
    serve({
      [`POST /devices/${hubId}/message/update_firmware/`]: {
        status: 202,
        body: { firmware: 3, msg: 'Message sent.', fw_update_id: 61 },
      },
    });
    await expect(
      startFwUpdateAndGetFileSize({ deviceId: hubId, firmwareId: 3 }),
    ).resolves.toBe(61);
    const post = requests.find(r => r.path.endsWith('/update_firmware/'))!;
    expect(post.method).toBe('POST');
    expect(post.body).toBe('firmware=3');
  });

  test('starting: a refusal is the server’s words; anything else NoHubInformation', async () => {
    serve({
      [`POST /devices/${hubId}/message/update_firmware/`]: {
        status: 400,
        body: {
          non_field_errors: [
            'Device is not connected.',
            'Please check its connection and try again.',
          ],
        },
      },
    });
    const refused = startFwUpdateAndGetFileSize({
      deviceId: hubId,
      firmwareId: 3,
    });
    await expect(refused).rejects.toBeInstanceOf(
      FirmwareUpdateRejectedException,
    );
    await expect(refused).rejects.toHaveProperty(
      'cause',
      'Device is not connected. Please check its connection and try again.',
    );

    serve({
      [`POST /devices/${hubId}/message/update_firmware/`]: {
        status: 400,
        body: { firmware: ['Invalid pk "99" - object does not exist.'] },
      },
    });
    await expect(
      startFwUpdateAndGetFileSize({ deviceId: hubId, firmwareId: 99 }),
    ).rejects.toBeInstanceOf(NoHubInformationAvailableException);
  });
});

test('the FirmwareUpdate parser: the nested firmware is required', () => {
  expect(() => parseFirmwareUpdate({ ...updateJson, firmware: null })).toThrow(
    TypeError,
  );
  expect(parseFirmwareUpdate(updateJson).firmware?.versionNumber).toBe(1026);
});
