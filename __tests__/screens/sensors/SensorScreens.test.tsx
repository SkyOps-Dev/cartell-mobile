// The sensor screens (spec 13 §1–§6; features/16, 18, 19): the Sensors list, a sensor's page, its
// About page and Edit Coordinates. What each shows, what it sends to Node, and where each control
// and the ways back lead.

import React from 'react';
import { Linking, NativeModules, Platform } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import { parseDevice } from '../../../src/models/device';
import { parseSensor } from '../../../src/models/sensor';
import { EditCoordinates } from '../../../src/screens/sensors/EditCoordinates';
import { SensorMeta } from '../../../src/screens/sensors/SensorMeta';
import { SensorsScreen } from '../../../src/screens/sensors/SensorsScreen';
import { SensorView } from '../../../src/screens/sensors/SensorView';
import {
  GoToAddSensorStart,
  GoToEditSensorLocationScreen,
  GoToEditSensorScreen,
  GoToSensorHistoryEvent,
  GoToSensorsScreenEvent,
  GoToSpecificDeviceEvent,
  GoToSpecificSensorAboutScreen,
  GoToSpecificSensorScreenEvent,
} from '../../../src/state/devices/devicesBloc';
import { RefreshState } from '../../../src/state/genericBloc';
import { kCartellLightGray, MaterialColors } from '../../../src/theme/colors';
import {
  advance,
  devicesBloc,
  freshHub,
  glyph,
  glyphColour,
  installSensorScreenHooks,
  onlyEvent,
  openMenu,
  pressBack,
  queryGlyph,
  sensorJson,
  sent,
  serve,
  show,
  tapSwitch,
} from '../../helpers/sensorScreens';

installSensorScreenHooks();

const ARROW_LEFT = 0xf177;
const XMARK = 0xf00d;
const BATTERY_FULL = 0xf240;
const BATTERY_EMPTY = 0xf244;
const PLUS = 0x2b;

describe('the Sensors list', () => {
  test('no sensors: the title, the empty card and its two lines', async () => {
    await show(<SensorsScreen device={parseDevice(freshHub())} />);
    expect(screen.getByText('Sensors')).toBeTruthy();
    expect(
      screen.getByText('View existing Sensors or add a Sensor'),
    ).toBeTruthy();
    expect(screen.getByText('No Sensors have been added.')).toBeTruthy();
    expect(
      screen.getByText('Press the plus button below to get started.'),
    ).toBeTruthy();
  });

  test('each sensor is a card with its name; the onboard one is labelled', async () => {
    const device = parseDevice(
      freshHub({
        device: {
          sensors: [
            sensorJson({ name: 'Probe', sensor_type: 'ON' }),
            sensorJson({ name: 'Driveway' }),
          ],
        },
      }),
    );
    await show(<SensorsScreen device={device} />);
    expect(screen.getByText('Probe')).toBeTruthy();
    expect(screen.getByText('Driveway')).toBeTruthy();
    expect(screen.getAllByText('Onboard Sensor')).toHaveLength(1);
    expect(screen.queryByText('No Sensors have been added.')).toBeNull();
  });

  test('tapping a card opens that sensor', async () => {
    const device = parseDevice(
      freshHub({ device: { sensors: [sensorJson({ name: 'Driveway' })] } }),
    );
    await show(<SensorsScreen device={device} />);
    await fireEvent.press(screen.getByText('Driveway'));
    const event = onlyEvent();
    expect(event).toBeInstanceOf(GoToSpecificSensorScreenEvent);
    expect(event.device).toBe(device);
    expect(event.sensor).toBe(device.device.sensors[0]);
  });

  test('+ and ⋮ → Pair Sensor start Add Sensor', async () => {
    const device = parseDevice(freshHub());
    await show(<SensorsScreen device={device} />);
    await fireEvent.press(glyph(PLUS));
    expect(onlyEvent()).toBeInstanceOf(GoToAddSensorStart);
    devicesBloc.add.mockClear();
    await openMenu();
    await fireEvent.press(screen.getByText('Pair Sensor'));
    await advance(400);
    const event = onlyEvent();
    expect(event).toBeInstanceOf(GoToAddSensorStart);
    expect(event.device).toBe(device);
  });

  test('← and Android Back go to the hub', async () => {
    const device = parseDevice(freshHub());
    await show(<SensorsScreen device={device} />);
    await fireEvent.press(glyph(ARROW_LEFT));
    expect(onlyEvent()).toBeInstanceOf(GoToSpecificDeviceEvent);
    devicesBloc.add.mockClear();
    await pressBack();
    const event = onlyEvent();
    expect(event).toBeInstanceOf(GoToSpecificDeviceEvent);
    expect(event.device).toBe(device);
  });
});

