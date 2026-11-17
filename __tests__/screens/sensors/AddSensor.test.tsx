// Add Sensor (spec 13 §7, features/17): the name step (with Flutter's 32-character counter), the
// "Prepare to add" step, and the search: the hub checked, pairing mode on, the sensor list read
// every second until it grows, the new sensor renamed, pairing mode off at every end but Android
// Back (Q11), and the counter.

import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';

import { Device, parseDevice } from '../../../src/models/device';
import * as deviceRequests from '../../../src/services/requests/deviceRequests';
import { parseSensor } from '../../../src/models/sensor';
import {
  AddSensor,
  AddSensorData,
} from '../../../src/screens/sensors/addSensor/AddSensor';
import { RemoveCaseForAddSensor } from '../../../src/screens/sensors/addSensor/RemoveCaseForAddSensor';
import { SensorConnectScreen } from '../../../src/screens/sensors/addSensor/SensorConnectScreen';
import {
  GoToIsRemovingCaseForAddSensor,
  GoToSensorConnectScreen,
  GoToSensorsScreenEvent,
} from '../../../src/state/devices/devicesBloc';
import {
  advance,
  devicesBloc,
  freshHub,
  glyph,
  installSensorScreenHooks,
  onlyEvent,
  pressBack,
  sensorJson,
  sent,
  serve,
  show,
} from '../../helpers/sensorScreens';

installSensorScreenHooks();

const ARROW_LEFT = 0xf177;
const XMARK = 0xf00d;

describe('step 1: the name', () => {
  test('the title, the field with its hint and a 0/32 counter, and Continue', async () => {
    const json = freshHub();
    serve({ [`GET /devices/${json.id}/`]: { status: 200, body: json } });
    await show(<AddSensor device={parseDevice(json)} />);
    expect(screen.getByText('Add a sensor')).toBeTruthy();
    expect(screen.getByText('Name of sensor')).toBeTruthy();
    expect(screen.getByTestId('text-field-counter').props.children).toBe(
      '0/32',
    );
    expect(screen.getByTestId('sensorName').props.maxLength).toBe(32);
    await fireEvent.changeText(screen.getByTestId('sensorName'), 'Back Door');
    expect(screen.getByTestId('text-field-counter').props.children).toBe(
      '9/32',
    );
  });

  test('on opening, the hub is fetched and its sensors noted; Continue hands them on with the name', async () => {
    const existing = sensorJson();
    const json = freshHub({ device: { sensors: [existing] } });
    const { requests } = serve({
      [`POST /devices/${json.id}/message/get_health/`]: { status: 202 },
      [`GET /devices/${json.id}/`]: { status: 200, body: json },
    });
    const device = parseDevice(json);
    await show(<AddSensor device={device} />);
    await advance(400);
    expect(sent(requests)).toEqual([
      `POST /devices/${json.id}/message/get_health/`,
      `GET /devices/${json.id}/`,
    ]);
    await fireEvent.changeText(screen.getByTestId('sensorName'), 'Back Door');
    await fireEvent.press(screen.getByText('Continue'));
    const event = onlyEvent();
    expect(event).toBeInstanceOf(GoToIsRemovingCaseForAddSensor);
    expect(event.data.intendedSensorName).toBe('Back Door');
    expect(event.data.oldSensors).toEqual([device.device.sensors[0]]);
  });

  test('Continue before the fetch lands hands on the list that fills in later (Q10)', async () => {
    const json = freshHub({ device: { sensors: [sensorJson()] } });
    let land: (device: Device) => void = () => {};
    jest.spyOn(deviceRequests, 'setDevice').mockReturnValue(
      new Promise<Device>(resolve => {
        land = resolve;
      }),
    );
    const device = parseDevice(json);
    await show(<AddSensor device={device} />);
    await fireEvent.press(screen.getByText('Continue'));
    const event = onlyEvent();
    expect(event.data.intendedSensorName).toBe('');
    expect(event.data.oldSensors).toHaveLength(0);
    await act(async () => land(device));
    expect(event.data.oldSensors).toEqual([device.device.sensors[0]]);
  });

  test('← and Android Back go to the Sensors list', async () => {
    const json = freshHub();
    serve({ [`GET /devices/${json.id}/`]: { status: 200, body: json } });
    await show(<AddSensor device={parseDevice(json)} />);
    await fireEvent.press(glyph(ARROW_LEFT));
    expect(onlyEvent()).toBeInstanceOf(GoToSensorsScreenEvent);
    devicesBloc.add.mockClear();
    await pressBack();
    expect(onlyEvent()).toBeInstanceOf(GoToSensorsScreenEvent);
  });
});

