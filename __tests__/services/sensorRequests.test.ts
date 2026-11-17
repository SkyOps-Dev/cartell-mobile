// The sensor calls (sensor_requests.dart; spec 04 §5) and the three hub calls the sensor screens
// add (device_requests.dart: isDeviceConnectedRequest, setPairingModeRequest, pairToSounder):
// what each sends to Node, and what it does with the answer, error codes included.

import * as Keychain from 'react-native-keychain';

import { nodeBaseUrlHttp } from '../../src/config/environment';
import { Sensor } from '../../src/models/sensor';
import { parseDevice } from '../../src/models/device';
import {
  NoHubInformationAvailableException,
  UnableToUpdateSensorEventsException,
  UpdateStoredCredentialsFailedException,
} from '../../src/services/exceptions';
import * as reporter from '../../src/services/reportError';
import { AuthRequestManager } from '../../src/services/requests/authRequests';
import {
  isDeviceConnectedRequest,
  pairToSounder,
  setPairingModeRequest,
} from '../../src/services/requests/deviceRequests';
import {
  deleteSensor,
  setSensor,
  setSensorNotificationPolicy,
  setSensors,
  updateSensorData,
} from '../../src/services/requests/sensorRequests';
import { Result } from '../../src/services/result';
import { installFakeServer, RecordedRequest } from '../helpers/fakeServer';
import { hubJson } from '../helpers/hubJson';

const keychain = (Keychain as unknown as { __store: Map<string, unknown> })
  .__store;

const sensorJson = (overrides: Record<string, unknown> = {}) => ({
  id: 41,
  sensor_id: '0xc1230001',
  name: 'Sim Hub - Sensor #1',
  longitude: null,
  latitude: null,
  has_low_battery: false,
  is_active: true,
  should_send_notification: true,
  connection_date: '2026-11-12T06:46:14.273000-06:00',
  disconnection_date: null,
  fw_version: null,
  sensor_type: 'PUCK',
  is_blacklisted: false,
  ...overrides,
});

let report: jest.SpyInstance;

beforeEach(() => {
  keychain.clear();
  jest
    .spyOn(AuthRequestManager.prototype, 'auth')
    .mockResolvedValue(Result.success());
  report = jest.spyOn(reporter, 'reportError');
});

afterEach(() => jest.restoreAllMocks());

const sent = (requests: RecordedRequest[]) =>
  requests.filter(r => r.path !== '/maintenance-mode/');
const reported = () =>
  report.mock.calls.map(([error]) => (error as { cause?: string }).cause);
const failSession = () =>
  jest
    .spyOn(AuthRequestManager.prototype, 'auth')
    .mockResolvedValue(Result.failure());

describe('setSensors', () => {
  test('GET /devices/{id}/sensors on Node, without the slash, each through the parser', async () => {
    const { requests, fetchMock } = installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'GET /devices/7/sensors': {
        status: 200,
        body: [sensorJson(), sensorJson({ id: 42 })],
      },
    });
    const sensors = await setSensors({ deviceID: 7 });
    expect(sensors.map(s => s.id)).toEqual([41, 42]);
    expect(sensors[0]).toBeInstanceOf(Sensor);
    expect(sent(requests).map(r => `${r.method} ${r.path}`)).toEqual([
      'GET /devices/7/sensors',
    ]);
    expect(fetchMock.mock.calls[1][0]).toBe(
      `${nodeBaseUrlHttp()}/devices/7/sensors`,
    );
  });

  test('300 or more reports 04c7b and throws', async () => {
    installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'GET /devices/7/sensors': { status: 500 },
    });
    await expect(setSensors({ deviceID: 7 })).rejects.toBeInstanceOf(
      UnableToUpdateSensorEventsException,
    );
    expect(reported()).toEqual(['Error Code 04c7b:']);
  });

  test('a failed session check reports 11ebc and sends nothing', async () => {
    failSession();
    const { fetchMock } = installFakeServer({});
    await expect(setSensors({ deviceID: 7 })).rejects.toBeInstanceOf(
      UpdateStoredCredentialsFailedException,
    );
    expect(reported()).toEqual(['Error Code 11ebc:']);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('setSensor', () => {
  test('GET /sensors/{id}/, merged into the cached sensor', async () => {
    installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'GET /sensors/41/': { status: 200, body: sensorJson({ name: 'Old' }) },
    });
    const first = await setSensor({ deviceID: 7, sensorID: 41 });
    installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'GET /sensors/41/': { status: 200, body: sensorJson({ name: 'New' }) },
    });
    const second = await setSensor({ deviceID: 7, sensorID: 41 });
    expect(second).toBe(first);
    expect(first.name).toBe('New');
  });

  test('a 404 reports 40b27 and throws; a failed session reports c3f22', async () => {
    installFakeServer({ 'GET /maintenance-mode/': { status: 200 } });
    await expect(
      setSensor({ deviceID: 7, sensorID: 99 }),
    ).rejects.toBeInstanceOf(UnableToUpdateSensorEventsException);
    failSession();
    await expect(
      setSensor({ deviceID: 7, sensorID: 99 }),
    ).rejects.toBeInstanceOf(UpdateStoredCredentialsFailedException);
    expect(reported()).toEqual(['Error Code 40b27:', 'Error Code c3f22:']);
  });
});

