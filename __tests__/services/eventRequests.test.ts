// The event-history requests (event_requests.dart; spec 04 §5, spec 12 §5) and the Event model
// (models/event.dart): what each sends to Node, how the `next` link is followed, the error codes,
// and how the server's events are read (including the "AC" quirk).

import * as Keychain from 'react-native-keychain';

import { config, nodeBaseUrlHttp } from '../../src/config/environment';
import { Event, EventTypes, parseEvent, Results } from '../../src/models/event';
import { Sensor } from '../../src/models/sensor';
import {
  dartExceptionText,
  UnableToUpdateExceptions,
  UpdateTokenFailedException,
} from '../../src/services/exceptions';
import * as reporter from '../../src/services/reportError';
import { AuthRequestManager } from '../../src/services/requests/authRequests';
import {
  setDeviceEvents,
  setEventData,
  setSensorEventData,
} from '../../src/services/requests/eventRequests';
import { Result } from '../../src/services/result';
import { installFakeServer, RecordedRequest } from '../helpers/fakeServer';

const keychain = (Keychain as unknown as { __store: Map<string, unknown> })
  .__store;

let nextId = 70000;
const activationJson = (overrides: Record<string, unknown> = {}) => ({
  id: nextId++,
  device: 31,
  device_name: 'Front Door',
  sensor: 4,
  event_type: 'AV',
  sensor_name: 'Front Door - Sensor #1',
  time: '2026-10-21T07:00:00.123456-05:00',
  location: 'Home',
  address: '1 Lane',
  group: null,
  added_date: '2026-10-21T11:00:00Z',
  ...overrides,
});

const page = (results: unknown[], next: string | null = null) => ({
  count: results.length,
  next,
  previous: null,
  results,
});

let report: jest.SpyInstance;

beforeEach(() => {
  keychain.clear();
  jest
    .spyOn(AuthRequestManager.prototype, 'auth')
    .mockResolvedValue(Result.success());
  report = jest.spyOn(reporter, 'reportError');
});

afterEach(() => {
  jest.restoreAllMocks();
  config.shouldUseTLS = false;
});

const sent = (requests: RecordedRequest[]) =>
  requests.filter(r => r.path !== '/maintenance-mode/');
const reported = () =>
  report.mock.calls.map(([error]) => (error as { cause?: string }).cause);

describe('the Event model', () => {
  test('reads a page and its events; CO and DC by label, every other type as activation', () => {
    const event = parseEvent(
      page(
        ['CO', 'DC', 'AV', 'SC', 'FS', 'AC'].map(type =>
          activationJson({ event_type: type }),
        ),
        'http://host/activations/?page=2',
      ),
    );
    expect(event).toBeInstanceOf(Event);
    expect(event.next).toBe('http://host/activations/?page=2');
    expect(event.results!.map(r => r.eventType.label)).toEqual([
      'Connected',
      'Disconnected',
      'Motion Detected',
      'Motion Detected',
      'Motion Detected',
      'Motion Detected',
    ]);
    expect(event.results![0].eventType.icon).toBe(EventTypes.connection.icon);
    const first = event.results![2];
    expect(first).toBeInstanceOf(Results);
    expect(first).toMatchObject({
      device: 31,
      deviceName: 'Front Door',
      sensor: 4,
      sensorName: 'Front Door - Sensor #1',
      time: '2026-10-21T07:00:00.123456-05:00',
      location: 'Home',
      addedDate: '2026-10-21T11:00:00Z',
    });
  });

  test('an event seen again is the cached one, updated (all but its type)', () => {
    const json = activationJson({ event_type: 'CO', sensor_name: 'Old' });
    const first = parseEvent(page([json])).results![0];
    const again = parseEvent(
      page([{ ...json, event_type: 'DC', sensor_name: 'New' }]),
    ).results![0];
    expect(again).toBe(first);
    expect(first.sensorName).toBe('New');
    expect(first.eventType.label).toBe('Connected');
  });

  test("an exception's Dart text is \"Instance of '<class>'\"", () => {
    expect(dartExceptionText(new UnableToUpdateExceptions('x'))).toBe(
      "Instance of 'UnableToUpdateExceptions'",
    );
  });
});