describe('a sensor’s page', () => {
  function page(
    json = sensorJson(),
    refresh: RefreshState = RefreshState.ready,
  ) {
    const device = parseDevice(freshHub());
    const sensor = parseSensor(json);
    return {
      device,
      sensor,
      element: (
        <SensorView
          device={device}
          sensor={sensor}
          isOnboardSensor={sensor.isOnboardSensor()}
          refresh={refresh}
        />
      ),
    };
  }

  test('while it is re-read: no battery icon, and "Checking..." in gravel', async () => {
    await show(page(sensorJson(), RefreshState.checking).element);
    expect(queryGlyph(BATTERY_FULL)).toBeNull();
    const text = screen.getByText('Battery Status: Checking...');
    expect(
      (text.props.style as object[]).some(
        s => (s as { color?: string })?.color === kCartellLightGray,
      ),
    ).toBe(true);
  });

  test('a good battery: a full battery in green accent', async () => {
    await show(page(sensorJson({ has_low_battery: false })).element);
    expect(screen.getByText('Battery Status: Good')).toBeTruthy();
    expect(glyphColour(BATTERY_FULL)).toBe(MaterialColors.greenAccent);
  });

  test('a low battery: an empty battery in red accent', async () => {
    await show(page(sensorJson({ has_low_battery: true })).element);
    expect(screen.getByText('Battery Status: Low')).toBeTruthy();
    expect(glyphColour(BATTERY_EMPTY)).toBe(MaterialColors.redAccent);
  });

  test('the name, "Last Updated", the three buttons; no banner, no Pair Sounder', async () => {
    await show(page(sensorJson({ name: 'Driveway' })).element);
    expect(screen.getByText('Driveway')).toBeTruthy();
    expect(screen.getByText('Last Updated:')).toBeTruthy();
    expect(screen.getByText('11-12-2026 03:42 PM')).toBeTruthy();
    for (const label of ['Set Location', 'View History', 'About']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByText('Receive Sensor Notifications:')).toBeTruthy();
    expect(screen.queryByText(/flagged for suspicious activity/)).toBeNull();
    expect(screen.queryByText('Pair Sounder')).toBeNull();
  });

  test('the onboard sensor: no battery, and Pair Sounder', async () => {
    await show(page(sensorJson({ sensor_type: 'ON' })).element);
    expect(screen.queryByText(/Battery Status/)).toBeNull();
    expect(screen.getByText('Pair Sounder')).toBeTruthy();
  });

  test('a flagged sensor shows the banner; Contact Support is live and does nothing yet', async () => {
    await show(page(sensorJson({ is_blacklisted: true })).element);
    expect(screen.getByText(/flagged for suspicious activity/)).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Contact Support' }),
    );
    expect(devicesBloc.add).not.toHaveBeenCalled();
  });

  test('Find Sensor opens the maps app at the coordinates, labelled with the name', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const open = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined as never);
    await show(
      page(
        sensorJson({ name: 'Gate', latitude: '40.712776', longitude: '-74' }),
      ).element,
    );
    await fireEvent.press(screen.getByText('Find Sensor'));
    expect(open).toHaveBeenCalledWith('geo://ul?q=40.712776%2C-74.0%28Gate%29');
  });

  test('Find Sensor with a coordinate that is not a number shows "An error occurred."', async () => {
    // React Native's Jest preset already mocks openURL; forget the earlier tests' calls.
    const open = jest.spyOn(Linking, 'openURL');
    open.mockClear();
    await show(page(sensorJson({ latitude: 'north', longitude: '1' })).element);
    await fireEvent.press(screen.getByText('Find Sensor'));
    await advance(400);
    expect(screen.getByText('An error occurred.')).toBeTruthy();
    expect(open).not.toHaveBeenCalled();
  });

  test('Set Location, About and View History', async () => {
    const { device, sensor, element } = page();
    await show(element);
    await fireEvent.press(screen.getByText('Set Location'));
    expect(onlyEvent()).toBeInstanceOf(GoToEditSensorLocationScreen);
    devicesBloc.add.mockClear();
    await fireEvent.press(screen.getByText('About'));
    const about = onlyEvent();
    expect(about).toBeInstanceOf(GoToSpecificSensorAboutScreen);
    expect([about.device, about.sensor]).toEqual([device, sensor]);
    devicesBloc.add.mockClear();
    await fireEvent.press(screen.getByText('View History'));
    const history = onlyEvent();
    expect(history).toBeInstanceOf(GoToSensorHistoryEvent);
    expect([history.device, history.sensor]).toEqual([device, sensor]);
  });

  test('the switch saves on Node, toasts, and writes into the cached sensor', async () => {
    const json = sensorJson({ should_send_notification: true });
    const { requests } = serve({
      [`PATCH /sensors/${json.id}/`]: { status: 200, body: json },
    });
    const { sensor, element } = page(json);
    await show(element);
    await tapSwitch();
    expect(
      requests.filter(r => r.method === 'PATCH').map(r => [r.path, r.body]),
    ).toEqual([[`/sensors/${json.id}/`, 'should_send_notification=false']]);
    expect(screen.getByText('Notifications turned off.')).toBeTruthy();
    expect(sensor.shouldSendNotification).toBe(false);
  });

  test('a failed save flips the switch back and says so', async () => {
    const json = sensorJson({ should_send_notification: false });
    serve({ [`PATCH /sensors/${json.id}/`]: { status: 500 } });
    const { sensor, element } = page(json);
    await show(element);
    await tapSwitch();
    expect(screen.getByText('Notifications failed to turn on.')).toBeTruthy();
    expect(sensor.shouldSendNotification).toBe(false);
  });

  test('Pair Sounder messages the hub on Node and shows the banner for 4 s, whatever the answer', async () => {
    const { device, element } = page(sensorJson({ sensor_type: 'ON' }));
    const { requests } = serve({
      [`POST /devices/${device.id}/message/pair_to_sounder/`]: { status: 400 },
    });
    await show(element);
    await fireEvent.press(screen.getByText('Pair Sounder'));
    await advance(400);
    expect(sent(requests)).toEqual([
      `POST /devices/${device.id}/message/pair_to_sounder/`,
    ]);
    expect(screen.getByText('Sent pairing message successfully')).toBeTruthy();
    await advance(4000);
    expect(screen.queryByText('Sent pairing message successfully')).toBeNull();
  });

  test('Android Back closes the Pair Sounder banner and leaves the page where it is', async () => {
    const { device, element } = page(sensorJson({ sensor_type: 'ON' }));
    serve({
      [`POST /devices/${device.id}/message/pair_to_sounder/`]: { status: 202 },
    });
    await show(element);
    await fireEvent.press(screen.getByText('Pair Sounder'));
    await advance(400);
    await pressBack();
    await advance(400);
    expect(screen.queryByText('Sent pairing message successfully')).toBeNull();
    expect(devicesBloc.add).not.toHaveBeenCalled();
    // Its 4 s timer finds nothing on top to close (Flutter would pop its page: P38).
    await advance(4000);
    expect(screen.getByText('Pair Sounder')).toBeTruthy();
  });

  test('the ⋮ menu: Rename Sensor, Edit Coordinates, About', async () => {
    const { device, sensor, element } = page();
    await show(element);
    for (const [label, type] of [
      ['Rename Sensor', GoToEditSensorScreen],
      ['Edit Coordinates', GoToEditSensorLocationScreen],
      ['About', GoToSpecificSensorAboutScreen],
    ] as const) {
      devicesBloc.add.mockClear();
      await openMenu();
      expect(screen.getByText('Delete Sensor')).toBeTruthy();
      await fireEvent.press(screen.getAllByText(label).at(-1)!);
      await advance(400);
      expect(screen.queryByText('Delete Sensor')).toBeNull();
      const event = onlyEvent();
      expect(event).toBeInstanceOf(type);
      expect([event.device, event.sensor]).toEqual([device, sensor]);
    }
  });

  test('Delete Sensor: "Delete Sensor?", then DELETE on Node, the dialog closed and the Sensors list', async () => {
    const { device, sensor, element } = page();
    const { requests } = serve({
      [`DELETE /sensors/${sensor.id}/`]: { status: 204 },
    });
    await show(element);
    await openMenu();
    await fireEvent.press(screen.getByText('Delete Sensor'));
    await advance(400);
    expect(screen.getByText('Delete Sensor?')).toBeTruthy();
    expect(
      screen.getByText('Are you sure you want to delete this Sensor?'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByText('Delete'));
    await advance(400);
    expect(sent(requests)).toEqual([`DELETE /sensors/${sensor.id}/`]);
    expect(screen.queryByText('Delete Sensor?')).toBeNull();
    const event = onlyEvent();
    expect(event).toBeInstanceOf(GoToSensorsScreenEvent);
    expect(event.device).toBe(device);
  });

  test('a refused delete leaves the dialog up and shows nothing (Q27)', async () => {
    const { sensor, element } = page();
    serve({ [`DELETE /sensors/${sensor.id}/`]: { status: 500 } });
    await show(element);
    await openMenu();
    await fireEvent.press(screen.getByText('Delete Sensor'));
    await advance(400);
    await fireEvent.press(screen.getByText('Delete'));
    await advance(400);
    expect(screen.getByText('Delete Sensor?')).toBeTruthy();
    expect(devicesBloc.add).not.toHaveBeenCalled();
  });

  test('← and Android Back go to the Sensors list', async () => {
    const { device, element } = page();
    await show(element);
    await fireEvent.press(glyph(ARROW_LEFT));
    expect(onlyEvent()).toBeInstanceOf(GoToSensorsScreenEvent);
    devicesBloc.add.mockClear();
    await pressBack();
    const event = onlyEvent();
    expect(event).toBeInstanceOf(GoToSensorsScreenEvent);
    expect(event.device).toBe(device);
  });
});