describe('deleteSensor', () => {
  test('DELETE /sensors/{id}/; 204 is done', async () => {
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'DELETE /sensors/41/': { status: 204 },
    });
    await deleteSensor({ deviceID: 7, sensorID: 41 });
    expect(sent(requests).map(r => `${r.method} ${r.path}`)).toEqual([
      'DELETE /sensors/41/',
    ]);
  });

  test('a refusal reports 10a37 and throws', async () => {
    installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'DELETE /sensors/41/': { status: 500 },
    });
    await expect(
      deleteSensor({ deviceID: 7, sensorID: 41 }),
    ).rejects.toBeInstanceOf(UnableToUpdateSensorEventsException);
    expect(reported()).toEqual(['Error Code 10a37:']);
  });

  test('a failed session check returns as though it worked, sending nothing', async () => {
    failSession();
    const { fetchMock } = installFakeServer({});
    await expect(
      deleteSensor({ deviceID: 7, sensorID: 41 }),
    ).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(reported()).toEqual([]);
  });
});

describe('updateSensorData', () => {
  test('PATCH /sensors/{id}/ with the body as a form', async () => {
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'PATCH /sensors/41/': { status: 200, body: sensorJson() },
    });
    await updateSensorData({
      deviceID: 7,
      sensorID: 41,
      body: { latitude: '40.712776', longitude: '-74.005974' },
    });
    const [request] = sent(requests);
    expect(request.method).toBe('PATCH');
    expect(request.path).toBe('/sensors/41/');
    expect(request.body).toBe('latitude=40.712776&longitude=-74.005974');
  });

  test('a refusal reports 10a37; a failed session reports b323c', async () => {
    installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'PATCH /sensors/41/': { status: 400, body: { name: ['x'] } },
    });
    await expect(
      updateSensorData({ deviceID: 7, sensorID: 41, body: { name: 'x' } }),
    ).rejects.toThrow('Failed to patch sensor data');
    failSession();
    await expect(
      updateSensorData({ deviceID: 7, sensorID: 41, body: { name: 'x' } }),
    ).rejects.toThrow('Failed to update sensor data');
    expect(reported()).toEqual(['Error Code 10a37:', 'Error Code b323c:']);
  });
});

describe('setSensorNotificationPolicy', () => {
  test.each([
    [true, 'should_send_notification=true'],
    [false, 'should_send_notification=false'],
  ])('%p sends %s', async (value, body) => {
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'PATCH /sensors/41/': { status: 200, body: sensorJson() },
    });
    await setSensorNotificationPolicy(41, value);
    expect(sent(requests)[0].body).toBe(body);
  });

  test('only 200 is success: a 204 reports 10a37 and throws', async () => {
    installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'PATCH /sensors/41/': { status: 204 },
    });
    await expect(setSensorNotificationPolicy(41, true)).rejects.toThrow(
      'Failed to set notification policy',
    );
    expect(reported()).toEqual(['Error Code 10a37:']);
  });
});

describe('the hub calls the sensor screens make', () => {
  test('isDeviceConnectedRequest: GET /devices/{id}/ (no health request) and its is_connected', async () => {
    const json = hubJson({ id: 7001, device: { is_connected: true } });
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'GET /devices/7001/': { status: 200, body: json },
    });
    expect(await isDeviceConnectedRequest(parseDevice(json))).toBe(true);
    expect(sent(requests).map(r => `${r.method} ${r.path}`)).toEqual([
      'GET /devices/7001/',
    ]);
  });

  test('isDeviceConnectedRequest: an error body reports 205f8 and gives false', async () => {
    const json = hubJson({ id: 7002 });
    installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'GET /devices/7002/': { status: 404, body: { detail: 'Not found.' } },
    });
    expect(await isDeviceConnectedRequest(parseDevice(json))).toBe(false);
    expect(reported()).toEqual(['Error Code 205f8:']);
  });

  test('isDeviceConnectedRequest: a failed session check gives false, quietly', async () => {
    failSession();
    const { fetchMock } = installFakeServer({});
    expect(await isDeviceConnectedRequest(parseDevice(hubJson()))).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test.each([
    [true, 'is_enabled=True'],
    [false, 'is_enabled=False'],
  ])('setPairingModeRequest(%p) sends %s', async (isEnabled, body) => {
    const json = hubJson({ id: 7003 });
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'POST /devices/7003/message/set_pairing_mode/': {
        status: 202,
        body: { msg: 'Message sent.' },
      },
    });
    await setPairingModeRequest(isEnabled, parseDevice(json));
    expect(sent(requests).map(r => [r.method, r.path, r.body])).toEqual([
      ['POST', '/devices/7003/message/set_pairing_mode/', body],
    ]);
  });

  test('setPairingModeRequest: a 400 passes; above 450 is reported and thrown', async () => {
    const json = hubJson({ id: 7004 });
    installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'POST /devices/7004/message/set_pairing_mode/': {
        status: 400,
        body: { non_field_errors: ['Device is not connected.'] },
      },
    });
    await expect(
      setPairingModeRequest(true, parseDevice(json)),
    ).resolves.toBeUndefined();
    installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'POST /devices/7004/message/set_pairing_mode/': {
        status: 500,
        body: { non_field_errors: ['boom'] },
      },
    });
    await expect(
      setPairingModeRequest(true, parseDevice(json)),
    ).rejects.toBeInstanceOf(NoHubInformationAvailableException);
    expect(reported()).toEqual(['boom']);
  });

  test('pairToSounder: POST pair_to_sounder with no session check; a refusal reports 7466e', async () => {
    const auth = jest.spyOn(AuthRequestManager.prototype, 'auth');
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'POST /devices/7/message/pair_to_sounder/': { status: 202 },
    });
    await pairToSounder(7);
    expect(sent(requests).map(r => `${r.method} ${r.path}`)).toEqual([
      'POST /devices/7/message/pair_to_sounder/',
    ]);
    expect(auth).not.toHaveBeenCalled();
    installFakeServer({ 'GET /maintenance-mode/': { status: 200 } });
    await expect(pairToSounder(7)).rejects.toBeInstanceOf(
      NoHubInformationAvailableException,
    );
    expect(reported()).toEqual(['Error Code 7466e:']);
  });
});