describe('setEventData', () => {
  test('GET /activations on Node, without the slash', async () => {
    const { requests, fetchMock } = installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'GET /activations': { status: 200, body: page([activationJson()]) },
    });
    const event = await setEventData();
    expect(event.results).toHaveLength(1);
    expect(sent(requests).map(r => `${r.method} ${r.path}`)).toEqual([
      'GET /activations',
    ]);
    expect(fetchMock.mock.calls[1][0]).toBe(`${nodeBaseUrlHttp()}/activations`);
  });

  test("follows the server's next link, its scheme set to the app's", async () => {
    const { fetchMock } = installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'GET /activations/': { status: 200, body: page([]) },
    });
    await setEventData({ nextURL: 'https://h:8001/activations/?page=2' });
    expect(fetchMock.mock.calls[1][0]).toBe(
      'http://h:8001/activations/?page=2',
    );
    config.shouldUseTLS = true;
    await setEventData({ nextURL: 'http://h:8001/activations/?page=3' });
    expect(fetchMock.mock.calls.at(-1)![0]).toBe(
      'https://h:8001/activations/?page=3',
    );
  });

  test('anything but 200 reports 59538 and throws', async () => {
    installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'GET /activations': { status: 201, body: page([]) },
    });
    await expect(setEventData()).rejects.toBeInstanceOf(
      UnableToUpdateExceptions,
    );
    expect(reported()).toEqual(['Error Message 59538:']);
  });

  test('a failed session check reports 4b6cf and sends nothing', async () => {
    jest
      .spyOn(AuthRequestManager.prototype, 'auth')
      .mockResolvedValue(Result.failure());
    const { fetchMock } = installFakeServer({});
    await expect(setEventData()).rejects.toBeInstanceOf(
      UpdateTokenFailedException,
    );
    expect(reported()).toEqual(['Error Code 4b6cf:']);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('setDeviceEvents and setSensorEventData', () => {
  test('the hub: GET /devices/{id}/activations (no slash); 50748 / 24b87', async () => {
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'GET /devices/21/activations': { status: 200, body: page([]) },
    });
    await setDeviceEvents({ deviceID: 21 });
    expect(sent(requests).map(r => r.path)).toEqual([
      '/devices/21/activations',
    ]);
    installFakeServer({ 'GET /maintenance-mode/': { status: 200 } });
    await expect(setDeviceEvents({ deviceID: 21 })).rejects.toBeInstanceOf(
      UnableToUpdateExceptions,
    );
    jest
      .spyOn(AuthRequestManager.prototype, 'auth')
      .mockResolvedValue(Result.failure());
    await expect(setDeviceEvents({ deviceID: 21 })).rejects.toBeInstanceOf(
      UpdateTokenFailedException,
    );
    expect(reported()).toEqual(['Error Message 50748:', 'Error Code 24b87:']);
  });

  test('the sensor: GET /sensors/{id}/activations/; 0161e / df3dc', async () => {
    const sensor = { id: 4 } as Sensor;
    const { requests } = installFakeServer({
      'GET /maintenance-mode/': { status: 200 },
      'GET /sensors/4/activations/': { status: 200, body: page([]) },
    });
    await setSensorEventData({ sensor });
    expect(sent(requests).map(r => r.path)).toEqual([
      '/sensors/4/activations/',
    ]);
    installFakeServer({ 'GET /maintenance-mode/': { status: 200 } });
    await expect(setSensorEventData({ sensor })).rejects.toBeInstanceOf(
      UnableToUpdateExceptions,
    );
    jest
      .spyOn(AuthRequestManager.prototype, 'auth')
      .mockResolvedValue(Result.failure());
    await expect(setSensorEventData({ sensor })).rejects.toBeInstanceOf(
      UpdateTokenFailedException,
    );
    expect(reported()).toEqual(['Error Message 0161e:', 'Error Code df3dc:']);
  });
});