describe('a sensor’s About', () => {
  test('the hub’s name, and the date paired in the server’s own clock time (Q43)', async () => {
    const device = parseDevice(freshHub({ name: 'Sim Hub' }));
    const sensor = parseSensor(
      sensorJson({
        name: 'Driveway',
        connection_date: '2026-11-12T06:46:14.273000-06:00',
      }),
    );
    await show(<SensorMeta device={device} sensor={sensor} />);
    expect(screen.getByText('Driveway')).toBeTruthy();
    expect(screen.getByText('Paired to Hub:')).toBeTruthy();
    expect(screen.getByText('Sim Hub')).toBeTruthy();
    expect(screen.getByText('Date Paired')).toBeTruthy();
    expect(screen.getByText('11-12-2026 12:46 PM')).toBeTruthy();
  });

  test('✗, ← and Android Back go to the sensor’s page', async () => {
    const device = parseDevice(freshHub());
    const sensor = parseSensor(sensorJson());
    await show(<SensorMeta device={device} sensor={sensor} />);
    for (const press of [
      () => fireEvent.press(glyph(XMARK)),
      () => fireEvent.press(glyph(ARROW_LEFT)),
      pressBack,
    ]) {
      devicesBloc.add.mockClear();
      await press();
      const event = onlyEvent();
      expect(event).toBeInstanceOf(GoToSpecificSensorScreenEvent);
      expect([event.device, event.sensor]).toEqual([device, sensor]);
    }
  });
});

