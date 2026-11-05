// The Device model and the shared cache (device.dart, abstract_model.dart, data_persistor.dart,
// json_parser.dart; spec 05): one object per id, re-fetches merged into it with Flutter's field
// list, listeners told, and the parse rules and failures as Flutter has them.

import { Device, parseDevice } from '../../src/models/device';
import { parseSensor } from '../../src/models/sensor';
import {
  devicePersistor,
  sensorPersistor,
} from '../../src/services/data/persistors';
import {
  JsonStructureProblemException,
  TriedToConvertFromWrongJsonTypeException,
} from '../../src/services/exceptions';
import { hubJson } from '../helpers/hubJson';

let nextId = 1000;
/** A hub with an id no other test has cached. */
const freshHub = (overrides: Parameters<typeof hubJson>[0] = {}) =>
  hubJson({ id: nextId++, ...overrides });

const sensorJson = (overrides: Record<string, unknown> = {}) => ({
  id: nextId++,
  sensor_id: 'A1B2C3',
  name: 'Driveway',
  longitude: null,
  latitude: null,
  has_low_battery: false,
  is_active: true,
  connection_date: '2026-10-21T07:00:00-05:00',
  disconnection_date: null,
  should_send_notification: true,
  fw_version: 3,
  sensor_type: 'EX',
  is_blacklisted: false,
  ...overrides,
});

test('parses every field the way device.dart does', () => {
  const device = parseDevice(
    freshHub({
      latitude: ' 41.88000000 ',
      longitude: -87.6,
      should_use_onboard_sensor: null,
      should_send_email: undefined,
      device: { is_connected: true, esp32_app_version: null },
    }),
  );
  expect(device).toBeInstanceOf(Device);
  expect(device).toMatchObject({
    name: 'Gate',
    location: 1,
    latitude: 41.88,
    longitude: -87.6,
    archived: false,
    shouldUseOnboardSensor: false,
    shouldSendEmail: false,
    archivedDate: null,
    shouldSendNotification: true,
    shouldSendConnectionNotification: false,
    shouldUseEmulatedSensor: false,
  });
  expect(device.addedDate.microsecondsSinceEpoch).toBe(
    Date.parse('2026-10-21T12:00:00.123Z') * 1000 + 456,
  );
  expect(device.device).toEqual({
    id: 31,
    isConnected: true,
    macAddress: '48:27:e2:b1:94:44',
    esp32AppVersion: null,
    rfm6601AppVersion: 7,
    deviceModel: { name: 'Hub v1', releaseDate: '2023-10-31' },
    connections: [],
    sensors: [],
    isBlacklisted: false,
  });
});

test.each<[unknown, number | null]>([
  [null, null],
  ['12.5', 12.5],
  ['1e3', 1000],
  ['.5', 0.5],
  ['0x10', null],
  ['', null],
  ['abc', null],
])('a coordinate of %j reads as %j (double.tryParse)', (value, expected) => {
  expect(parseDevice(freshHub({ latitude: value })).latitude).toBe(expected);
});

test('a hub already held is merged into the held object, which comes back', () => {
  const json = freshHub({ should_use_emulated_sensor: true });
  const first = parseDevice(json);
  const listener = jest.fn();
  first.addListener(listener);
  const persistorListener = jest.fn();
  devicePersistor.addListener(persistorListener);

  const second = parseDevice({
    ...json,
    name: 'Renamed',
    location: 99,
    added_date: '2020-01-01T00:00:00Z',
    should_use_emulated_sensor: false,
    should_send_email: false,
    device: { ...json.device, is_connected: true },
  });

  expect(second).toBe(first);
  expect(first.name).toBe('Renamed');
  expect(first.shouldSendEmail).toBe(false);
  expect(first.device.isConnected).toBe(true);
  // Not merged (quirks): location, addedDate, and integrator support.
  expect(first.location).toBe(1);
  expect(first.addedDate.microsecondsSinceEpoch).not.toBe(
    Date.parse('2020-01-01T00:00:00Z') * 1000,
  );
  expect(first.shouldUseEmulatedSensor).toBe(true);
  // The model tells its listeners, and through them the persistor tells its own.
  expect(listener).toHaveBeenCalledTimes(1);
  expect(persistorListener).toHaveBeenCalledTimes(1);
  devicePersistor.removeListener(persistorListener);
});

test("a re-fetched sensor never changes isBlacklisted, and the hub's sensors are cached", () => {
  const json = sensorJson();
  const held = parseSensor(json);
  const device = parseDevice(
    freshHub({ device: { sensors: [{ ...json, is_blacklisted: true }] } }),
  );
  expect(device.device.sensors[0]).toBe(held);
  expect(held.isBlacklisted).toBe(false);
  expect(device.hasBlacklistedSensor).toBe(false);
  expect(sensorPersistor.hasObj(held.id)).toBe(true);
});

test('hasBlacklistedSensor: any of its sensors', () => {
  const device = parseDevice(
    freshHub({
      device: {
        sensors: [sensorJson(), sensorJson({ is_blacklisted: true })],
      },
    }),
  );
  expect(device.hasBlacklistedSensor).toBe(true);
});

test('a bad date fails as TriedToConvertFromWrongJsonTypeException, nested ones re-wrapped', () => {
  expect(() => parseDevice(freshHub({ added_date: 'yesterday' }))).toThrow(
    TriedToConvertFromWrongJsonTypeException,
  );
  // The DeviceMeta tracker converts the connection's failure; the Device tracker sees an
  // exception that is not a FormatException.
  expect(() =>
    parseDevice(
      freshHub({
        device: {
          connections: [
            {
              ip_address: '1.2.3.4',
              port: 1,
              is_active: true,
              connection_date: 'never',
              disconnection_date: null,
            },
          ],
        },
      }),
    ),
  ).toThrow(JsonStructureProblemException);
});

test('archived_date that is not null fails the parse with a TypeError, as the Dart cast does', () => {
  expect(() =>
    parseDevice(freshHub({ archived_date: '2026-10-21T07:00:00Z' })),
  ).toThrow(TypeError);
});

test('a failed parse caches nothing', () => {
  const json = freshHub({ added_date: 'bad' });
  expect(() => parseDevice(json)).toThrow();
  expect(devicePersistor.hasObj(json.id as number)).toBe(false);
});

test('remove lets go of the model and its notifications', () => {
  const device = parseDevice(freshHub());
  const persistorListener = jest.fn();
  devicePersistor.addListener(persistorListener);
  expect(devicePersistor.remove(device).succeeded).toBe(true);
  expect(persistorListener).toHaveBeenCalledTimes(1);
  device.triggerFrontEndRebuild();
  expect(persistorListener).toHaveBeenCalledTimes(1);
  expect(devicePersistor.remove(device).failed).toBe(true);
  devicePersistor.removeListener(persistorListener);
});
