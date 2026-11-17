// The three history navigation events (bloc/main_app/events/go_to_event_history_screen.dart,
// bloc/devices/events/go_to_specific_device_history_event.dart, go_to_sensor_history_event.dart;
// spec 06, spec 12): the screen at once with an empty Event (`checking`), then the first page;
// the sensor's re-read alongside; a user who has moved on is not pulled back; all poppable.

import * as Keychain from 'react-native-keychain';

import { parseDevice } from '../../src/models/device';
import { AuthRequestManager } from '../../src/services/requests/authRequests';
import { SecureStorage } from '../../src/services/secureStorage';
import { AuthBloc } from '../../src/state/auth/authBloc';
import {
  DevicesBloc,
  DevicesState,
  GoToSensorHistoryEvent,
  GoToSpecificDeviceEvent,
  GoToSpecificDeviceHistoryEvent,
  IsOnSpecificDeviceHistoryScreenState,
  IsOnSpecificSensorHistoryScreenState,
  IsShowingADeviceState,
} from '../../src/state/devices/devicesBloc';
import { RefreshState } from '../../src/state/genericBloc';
import {
  GoToEventHistoryScreen,
  IsOnEventHistoryScreenState,
  MainAppBloc,
  MainAppState,
} from '../../src/state/mainApp/mainAppBloc';
import { flush, installFakeServer } from '../helpers/fakeServer';
import { hubJson } from '../helpers/hubJson';

const sensor = {
  id: 9200,
  sensor_id: '0xc1230001',
  name: 'Front Door',
  longitude: null,
  latitude: null,
  has_low_battery: false,
  is_active: true,
  should_send_notification: true,
  connection_date: '2026-11-12T06:46:14.273000-06:00',
  disconnection_date: null,
  fw_version: 211,
  sensor_type: 'PUCK',
  is_blacklisted: false,
};
const hub = hubJson({ id: 9201, device: { sensors: [sensor] } });
const activation = {
  id: 9202,
  device: 31,
  device_name: 'Front Door',
  sensor: sensor.id,
  event_type: 'AV',
  sensor_name: 'Front Door',
  time: '2026-10-21T07:00:00.123456-05:00',
  location: 'Home',
  address: '1 Lane',
  group: null,
  added_date: '2026-10-21T11:00:00Z',
};
const page = { count: 1, next: null, previous: null, results: [activation] };

const keychain = (Keychain as unknown as { __store: Map<string, unknown> })
  .__store;

let mainAppBloc: MainAppBloc;
let requests: { method: string; path: string }[];

async function settle() {
  for (let i = 0; i < 20; i++) {
    await flush();
  }
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
  ({ requests } = installFakeServer({
    'GET /maintenance-mode/': { status: 200 },
    'POST /auth/jwt/verify': { status: 200 },
    'GET /devices/': { status: 200, body: [hub] },
    [`POST /devices/${hub.id}/message/get_health/`]: { status: 202 },
    [`GET /devices/${hub.id}/`]: { status: 200, body: hub },
    [`GET /sensors/${sensor.id}/`]: { status: 200, body: sensor },
    'GET /activations': { status: 200, body: page },
    [`GET /devices/${hub.id}/activations`]: { status: 200, body: page },
    [`GET /sensors/${sensor.id}/activations/`]: { status: 200, body: page },
  }));
  await settle();
});

afterEach(() => jest.restoreAllMocks());

const paths = () =>
  requests
    .filter(
      r => r.path !== '/maintenance-mode/' && r.path !== '/auth/jwt/verify',
    )
    .map(r => `${r.method} ${r.path}`);

function record<S>(bloc: { state: S; subscribe(l: () => void): unknown }) {
  const states: S[] = [bloc.state];
  bloc.subscribe(() => states.push(bloc.state));
  return states;
}

async function devicesBloc() {
  const bloc = new DevicesBloc(mainAppBloc, [parseDevice(hub)]);
  await settle();
  requests.length = 0;
  return { bloc, states: record<DevicesState>(bloc) };
}

test('GoToEventHistoryScreen: an empty Event (checking), then the first page; poppable', async () => {
  requests.length = 0;
  const states = record<MainAppState>(mainAppBloc);
  mainAppBloc.add(new GoToEventHistoryScreen());
  await settle();
  const shown = states.filter(
    s => s instanceof IsOnEventHistoryScreenState,
  ) as IsOnEventHistoryScreenState[];
  expect(shown.map(s => s.refresh)).toEqual([
    RefreshState.checking,
    RefreshState.ready,
  ]);
  expect(shown[0].event.results).toBeNull();
  expect(shown[1].event.results!.map(r => r.id)).toEqual([activation.id]);
  expect(paths()).toEqual(['GET /activations']);
  expect(mainAppBloc.state.isPoppable).toBe(true);
});

test('GoToSpecificDeviceHistoryEvent: checking, then the hub’s first page', async () => {
  const { bloc, states } = await devicesBloc();
  bloc.add(new GoToSpecificDeviceHistoryEvent(parseDevice(hub)));
  await settle();
  const shown = states.filter(
    s => s instanceof IsOnSpecificDeviceHistoryScreenState,
  ) as IsOnSpecificDeviceHistoryScreenState[];
  expect(shown.map(s => s.refresh)).toEqual([
    RefreshState.checking,
    RefreshState.ready,
  ]);
  expect(shown[1].event.count).toBe(1);
  expect(paths()).toEqual([`GET /devices/${hub.id}/activations`]);
  expect(bloc.state.isPoppable).toBe(true);
});

test('GoToSensorHistoryEvent: checking, then the sensor re-read and its first page, side by side', async () => {
  const { bloc, states } = await devicesBloc();
  const device = parseDevice(hub);
  bloc.add(new GoToSensorHistoryEvent(device, device.device.sensors[0]));
  await settle();
  const shown = states.filter(
    s => s instanceof IsOnSpecificSensorHistoryScreenState,
  ) as IsOnSpecificSensorHistoryScreenState[];
  expect(shown.map(s => s.refresh)).toEqual([
    RefreshState.checking,
    RefreshState.ready,
  ]);
  expect(paths().sort()).toEqual(
    [
      `GET /sensors/${sensor.id}/`,
      `GET /sensors/${sensor.id}/activations/`,
    ].sort(),
  );
  expect(bloc.state.isPoppable).toBe(true);
});

test('leaving before the page lands is respected', async () => {
  const { bloc, states } = await devicesBloc();
  const device = parseDevice(hub);
  bloc.add(new GoToSpecificDeviceHistoryEvent(device));
  bloc.add(new GoToSpecificDeviceEvent(device));
  await settle();
  expect(
    states.filter(s => s instanceof IsOnSpecificDeviceHistoryScreenState),
  ).toHaveLength(1);
  expect(bloc.state).toBeInstanceOf(IsShowingADeviceState);
});
