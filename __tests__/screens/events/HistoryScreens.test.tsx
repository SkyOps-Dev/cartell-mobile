// The three event-history screens (screens/events/history.dart, device_history.dart,
// sensor_history.dart; spec 12, features/21) and their shared HistoryCard: what each shows, the
// paging at the list's end, pull to refresh, the error view, where X and Back go, and the
// rotation setting.

import React from 'react';
import { NativeModules, Platform } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView, State } from 'react-native-gesture-handler';
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  PageBackHandler,
  PopScope,
} from '../../../src/components/layout/PopScope';
import { parseDevice } from '../../../src/models/device';
import { Event, parseEvent } from '../../../src/models/event';
import { parseSensor } from '../../../src/models/sensor';
import { DeviceHistory } from '../../../src/screens/events/DeviceHistory';
import { History } from '../../../src/screens/events/History';
import { dateTimeConverter } from '../../../src/screens/events/HistoryCard';
import { SensorHistory } from '../../../src/screens/events/SensorHistory';
import {
  GoToSpecificDeviceEvent,
  GoToSpecificSensorScreenEvent,
} from '../../../src/state/devices/devicesBloc';
import { RefreshState } from '../../../src/state/genericBloc';
import {
  GoToHubsScreenEvent,
  type MainAppBloc,
} from '../../../src/state/mainApp/mainAppBloc';
import { MainAppBlocProvider } from '../../../src/state/mainApp/MainAppBlocContext';
import {
  advance,
  devicesBloc,
  freshHub,
  installSensorScreenHooks,
  metrics,
  onlyEvent,
  pressBack,
  sensorJson,
  sent,
  serve,
  show,
} from '../../helpers/sensorScreens';

installSensorScreenHooks();

let nextId = 71000;
const activation = (overrides: Record<string, unknown> = {}) => ({
  id: nextId++,
  device: 31,
  device_name: 'Front Door',
  sensor: 4,
  event_type: 'AV',
  sensor_name: 'Porch - Sensor #1',
  time: '2026-10-21T13:05:03',
  location: 'Home',
  address: '1 Lane',
  group: null,
  added_date: '2026-10-21T11:00:00Z',
  ...overrides,
});
const eventPage = (results: unknown[], next: string | null = null) =>
  parseEvent({ count: results.length, next, previous: null, results });

const allowAll = () =>
  (NativeModules.CartellOrientation.allowAll as jest.Mock).mock.calls.length;

const mainAppBloc = { add: jest.fn() };
beforeEach(() => {
  mainAppBloc.add.mockClear();
  (NativeModules.CartellOrientation.allowAll as jest.Mock).mockClear();
});

/** All Event History sits in the MainAppRouter, not in the hubs area. */
async function showHistory(element: React.ReactElement) {
  await render(
    <GestureHandlerRootView>
      <SafeAreaProvider initialMetrics={metrics}>
        <PageBackHandler />
        <MainAppBlocProvider bloc={mainAppBloc as unknown as MainAppBloc}>
          <PopScope canPop={false}>{element}</PopScope>
        </MainAppBlocProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>,
  );
}

const scrollTo = async (y: number, content = 1000, viewport = 600) => {
  await fireEvent.scroll(screen.getByTestId('history-list'), {
    nativeEvent: {
      contentOffset: { x: 0, y },
      contentSize: { width: 360, height: content },
      layoutMeasurement: { width: 360, height: viewport },
    },
  });
  await advance(16);
};

describe('HistoryCard', () => {
  test('dateTimeConverter: local time, morning hours padded, afternoon hours not', () => {
    expect(dateTimeConverter('2026-10-21T13:05:03')).toBe(
      '10-21-2026 1:05:03 PM',
    );
    expect(dateTimeConverter('2026-10-21T09:05:03')).toBe(
      '10-21-2026 09:05:03 AM',
    );
    expect(dateTimeConverter('2026-10-21T12:00:09')).toBe(
      '10-21-2026 12:00:09 PM',
    );
    expect(dateTimeConverter('2026-10-21T00:30:00')).toBe(
      '10-21-2026 12:30:00 AM',
    );
    const utc = new Date(Date.UTC(2026, 9, 21, 12));
    expect(dateTimeConverter('2026-10-21T12:00:00Z')).toContain(
      `${String(utc.getMonth() + 1).padStart(2, '0')}-${String(
        utc.getDate(),
      ).padStart(2, '0')}-2026`,
    );
  });
});