describe('step 2: Prepare to add', () => {
  test('the instructions; "I see the red button!" goes on to the search with the same data', async () => {
    const data = new AddSensorData([], 'Gate');
    await show(
      <RemoveCaseForAddSensor device={parseDevice(freshHub())} data={data} />,
    );
    expect(screen.getByText('Prepare to add')).toBeTruthy();
    expect(
      screen.getByText(
        "Remove the top of the sensor's case. \n\nFind the red button. (Don't press it yet.)",
      ),
    ).toBeTruthy();
    await fireEvent.press(screen.getByText('I see the red button!'));
    const event = onlyEvent();
    expect(event).toBeInstanceOf(GoToSensorConnectScreen);
    expect(event.data).toBe(data);
  });

  test('✗, ← and Android Back go to the Sensors list', async () => {
    await show(
      <RemoveCaseForAddSensor
        device={parseDevice(freshHub())}
        data={new AddSensorData([], '')}
      />,
    );
    for (const press of [
      () => fireEvent.press(glyph(XMARK)),
      () => fireEvent.press(glyph(ARROW_LEFT)),
      pressBack,
    ]) {
      devicesBloc.add.mockClear();
      await press();
      expect(onlyEvent()).toBeInstanceOf(GoToSensorsScreenEvent);
    }
  });
});

