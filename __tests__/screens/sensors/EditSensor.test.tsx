// Ported from frontend/test/screens/sensors/edit_sensor_test.dart, with the RN-only checks of what
// Rename Sensor shows, what it sends to Node, and the ways back.
//
// The Flutter test: Troy's 9/22 checklist, row 5. A renamed sensor still showed its old name:
// Submit navigated without waiting for the rename, and the sensor screen's arrival read could reach
// the server first and bring the old name back.

import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';

import { parseDevice } from '../../../src/models/device';
import { parseSensor } from '../../../src/models/sensor';
import { EditSensor } from '../../../src/screens/sensors/EditSensor';
import { GoToSpecificSensorScreenEvent } from '../../../src/state/devices/devicesBloc';
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

test('Submit waits for the rename before leaving', async () => {
  let finishRename: () => void = () => {};
  let sentBody: Record<string, string> | undefined;
  const sensor = parseSensor(sensorJson({ name: 'Front Gate' }));
  await show(
    <EditSensor
      device={parseDevice(freshHub())}
      sensor={sensor}
      save={async ({ body }) => {
        sentBody = body;
        await new Promise<void>(resolve => {
          finishRename = resolve;
        });
      }}
    />,
  );

  await fireEvent.changeText(screen.getByTestId('sensorName'), 'Back Gate');
  await fireEvent.press(screen.getByText('Submit'));
  await advance(16);

  expect(sentBody).toEqual({ name: 'Back Gate' });
  // Leaving now would let the sensor screen read the old name.
  expect(devicesBloc.add).not.toHaveBeenCalled();
  // The rename has not landed.
  expect(sensor.name).toBe('Front Gate');

  await act(async () => finishRename());
  await advance(16);

  const arrival = onlyEvent();
  expect(arrival).toBeInstanceOf(GoToSpecificSensorScreenEvent);
  // The sensor screen opens on this instance, and keeps it if its re-read fails.
  expect(arrival.sensor).toBe(sensor);
  expect(arrival.sensor.name).toBe('Back Gate');
});

test('the header, the prompt, the field with the sensor name, and Submit', async () => {
  await show(
    <EditSensor
      device={parseDevice(freshHub())}
      sensor={parseSensor(sensorJson({ name: 'Driveway' }))}
    />,
  );
  expect(screen.getByText('Rename Sensor')).toBeTruthy();
  expect(screen.getByText('Enter Your Sensor Name.')).toBeTruthy();
  expect(screen.getByTestId('sensorName').props.value).toBe('Driveway');
  expect(glyph(0xf7c0)).toBeTruthy();
});

test('Submit sends PATCH /sensors/{id}/ name=… to Node', async () => {
  const json = sensorJson();
  const { requests } = serve({
    [`PATCH /sensors/${json.id}/`]: { status: 200, body: json },
  });
  await show(
    <EditSensor device={parseDevice(freshHub())} sensor={parseSensor(json)} />,
  );
  await fireEvent.changeText(screen.getByTestId('sensorName'), 'Back Door');
  await fireEvent.press(screen.getByText('Submit'));
  await advance(400);
  expect(sent(requests)).toEqual([`PATCH /sensors/${json.id}/`]);
  expect(requests.find(r => r.method === 'PATCH')!.body).toBe('name=Back+Door');
  expect(onlyEvent()).toBeInstanceOf(GoToSpecificSensorScreenEvent);
});

test('a refused rename shows nothing and stays (Q27)', async () => {
  const json = sensorJson({ name: 'Kept' });
  serve({ [`PATCH /sensors/${json.id}/`]: { status: 400, body: {} } });
  const sensor = parseSensor(json);
  await show(<EditSensor device={parseDevice(freshHub())} sensor={sensor} />);
  await fireEvent.press(screen.getByText('Submit'));
  await advance(400);
  expect(devicesBloc.add).not.toHaveBeenCalled();
  expect(sensor.name).toBe('Kept');
  expect(screen.getByText('Enter Your Sensor Name.')).toBeTruthy();
});

test('← and Android Back go back to the sensor without saving', async () => {
  const sensor = parseSensor(sensorJson());
  const device = parseDevice(freshHub());
  const { requests } = serve();
  await show(<EditSensor device={device} sensor={sensor} />);
  await fireEvent.press(glyph(0xf177));
  let event = onlyEvent();
  expect(event).toBeInstanceOf(GoToSpecificSensorScreenEvent);
  expect([event.device, event.sensor]).toEqual([device, sensor]);
  devicesBloc.add.mockClear();
  await pressBack();
  event = onlyEvent();
  expect(event).toBeInstanceOf(GoToSpecificSensorScreenEvent);
  expect(sent(requests)).toEqual([]);
});