describe('All Event History', () => {
  test('a spinner while checking, then each event as a card', async () => {
    await showHistory(
      <History event={new Event()} refresh={RefreshState.checking} />,
    );
    expect(screen.getByText('All Event History')).toBeTruthy();
    expect(screen.queryByTestId('history-list')).toBeNull();

    await screen.rerender(
      <GestureHandlerRootView>
        <SafeAreaProvider initialMetrics={metrics}>
          <MainAppBlocProvider bloc={mainAppBloc as unknown as MainAppBloc}>
            <History
              event={eventPage([
                activation(),
                activation({
                  event_type: 'CO',
                  sensor: null,
                  sensor_name: null,
                }),
                activation({ sensor_name: null, device_name: null }),
              ])}
            />
          </MainAppBlocProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>,
    );
    expect(screen.getByText('Porch - Sensor #1')).toBeTruthy();
    expect(screen.getByText('Connected to Front Door')).toBeTruthy();
    expect(screen.getAllByText('Motion Detected')).toHaveLength(2);
    expect(screen.getByText('Connected')).toBeTruthy();
    // Neither name: Dart writes "null".
    expect(screen.getByText('null')).toBeTruthy();
    expect(screen.getAllByText('10-21-2026 1:05:03 PM')).toHaveLength(3);
    expect(screen.getByText('Connected').props.style).toMatchObject({
      color: '#F44336',
    });
    // No next page: no spinner row.
    expect(screen.queryByTestId('history-load-more')).toBeNull();
  });

  test('at the exact end of the list, the next page is fetched and appended', async () => {
    const { requests } = serve({
      'GET /activations/': {
        status: 200,
        body: {
          count: 2,
          next: null,
          previous: null,
          results: [activation({ sensor_name: 'Page Two' })],
        },
      },
    });
    await showHistory(
      <History
        event={eventPage(
          [activation()],
          'http://192.168.100.29:8001/activations/?page=2',
        )}
      />,
    );
    expect(screen.getByTestId('history-load-more')).toBeTruthy();
    await scrollTo(300);
    expect(sent(requests)).toEqual([]);
    await scrollTo(400);
    await advance(100);
    expect(sent(requests)).toEqual(['GET /activations/']);
    expect(screen.getByText('Page Two')).toBeTruthy();
    expect(screen.queryByTestId('history-load-more')).toBeNull();
  });

  test('pull to refresh: the hubs fetched too, the loading screen, then page one (Q24)', async () => {
    // The pull is Android's pan gesture (on iOS the scroll view's own overscroll).
    jest.replaceProperty(Platform, 'OS', 'android');
    const { requests } = serve({
      'GET /devices/': { status: 200, body: [] },
      'GET /activations': {
        status: 200,
        body: {
          count: 1,
          next: null,
          previous: null,
          results: [activation({ sensor_name: 'Refreshed' })],
        },
      },
    });
    await showHistory(
      <History event={eventPage([activation(), activation(), activation()])} />,
    );
    const list = screen.getByTestId('history-list');
    await fireEvent(list, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 400 } },
    });
    await fireEvent(list, 'contentSizeChange', 360, 900);
    await act(async () => {
      fireGestureHandler(getByGestureTestId('liquid-pull-to-refresh'), [
        { state: State.BEGAN, translationY: 0 },
        { state: State.ACTIVE, translationY: 8 },
        { state: State.ACTIVE, translationY: 220 },
        { state: State.END, translationY: 220 },
      ]);
    });
    await advance(3200);
    expect(sent(requests).sort()).toEqual(
      ['GET /activations', 'GET /devices/'].sort(),
    );
    expect(screen.getByText('Refreshed')).toBeTruthy();
  });

  test('Back and the arrow go to Hubs; rotation allowed on open and on close', async () => {
    await showHistory(<History event={eventPage([activation()])} />);
    expect(allowAll()).toBe(1);
    await pressBack();
    expect(mainAppBloc.add.mock.calls[0][0]).toBeInstanceOf(
      GoToHubsScreenEvent,
    );
    await act(async () => {
      screen.unmount();
    });
    expect(allowAll()).toBe(2);
  });
});

describe("Hub's Event History", () => {
  test('the hub’s name, X to its page, and the raw exception text when a page fails (Q25)', async () => {
    const hub = parseDevice(freshHub({ name: 'Garage Hub' }));
    serve({ [`GET /devices/${hub.id}/activations/`]: { status: 500 } });
    await show(
      <DeviceHistory
        device={hub}
        event={eventPage(
          [activation()],
          `http://192.168.100.29:8001/devices/${hub.id}/activations/?page=2`,
        )}
      />,
    );
    expect(screen.getByText('Garage Hub')).toBeTruthy();
    expect(screen.getByText("Hub's Event History")).toBeTruthy();
    await scrollTo(400);
    await advance(100);
    expect(
      screen.getByText("Instance of 'UnableToUpdateExceptions'"),
    ).toBeTruthy();
    expect(screen.queryByText("Hub's Event History")).toBeNull();
  });

  test('Back → the hub’s page', async () => {
    const hub = parseDevice(freshHub());
    await show(<DeviceHistory device={hub} event={eventPage([])} />);
    await pressBack();
    const event = onlyEvent();
    expect(event).toBeInstanceOf(GoToSpecificDeviceEvent);
    expect(event.device).toBe(hub);
  });
});

describe("Sensor's Event History", () => {
  test('the sensor’s name, and Back → the sensor’s page', async () => {
    const hub = parseDevice(freshHub());
    const sensor = parseSensor(sensorJson({ name: 'Back Door' }));
    await show(
      <SensorHistory device={hub} sensor={sensor} event={eventPage([])} />,
    );
    expect(screen.getByText('Back Door')).toBeTruthy();
    expect(screen.getByText("Sensor's Event History")).toBeTruthy();
    expect(allowAll()).toBe(1);
    await pressBack();
    const event = onlyEvent();
    expect(event).toBeInstanceOf(GoToSpecificSensorScreenEvent);
    expect(event.sensor).toBe(sensor);
    expect(devicesBloc.add).toHaveBeenCalledTimes(1);
  });
});