describe('step 3: the search', () => {
  const PAIRING = (id: number) =>
    `POST /devices/${id}/message/set_pairing_mode/`;

  /**
   * Node with the pairing-mode route and a rename; the hub (connected until setConnected says
   * otherwise) and its sensor list (whatever `sensors` returns at the time) answered live.
   */
  function node(
    json: ReturnType<typeof freshHub>,
    sensors: () => unknown[],
    renameId?: number,
  ) {
    let connected = true;
    const server = serve({
      [PAIRING(json.id as number)]: { status: 202 },
      ...(renameId === undefined
        ? {}
        : { [`PATCH /sensors/${renameId}/`]: { status: 200, body: {} } }),
    });
    const plain = server.fetchMock.getMockImplementation()!;
    const live: Record<string, () => unknown> = {
      [`/devices/${json.id}/`]: () => ({
        ...json,
        device: { ...json.device, is_connected: connected },
      }),
      [`/devices/${json.id}/sensors`]: sensors,
    };
    server.fetchMock.mockImplementation(
      async (url: string, init?: RequestInit) => {
        const path = new URL(url).pathname;
        const method = (init?.method ?? 'GET').toUpperCase();
        if (method === 'GET' && live[path]) {
          server.requests.push({ method, path, headers: {}, body: undefined });
          const text = JSON.stringify(live[path]());
          return { status: 200, text: async () => text } as unknown as Response;
        }
        return plain(url, init);
      },
    );
    return {
      ...server,
      setConnected: (value: boolean) => {
        connected = value;
      },
    };
  }

  test('a hub that is not connected fails at once, without pairing mode', async () => {
    const json = freshHub();
    const { requests } = serve({
      [`GET /devices/${json.id}/`]: { status: 200, body: json },
    });
    await show(
      <SensorConnectScreen
        device={parseDevice(json)}
        data={new AddSensorData([], 'Gate')}
      />,
    );
    await advance(400);
    expect(
      screen.getByText(
        'Hub is not connected. Reconnect it, wait 15 seconds, and then try again.',
      ),
    ).toBeTruthy();
    // stop() turns pairing mode off even here.
    expect(
      requests
        .filter(r => r.path.endsWith('set_pairing_mode/'))
        .map(r => r.body),
    ).toEqual(['is_enabled=False']);
  });

  test('searching: pairing mode on, the counter going down, the list read each second', async () => {
    const json = freshHub();
    const { requests } = node(json, () => []);
    await show(
      <SensorConnectScreen
        device={parseDevice(json)}
        data={new AddSensorData([], 'Gate')}
      />,
    );
    await advance(400);
    expect(
      screen.getByText('Press and release the red button for 1 second'),
    ).toBeTruthy();
    expect(screen.getByTestId('spin-kit-pulse')).toBeTruthy();
    expect(screen.getByText('Searching for sensor... 59')).toBeTruthy();
    await advance(2000);
    expect(screen.getByText('Searching for sensor... 57')).toBeTruthy();
    expect(
      requests
        .filter(r => r.path.endsWith('set_pairing_mode/'))
        .map(r => r.body),
    ).toEqual(['is_enabled=True']);
    expect(
      requests.filter(r => r.path === `/devices/${json.id}/sensors`).length,
    ).toBe(3);
  });

  test('a new sensor: success, pairing mode off, and the new one renamed', async () => {
    const json = freshHub();
    const old = parseSensor(sensorJson());
    const fresh = sensorJson({ name: 'Sim Hub - Sensor #2' });
    let list: unknown[] = [{ ...sensorJson(), id: old.id }];
    const { requests } = node(json, () => list, fresh.id as number);
    await show(
      <SensorConnectScreen
        device={parseDevice(json)}
        data={new AddSensorData([old], 'Back Door')}
      />,
    );
    await advance(1500);
    list = [{ ...sensorJson(), id: old.id }, fresh];
    await advance(1000);
    expect(
      screen.getByText('The sensor has successfully connected to the Hub.'),
    ).toBeTruthy();
    const patches = requests.filter(r => r.method === 'PATCH');
    expect(patches[0].path).toBe(`/sensors/${fresh.id}/`);
    expect(patches[0].body).toBe('name=Back+Door');
    expect(
      requests
        .filter(r => r.path.endsWith('set_pairing_mode/'))
        .map(r => r.body),
    ).toContain('is_enabled=False');
    devicesBloc.add.mockClear();
    await fireEvent.press(screen.getByText('Continue'));
    expect(onlyEvent()).toBeInstanceOf(GoToSensorsScreenEvent);
  });

  test('the hub going offline mid-search fails with the hub message', async () => {
    const json = freshHub();
    const server = node(json, () => []);
    await show(
      <SensorConnectScreen
        device={parseDevice(json)}
        data={new AddSensorData([], 'Gate')}
      />,
    );
    await advance(1500);
    server.setConnected(false);
    await advance(1000);
    expect(
      screen.getByText(
        'Hub is not connected. Reconnect it, wait 15 seconds, and then try again.',
      ),
    ).toBeTruthy();
  });

  test('at 0 the search fails with the generic message; Return goes to the Sensors list', async () => {
    const json = freshHub();
    node(json, () => []);
    await show(
      <SensorConnectScreen
        device={parseDevice(json)}
        data={new AddSensorData([], 'Gate')}
      />,
    );
    await advance(62_000);
    expect(
      screen.getByText(
        'The sensor was unable to connect to the Hub. Please try again. If the problem persists, please contact support.',
      ),
    ).toBeTruthy();
    devicesBloc.add.mockClear();
    await fireEvent.press(screen.getByText('Return'));
    expect(onlyEvent()).toBeInstanceOf(GoToSensorsScreenEvent);
  });

  test('Cancel stops, turns pairing mode off and goes to the Sensors list', async () => {
    const json = freshHub();
    const { requests } = node(json, () => []);
    await show(
      <SensorConnectScreen
        device={parseDevice(json)}
        data={new AddSensorData([], 'Gate')}
      />,
    );
    await advance(1500);
    await fireEvent.press(screen.getByText('Cancel'));
    await advance(400);
    expect(
      requests
        .filter(r => r.path.endsWith('set_pairing_mode/'))
        .map(r => r.body),
    ).toEqual(['is_enabled=True', 'is_enabled=False']);
    expect(onlyEvent()).toBeInstanceOf(GoToSensorsScreenEvent);
  });

  test('Android Back goes to the Sensors list without turning pairing mode off (Q11)', async () => {
    const json = freshHub();
    const { requests } = node(json, () => []);
    await show(
      <SensorConnectScreen
        device={parseDevice(json)}
        data={new AddSensorData([], 'Gate')}
      />,
    );
    await advance(1500);
    await pressBack();
    expect(onlyEvent()).toBeInstanceOf(GoToSensorsScreenEvent);
    expect(
      requests
        .filter(r => r.path.endsWith('set_pairing_mode/'))
        .map(r => r.body),
    ).toEqual(['is_enabled=True']);
  });
});