describe('Edit Coordinates', () => {
  const geolocator = () => NativeModules.CartellGeolocator;

  function editor(json = sensorJson()) {
    const device = parseDevice(freshHub());
    const sensor = parseSensor(json);
    return {
      device,
      sensor,
      element: <EditCoordinates device={device} sensor={sensor} />,
    };
  }

  test('starts from the sensor’s coordinates, if it has both', async () => {
    await show(
      editor(sensorJson({ latitude: '40.712776', longitude: '-74.005974' }))
        .element,
    );
    expect(screen.getByTestId('latitude').props.value).toBe('40.712776');
    expect(screen.getByTestId('longitude').props.value).toBe('-74.005974');
    expect(screen.getByText('Enter Coordinates in DMS format.')).toBeTruthy();
  });

  test('Submit with a field that is not a number: "Coordinates Needed", nothing sent', async () => {
    const { requests } = serve();
    await show(editor().element);
    await fireEvent.changeText(screen.getByTestId('latitude'), '40°42\'46"N');
    await fireEvent.changeText(screen.getByTestId('longitude'), '-74');
    await fireEvent.press(screen.getByText('Submit'));
    await advance(400);
    expect(screen.getByText('Coordinates Needed')).toBeTruthy();
    expect(sent(requests)).toEqual([]);
    expect(devicesBloc.add).not.toHaveBeenCalled();
  });

  test('Submit cuts each to six decimals, saves on Node, then the sensor’s page', async () => {
    const { sensor, element } = editor();
    const { requests } = serve({
      [`PATCH /sensors/${sensor.id}/`]: { status: 200, body: {} },
    });
    await show(element);
    await fireEvent.changeText(screen.getByTestId('latitude'), '40.123456789');
    await fireEvent.changeText(screen.getByTestId('longitude'), ' -74.9 ');
    await fireEvent.press(screen.getByText('Submit'));
    await advance(400);
    expect(requests.filter(r => r.method === 'PATCH').map(r => r.body)).toEqual(
      ['latitude=40.123456&longitude=+-74.9+'],
    );
    expect(onlyEvent()).toBeInstanceOf(GoToSpecificSensorScreenEvent);
  });

  test('Detect Location fills both fields with the full numbers', async () => {
    await show(editor().element);
    await fireEvent.press(screen.getByText('Detect Location'));
    await advance(400);
    expect(screen.getByTestId('latitude').props.value).toBe('40.7127753');
    expect(screen.getByTestId('longitude').props.value).toBe('-74.0059728');
  });

  test.each([
    [
      'location off',
      () => geolocator().isLocationServiceEnabled.mockResolvedValueOnce(false),
      'Location services are turned off on this device. Turn them on in Settings, or type the coordinates in by hand.',
    ],
    [
      'permission refused when asked',
      () => {
        geolocator().checkPermission.mockResolvedValueOnce('denied');
        geolocator().requestPermission.mockResolvedValueOnce('denied');
      },
      'Cartell needs location access to place this sensor. Allow it when prompted, or type the coordinates in by hand.',
    ],
    [
      'permission refused for good',
      () => geolocator().checkPermission.mockResolvedValueOnce('deniedForever'),
      'Location access is turned off for Cartell. Turn it on in Settings > Cartell > Location, or type the coordinates in by hand.',
    ],
    [
      'no fix',
      () =>
        jest
          .requireMock('@react-native-community/geolocation')
          .default.getCurrentPosition.mockImplementationOnce(
            (_ok: unknown, fail: (e: unknown) => void) =>
              fail({ code: 2, message: 'Location not available' }),
          ),
      'Could not get a location fix. Move somewhere with a clearer view of the sky and try again, or type the coordinates in by hand.',
    ],
  ])(
    'Detect Location, %s: "Can\'t Get Location"',
    async (_case, arrange, message) => {
      jest.replaceProperty(Platform, 'OS', 'ios');
      arrange();
      await show(editor().element);
      await fireEvent.press(screen.getByText('Detect Location'));
      await advance(400);
      expect(screen.getByText("Can't Get Location")).toBeTruthy();
      expect(screen.getByText(message)).toBeTruthy();
      expect(screen.getByTestId('latitude').props.value).toBe('');
    },
  );

  test('← and Android Back go to the sensor’s page without saving', async () => {
    const { requests } = serve();
    await show(editor().element);
    await fireEvent.press(glyph(ARROW_LEFT));
    expect(onlyEvent()).toBeInstanceOf(GoToSpecificSensorScreenEvent);
    devicesBloc.add.mockClear();
    await pressBack();
    expect(onlyEvent()).toBeInstanceOf(GoToSpecificSensorScreenEvent);
    expect(sent(requests)).toEqual([]);
  });
});
