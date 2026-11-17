// The DevicesBloc's sensor events (bloc/devices/events/go_to_sensors_screen_event.dart and the
// other sensor ones; spec 06 §5, spec 13): what each shows, what it re-reads from Node, and which
// states are poppable, as Flutter's state.dart declares them.

import * as Keychain from 'react-native-keychain';

import { parseDevice } from '../../src/models/device';
import { parseSensor } from '../../src/models/sensor';
import { AddSensorData } from '../../src/screens/sensors/addSensor/AddSensor';
import { AuthRequestManager } from '../../src/services/requests/authRequests';
import { SecureStorage } from '../../src/services/secureStorage';
import { AuthBloc } from '../../src/state/auth/authBloc';
import {
  DevicesBloc,
  DevicesState,
  GoToAddSensorStart,
  GoToEditSensorLocationScreen,
  GoToEditSensorScreen,
  GoToIsRemovingCaseForAddSensor,
  GoToSensorConnectScreen,
  GoToSensorsScreenEvent,
  GoToSpecificSensorAboutScreen,
  GoToSpecificSensorScreenEvent,
  IsAddingASensorName,
  IsEditingSensorCoordinatesState,
  IsOnEditSensorScreenState,
  IsOnSensorAboutScreenState,
  IsOnSensorConnectScreen,
  IsOnSensorsScreenState,
  IsOnSpecificSensorScreenState,
  IsRemovingCaseForAddSensor,
} from '../../src/state/devices/devicesBloc';
import { RefreshState } from '../../src/state/genericBloc';
import { MainAppBloc } from '../../src/state/mainApp/mainAppBloc';
import { flush, installFakeServer } from '../helpers/fakeServer';
import { hubJson } from '../helpers/hubJson';

const sensor = {
  id: 9100,
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
const hub = hubJson({ id: 9101, device: { sensors: [sensor] } });

const keychain = (Keychain as unknown as { __store: Map<string, unknown> })
  .__store;

let mainAppBloc: MainAppBloc;
let requests: { method: string; path: string }[];

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
  }));
});

afterEach(() => jest.restoreAllMocks());

function record(bloc: DevicesBloc) {
  const states: DevicesState[] = [bloc.state];
  bloc.subscribe(() => states.push(bloc.state));
  return states;
}

async function settle() {
  for (let i = 0; i < 20; i++) {
    await flush();
  }
}

async function ready() {
  const bloc = new DevicesBloc(mainAppBloc, [parseDevice(hub)]);
  await settle();
  requests.length = 0;
  return { bloc, states: record(bloc) };
}

const refreshes = <S extends { refresh: RefreshState }>(
  states: DevicesState[],
  type: new (...args: never[]) => S,
) =>
  states.filter(s => s instanceof type).map(s => (s as unknown as S).refresh);

const paths = () =>
  requests
    .filter(
      r => r.path !== '/maintenance-mode/' && r.path !== '/auth/jwt/verify',
    )
    .map(r => `${r.method} ${r.path}`);

test('GoToSensorsScreenEvent: the list at once, then again once the hub is fetched (poppable)', async () => {
  const { bloc, states } = await ready();
  bloc.add(new GoToSensorsScreenEvent(parseDevice(hub)));
  await settle();
  expect(refreshes(states, IsOnSensorsScreenState)).toEqual([
    RefreshState.checking,
    RefreshState.ready,
  ]);
  expect(paths()).toEqual([
    `POST /devices/${hub.id}/message/get_health/`,
    `GET /devices/${hub.id}/`,
  ]);
  expect(bloc.state.isPoppable).toBe(true);
});

test('GoToSpecificSensorScreenEvent: the page at once, then again once the sensor is fetched', async () => {
  const { bloc, states } = await ready();
  const device = parseDevice(hub);
  bloc.add(new GoToSpecificSensorScreenEvent(device, device.device.sensors[0]));
  await settle();
  expect(refreshes(states, IsOnSpecificSensorScreenState)).toEqual([
    RefreshState.checking,
    RefreshState.ready,
  ]);
  expect(paths()).toEqual([`GET /sensors/${sensor.id}/`]);
  expect(bloc.state.isPoppable).toBe(true);
});

test('GoToSpecificSensorAboutScreen: re-reads the hub and the sensor side by side', async () => {
  const { bloc, states } = await ready();
  const device = parseDevice(hub);
  bloc.add(new GoToSpecificSensorAboutScreen(device, device.device.sensors[0]));
  await settle();
  expect(refreshes(states, IsOnSensorAboutScreenState)).toEqual([
    RefreshState.checking,
    RefreshState.ready,
  ]);
  expect(paths().sort()).toEqual(
    [
      `GET /devices/${hub.id}/`,
      `GET /sensors/${sensor.id}/`,
      `POST /devices/${hub.id}/message/get_health/`,
    ].sort(),
  );
});

test('the editors show at once from what is in hand, with no request, and are not poppable', async () => {
  const { bloc } = await ready();
  const device = parseDevice(hub);
  const s = parseSensor(sensor);
  for (const [event, type] of [
    [new GoToEditSensorScreen(device, s), IsOnEditSensorScreenState],
    [
      new GoToEditSensorLocationScreen(device, s),
      IsEditingSensorCoordinatesState,
    ],
  ] as const) {
    bloc.add(event);
    await settle();
    expect(bloc.state).toBeInstanceOf(type);
    expect(bloc.state.isPoppable).toBe(false);
  }
  expect(paths()).toEqual([]);
});

test('Add Sensor’s three steps carry the hub and the data, none poppable', async () => {
  const { bloc } = await ready();
  const device = parseDevice(hub);
  const data = new AddSensorData([], 'Gate');
  bloc.add(new GoToAddSensorStart(device));
  await settle();
  expect(bloc.state).toBeInstanceOf(IsAddingASensorName);
  expect(bloc.state.isPoppable).toBe(false);
  bloc.add(new GoToIsRemovingCaseForAddSensor(device, data));
  await settle();
  expect(bloc.state).toBeInstanceOf(IsRemovingCaseForAddSensor);
  expect((bloc.state as IsRemovingCaseForAddSensor).data).toBe(data);
  expect(bloc.state.isPoppable).toBe(false);
  bloc.add(new GoToSensorConnectScreen(device, data));
  await settle();
  expect(bloc.state).toBeInstanceOf(IsOnSensorConnectScreen);
  expect(bloc.state.isPoppable).toBe(false);
  expect(paths()).toEqual([]);
});
