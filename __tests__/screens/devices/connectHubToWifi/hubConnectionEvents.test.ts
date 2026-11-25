// Ported from, in frontend/test/screens/devices/connect_hub_to_wifi/:
// - frontend/test/screens/devices/connect_hub_to_wifi/hub_connection_events_test.dart (summary
//   events, the cancel-after-success guard, orphan prevention, the teardown's re-entrancy guard);
// - frontend/test/screens/devices/connect_hub_to_wifi/reply_guard_test.dart (the reply guard, the
//   cancelled code, HubConnectionBloc.close);
// - frontend/test/screens/devices/connect_hub_to_wifi/start_connection_event_wiring_test.dart.
//   Flutter checks that one as source text because its handlers need a radio; here the Wi-Fi plugin
//   and the socket have stand-ins (jest.setup.js, __tests__/helpers/udpMock.ts), so the same
//   properties are checked by running the handlers. The flow from joining the hub to the server
//   confirming it is run end to end the same way.
// frontend/test/screens/devices/connect_hub_to_wifi/event_handler_registration_test.dart has no
// counterpart: GenericBloc runs any event's handler, so there is no registration list to forget.

import { AppState, NativeModules } from 'react-native';

import { installFakeServer } from '../../../helpers/fakeServer';
import { hubJson } from '../../../helpers/hubJson';
import { testDevice, testWifiNetwork } from '../../../helpers/pairingFixtures';
import { udpMock } from '../../../helpers/udpMock';
import {
  ErrorOccurredEvent,
  ReestablishConnectionToServerEvent,
} from '../../../../src/screens/devices/connectHubToWifi/events/errorEvents';
import { StartConnectionEvent } from '../../../../src/screens/devices/connectHubToWifi/events/hubConnectionEvents';
import {
  NetworkDiscoveredEvent,
  RefreshHubWifiNetworksEvent,
  SelectWifiNetworkEvent,
} from '../../../../src/screens/devices/connectHubToWifi/events/wifiNetworkEvents';
import {
  CancelWaitingForHubEvent,
  ConnectHubToWifiEvent,
  HubConnectedToWifiEvent,
  HubSessionExpiredEvent,
  HubStillRegisteringEvent,
  StartCheckingIfHubConnectedToWifiEvent,
} from '../../../../src/screens/devices/connectHubToWifi/events/wifiConnectionEvents';
import { HubConnectionBloc } from '../../../../src/screens/devices/connectHubToWifi/hubConnectionBloc';
import {
  HubNotYetRegistered,
  WaitingReason,
} from '../../../../src/screens/devices/connectHubToWifi/hubRegistrationCheck';
import { HubRegistrationPoller } from '../../../../src/screens/devices/connectHubToWifi/hubRegistrationPoller';
import { abandonEventFor } from '../../../../src/screens/devices/connectHubToWifi/pairingExit';
import { HubRegistrationErrorCodes } from '../../../../src/screens/devices/connectHubToWifi/pairingErrorCodes';
import { shouldAdvanceOnReply } from '../../../../src/screens/devices/connectHubToWifi/replyGuard';
import {
  AnErrorOccurredState,
  CheckingIfHubConnectedToWifiState,
  ConnectedToHubState,
  ConnectingToHubState,
  HubConnectedToWifiSuccessfullyState,
  HubConnectingToWifiState,
  PairingStoppedState,
  ReestablishConnectionToServerState,
  SelectedNetworkState,
  SessionExpiredState,
  VerifyingHubConnectionState,
} from '../../../../src/screens/devices/connectHubToWifi/states';
import * as reporter from '../../../../src/services/reportError';
import {
  AbstractUdpCommand,
  CheckandSaveEncryptedSSIDandPasswordReply,
  GetFWVersionReply,
  ReadWebsocketUriReply,
  SaveSSIDandPasswordReply,
  ScanWifiNetworksReply,
} from '../../../../src/udpCommands/commands';
import { UDPConnection } from '../../../../src/udpCommands/udpConnection';
import { ModeWatcherHelper } from '../../../../src/utilities/modeWatcher';

const wifiIot = NativeModules.CartellWifiIot as Record<string, jest.Mock>;

let blocs: HubConnectionBloc[] = [];
let summaries: jest.SpyInstance;

function newBloc(device = testDevice()): HubConnectionBloc {
  const bloc = new HubConnectionBloc(device);
  blocs.push(bloc);
  return bloc;
}

const tick = (ms = 0) => jest.advanceTimersByTimeAsync(ms);

/** A poller that never probes: something for bloc.activePoller to point at. */
const dormantPoller = () =>
  new HubRegistrationPoller({
    probe: () => new Promise(() => undefined),
    sleep: async () => undefined,
    isForeground: () => true,
    onWaiting: () => undefined,
    onRegistered: () => undefined,
    onAuthExpired: () => undefined,
  });

/** The `hub_pairing` context of every summary reported so far. */
const summaryContexts = () =>
  summaries.mock.calls.map(
    ([, contexts]) =>
      (contexts as { hub_pairing: Record<string, unknown> }).hub_pairing,
  );

/** The bloc on the waiting screen, as StartCheckingIfHubConnectedToWifiEvent's first emit puts it. */
function waitOn(bloc: HubConnectionBloc, startedAt = Date.now()) {
  bloc.add(
    new HubStillRegisteringEvent({
      startedAt,
      reason: WaitingReason.waitingForHub,
    }),
  );
}

/** The type (hex) of every datagram sent, in order. */
const sentTypes = () =>
  udpMock.sent.map(({ bytes }) =>
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      .getUint32(4, true)
      .toString(16)
      .toUpperCase()
      .padStart(8, '0'),
  );

/** A datagram from the hub. */
const hubSends = (command: AbstractUdpCommand) =>
  udpMock.deliver(
    new Uint8Array(
      command.data.buffer,
      command.data.byteOffset,
      command.data.byteLength,
    ),
  );

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  udpMock.reset();
  UDPConnection.instance = null;
  ModeWatcherHelper.isPairingDevices = false;
  ModeWatcherHelper.currentState = 'active';
  (AppState as unknown as { currentState: string }).currentState = 'active';
  summaries = jest
    .spyOn(reporter, 'reportMessage')
    .mockImplementation(() => undefined);
  jest.spyOn(reporter, 'reportError').mockImplementation(() => undefined);
  installFakeServer({ 'GET /test/': { status: 200 } });
});

afterEach(() => {
  blocs.forEach(bloc => bloc.close());
  blocs = [];
  UDPConnection.clearConnection();
  jest.restoreAllMocks();
  jest.useRealTimers();
  ModeWatcherHelper.isPairingDevices = false;
  ModeWatcherHelper.currentState = 'active';
});

describe('hub pairing summary events (acceptance criterion 6)', () => {
  test('a poll that succeeds fires one summary event with outcome "registered", elapsed_seconds, and no error_code', async () => {
    const bloc = newBloc();
    bloc.startedAt = Date.now() - 42_000;
    bloc.activePoller = dormantPoller();
    waitOn(bloc, bloc.startedAt);
    await tick();

    bloc.add(new HubConnectedToWifiEvent());
    await tick();

    expect(summaries).toHaveBeenCalledTimes(1);
    expect(summaries.mock.calls[0][0]).toBe(
      'hub pairing registration poll ended: registered',
    );
    const [context] = summaryContexts();
    expect(context.outcome).toBe('registered');
    // A registered outcome is not an error and carries no code.
    expect(context).not.toHaveProperty('error_code');
    expect(context.elapsed_seconds).toBeGreaterThanOrEqual(42);
    expect(context.device_id).toBe(bloc.device.id);
  });

  test('a cancelled poll still fires a summary with the cancelled code', async () => {
    const bloc = newBloc();
    bloc.startedAt = Date.now() - 7_000;
    bloc.activePoller = dormantPoller();
    waitOn(bloc, bloc.startedAt);
    await tick();

    bloc.add(new CancelWaitingForHubEvent());
    await tick();

    expect(summaries).toHaveBeenCalledTimes(1);
    const [context] = summaryContexts();
    expect(context.outcome).toBe('cancelled');
    expect(context.error_code).toBe('e5b1907d-C');
    expect(context.elapsed_seconds).toBeGreaterThanOrEqual(7);
  });

  test('a success that arrives after Cancel already stopped the poll does not undo the cancellation or emit a second summary', async () => {
    const bloc = newBloc();
    bloc.startedAt = Date.now();
    bloc.activePoller = dormantPoller();
    waitOn(bloc);
    await tick();
    expect(bloc.state).toBeInstanceOf(CheckingIfHubConnectedToWifiState);

    bloc.add(new CancelWaitingForHubEvent());
    bloc.add(new HubConnectedToWifiEvent());
    await tick();

    expect(bloc.state).toBeInstanceOf(PairingStoppedState);
    expect(summaries).toHaveBeenCalledTimes(1);
    expect(summaryContexts()[0].outcome).toBe('cancelled');
  });

  test('a poll that settles auth-expired fires one summary event with outcome "auth_expired" and the session-expired error code', async () => {
    const bloc = newBloc();
    bloc.startedAt = Date.now() - 5_000;
    bloc.activePoller = dormantPoller();
    // StartConnectionEvent holds this at background for the whole flow.
    ModeWatcherHelper.currentState = 'background';
    bloc.add(
      new HubStillRegisteringEvent({
        startedAt: bloc.startedAt,
        reason: WaitingReason.reachingServer,
      }),
    );
    await tick();

    bloc.add(new HubSessionExpiredEvent());
    await tick();

    expect(bloc.state).toBeInstanceOf(SessionExpiredState);
    // A foreground ending, like the others, so maintenance checks resume.
    expect(ModeWatcherHelper.currentState).toBe('active');
    expect(summaries).toHaveBeenCalledTimes(1);
    const [context] = summaryContexts();
    expect(context.outcome).toBe('auth_expired');
    expect(context.error_code).toBe('e5b1907d-A');
    expect(context.elapsed_seconds).toBeGreaterThanOrEqual(5);
  });

  test('a poll abandoned to an error fires one summary event with outcome "error" and that error\'s own code', async () => {
    const bloc = newBloc();
    bloc.startedAt = Date.now() - 3_000;
    bloc.activePoller = dormantPoller();

    bloc.add(
      new ErrorOccurredEvent({
        errorMessage: "We weren't able to connect to your hub.",
        errorCode: '3b3cd169-f023',
      }),
    );
    await tick();

    expect(summaries).toHaveBeenCalledTimes(1);
    const [context] = summaryContexts();
    expect(context.outcome).toBe('error');
    expect(context.error_code).toBe('3b3cd169-f023');
    // An abandoned poll leaves no stale poller behind.
    expect(bloc.activePoller).toBeNull();
  });

  test('ErrorOccurredEvent emits no summary when there was no active poll', async () => {
    const bloc = newBloc();
    bloc.add(
      new ErrorOccurredEvent({ errorMessage: 'boom', errorCode: '9d5a3474' }),
    );
    await tick(10_000);

    expect(summaries).not.toHaveBeenCalled();
  });

  test('the summary carries the poller counters', async () => {
    const bloc = newBloc();
    bloc.startedAt = Date.now();
    let checks = 0;
    const poller = new HubRegistrationPoller({
      probe: async () => {
        checks++;
        return new HubNotYetRegistered();
      },
      sleep: async () => {
        if (checks >= 2) {
          poller.cancel();
        }
      },
      isForeground: () => true,
      onWaiting: () => undefined,
      onRegistered: () => undefined,
      onAuthExpired: () => undefined,
    });
    await poller.run();
    bloc.activePoller = poller;
    waitOn(bloc);
    bloc.add(new HubConnectedToWifiEvent());

    expect(summaryContexts()[0]).toEqual({
      outcome: 'registered',
      device_id: bloc.device.id,
      completed_checks: 2,
      ever_reached_server: true,
      elapsed_seconds: 0,
      unavailable_counts: {},
    });
  });
});

describe('CancelWaitingForHubEvent — cancel-after-success guard', () => {
  test('a Cancel that arrives after the hub already registered does not undo the success', async () => {
    const bloc = newBloc();
    waitOn(bloc);
    await tick();
    expect(bloc.state).toBeInstanceOf(CheckingIfHubConnectedToWifiState);

    bloc.add(new HubConnectedToWifiEvent());
    bloc.add(new CancelWaitingForHubEvent());
    await tick();

    expect(bloc.state).toBeInstanceOf(HubConnectedToWifiSuccessfullyState);
  });
});

describe('StartCheckingIfHubConnectedToWifiEvent — orphan-prevention', () => {
  test('cancels a still-live poller instead of orphaning it when a second one is started', async () => {
    const bloc = newBloc();
    const oldPoller = dormantPoller();
    bloc.activePoller = oldPoller;

    bloc.add(new StartCheckingIfHubConnectedToWifiEvent());
    await tick();

    expect(oldPoller.isCancelled).toBe(true);
    expect(bloc.activePoller).not.toBe(oldPoller);
    expect(bloc.activePoller).not.toBeNull();
  });
});

describe('ErrorOccurredEvent — re-entrancy guard', () => {
  test('the clean-transition case: emits ReestablishConnectionToServerState when nothing is already tearing down', async () => {
    const bloc = newBloc();
    bloc.add(
      new ErrorOccurredEvent({
        errorMessage: 'first error',
        errorCode: 'aaaaaaaa',
      }),
    );
    await tick();

    expect(bloc.state).toBeInstanceOf(ReestablishConnectionToServerState);
  });

  test('a second dispatch while already reestablishing does not start a second teardown', async () => {
    const bloc = newBloc();
    bloc.add(
      new ErrorOccurredEvent({
        errorMessage: 'first error',
        errorCode: 'aaaaaaaa',
      }),
    );
    await tick();
    expect(bloc.state).toBeInstanceOf(ReestablishConnectionToServerState);

    // The guard must return before the line that clears activePoller.
    const marker = dormantPoller();
    bloc.activePoller = marker;
    bloc.add(
      new ErrorOccurredEvent({
        errorMessage:
          'second error, e.g. from the Cancel button on that screen',
        errorCode: 'bbbbbbbb',
      }),
    );
    await tick();

    expect(bloc.activePoller).toBe(marker);
  });

  test('still tears down when ReestablishConnectionToServerState was reached by a different event entirely', async () => {
    // "Try Reconnecting Again" reaches the same state through its own loop.
    const bloc = newBloc();
    bloc.add(new ReestablishConnectionToServerEvent());
    await tick();
    expect(bloc.state).toBeInstanceOf(ReestablishConnectionToServerState);

    const marker = dormantPoller();
    bloc.activePoller = marker;
    bloc.add(
      new ErrorOccurredEvent({
        errorMessage:
          'Cancel tapped while a different reconnect attempt was still running',
        errorCode: 'cccccccc',
      }),
    );
    await tick();

    // A guard keyed on the state would have dropped the cancel.
    expect(bloc.activePoller).toBeNull();
  });

  test('the whole teardown: leaves the hub network, waits for the server, then shows the error', async () => {
    const bloc = newBloc();
    ModeWatcherHelper.isPairingDevices = true;
    bloc.add(
      new ErrorOccurredEvent({
        errorMessage: 'Pairing was cancelled. \nPlease try again later.',
        errorCode: 'e5b1907d-J',
        errorDetail: 'detail',
      }),
    );
    await tick(750);
    expect(wifiIot.forceWifiUsage).toHaveBeenCalledWith(false);
    expect(wifiIot.disconnect).toHaveBeenCalledTimes(1);
    expect(bloc.state).toBeInstanceOf(ReestablishConnectionToServerState);

    await tick(3001);

    const state = bloc.state as AnErrorOccurredState;
    expect(state).toBeInstanceOf(AnErrorOccurredState);
    expect(state.errorCode).toBe('e5b1907d-J');
    expect(state.errorMessage).toBe(
      'Pairing was cancelled. \nPlease try again later.',
    );
    expect(state.errorDetail).toBe('detail');
    expect(ModeWatcherHelper.isPairingDevices).toBe(false);
    expect(bloc.teardownInFlight).toBe(false);
  });
});

describe('shouldAdvanceOnReply', () => {
  test('advances on the first SaveSSIDandPasswordReply', () => {
    expect(
      shouldAdvanceOnReply({
        alreadyAdvanced: false,
        message: SaveSSIDandPasswordReply.generate({ result: 0 }),
      }),
    ).toBe(true);
  });

  test('advances on the first encrypted credential reply', () => {
    expect(
      shouldAdvanceOnReply({
        alreadyAdvanced: false,
        message: CheckandSaveEncryptedSSIDandPasswordReply.generate({
          result: 0,
        }),
      }),
    ).toBe(true);
  });

  test('refuses a second reply once already advanced', () => {
    // Credentials go out up to 4 times, so duplicate replies are expected.
    expect(
      shouldAdvanceOnReply({
        alreadyAdvanced: true,
        message: SaveSSIDandPasswordReply.generate({ result: 0 }),
      }),
    ).toBe(false);
  });

  test('ignores a message type that is not a credential-save reply', () => {
    expect(
      shouldAdvanceOnReply({
        alreadyAdvanced: false,
        message: GetFWVersionReply.generate({ version: 1 }),
      }),
    ).toBe(false);
  });
});

describe('HubRegistrationErrorCodes', () => {
  test('cancelled code is distinct from the verification stage base', () => {
    expect(HubRegistrationErrorCodes.cancelledWhileWaiting).toBe('e5b1907d-C');
    expect(HubRegistrationErrorCodes.cancelledWhileWaiting).not.toMatch(
      /^762c844a/,
    );
  });
});

describe('HubConnectionBloc.close', () => {
  test('cancels the active poller, clears isPairingDevices, and nulls activePoller', () => {
    ModeWatcherHelper.isPairingDevices = true;
    const bloc = newBloc();
    const poller = dormantPoller();
    bloc.activePoller = poller;

    bloc.close();

    expect(poller.isCancelled).toBe(true);
    expect(ModeWatcherHelper.isPairingDevices).toBe(false);
    expect(bloc.activePoller).toBeNull();
  });

  test('does not reset ModeWatcherHelper.currentState', () => {
    // It belongs to the app's lifecycle, and close can run in the background.
    ModeWatcherHelper.currentState = 'background';
    newBloc().close();
    expect(ModeWatcherHelper.currentState).toBe('background');
  });
});

describe('StartConnectionEvent (start_connection_event_wiring_test.dart, run)', () => {
  test('joins the hub network, routes traffic over it, opens the socket, then verifies', async () => {
    const bloc = newBloc(testDevice({ macAddress: '34:cd:b0:e6:5e:34' }));
    bloc.add(new StartConnectionEvent());

    expect(bloc.state).toBeInstanceOf(ConnectingToHubState);
    // Off its own network the phone cannot reach the server: maintenance checks pause.
    expect(ModeWatcherHelper.isPairingDevices).toBe(true);
    expect(ModeWatcherHelper.currentState).toBe('background');

    await tick(1);
    expect(wifiIot.connect.mock.calls[0][0]).toBe(
      'Cartell Hub 34:cd:b0:e6:5e:34',
    );
    expect(wifiIot.forceWifiUsage).not.toHaveBeenCalled();
    await tick(500);
    expect(wifiIot.forceWifiUsage).toHaveBeenCalledWith(true);

    await tick(1500);
    expect(bloc.hubSocket).toBe(UDPConnection.instance);
    expect(bloc.state).toBeInstanceOf(VerifyingHubConnectionState);
  });

  test('a socket that will not open ends on the failure screen with 762c844a-S, and verification never starts', async () => {
    udpMock.failBindWith = 'bind failed: EADDRINUSE';
    const bloc = newBloc();
    bloc.add(new StartConnectionEvent());
    await tick(2001);

    expect(reporter.reportError).toHaveBeenCalled();
    expect(bloc.state).toBeInstanceOf(ReestablishConnectionToServerState);
    await tick(5000);
    const state = bloc.state as AnErrorOccurredState;
    expect(state).toBeInstanceOf(AnErrorOccurredState);
    expect(state.errorCode).toBe('762c844a-S');
    expect(state.errorMessage).toBe(
      'Could not open a connection to your hub.\nPlease try again.',
    );
    expect(udpMock.sent).toHaveLength(0);
  });

  test('a cancel during the platform calls ends the flow: no verification, no socket left open', async () => {
    const bloc = newBloc();
    bloc.add(new StartConnectionEvent());
    await tick(1500); // inside getInstance's one-second wait

    bloc.add(abandonEventFor(bloc.state));
    await tick(2000);

    expect(udpMock.sent).toHaveLength(0);
    expect(udpMock.sockets.every(socket => socket.closed)).toBe(true);
    expect(bloc.hubSocket).toBeNull();
    // Not reported as a socket failure: the flow ended as asked.
    await tick(5000);
    expect((bloc.state as AnErrorOccurredState).errorCode).toBe('e5b1907d-J');
  });
});

describe('FinishedConnectingEvent', () => {
  /** The bloc with its socket open and verification started. */
  async function connected(bloc = newBloc()) {
    bloc.add(new StartConnectionEvent());
    await tick(2100);
    return bloc;
  }

  test('a cancel inside its one-second wait means no timer and no sends', async () => {
    const bloc = await connected();
    expect(bloc.state).toBeInstanceOf(VerifyingHubConnectionState);
    bloc.add(abandonEventFor(bloc.state));
    await tick(15_000);

    expect(udpMock.sent).toHaveLength(0);
    expect((bloc.state as AnErrorOccurredState).errorCode).toBe('e5b1907d-V');
  });

  test('asks twice a second; the reply writes the server address three times, 120 ms apart, then asks for networks', async () => {
    const bloc = await connected();
    await tick(1150);
    expect(sentTypes()).toEqual(['000A0001']);
    await tick(500);
    expect(sentTypes()).toEqual(['000A0001', '000A0001']);

    hubSends(GetFWVersionReply.generate({ version: 1029 }));
    await tick(5);
    expect(bloc.state).toBeInstanceOf(ConnectedToHubState);
    expect(sentTypes()).toEqual(['000A0001', '000A0001', '000A00E2']);

    await tick(300);
    expect(sentTypes()).toEqual([
      '000A0001',
      '000A0001',
      '000A00E2',
      '000A00C4', // the network scan, 100 ms in
      '000A00E2', // 120 ms
      '000A00E2', // 240 ms
    ]);
    // The write is the same each time; verification stopped asking.
    const writes = udpMock.sent.filter((_, i) => sentTypes()[i] === '000A00E2');
    expect(new Set(writes.map(w => w.bytes.join(','))).size).toBe(1);
    await tick(2000);
    expect(sentTypes().filter(type => type === '000A0001')).toHaveLength(2);
  });

  test('no reply at all in 40 s: "Your phone never reached the HUB." (762c844a-0)', async () => {
    const bloc = await connected();
    await tick(1000 + 40_000);
    expect(sentTypes()).toHaveLength(80);

    await tick(5000);
    const state = bloc.state as AnErrorOccurredState;
    expect(state.errorCode).toBe('762c844a-0');
    expect(state.errorMessage).toBe('Your phone never reached the HUB.');
    // Jest runs as iOS, where the system's button says Join.
    expect(state.errorDetail).toContain('tap "Join"');
  });

  test('an unexpected reply stops verification with 762c844a-W', async () => {
    const bloc = await connected();
    await tick(1150);
    hubSends(ReadWebsocketUriReply.generate({ uri: 'ws://elsewhere/' }));
    await tick(5000);

    const state = bloc.state as AnErrorOccurredState;
    expect(state.errorCode).toBe('762c844a-W');
    expect(state.errorMessage).toBe(
      'The connection to your hub could not be verified. \nPlease try again.',
    );
  });

  test('every send failing gives up after seven with 9d5a3474', async () => {
    const bloc = await connected();
    udpMock.failSendWith = 'Network is unreachable';
    await tick(1000 + 3150);
    expect(bloc.state).toBeInstanceOf(ReestablishConnectionToServerState);

    await tick(5000);
    const state = bloc.state as AnErrorOccurredState;
    expect(state.errorCode).toBe('9d5a3474');
    expect(state.errorMessage).toBe(
      "We weren't able to connect to your hub. \nPlease try again later.",
    );
  });

  test('timing: the failure lands with the seventh failed send, not before', async () => {
    const bloc = await connected();
    udpMock.failSendWith = 'Network is unreachable';
    await tick(1000 + 2650); // six sends
    expect(bloc.state).toBeInstanceOf(VerifyingHubConnectionState);
    await tick(500); // the seventh
    expect(bloc.state).toBeInstanceOf(ReestablishConnectionToServerState);
  });
});

describe('the hub network list', () => {
  test('a network the hub reports is kept by name and redraws the list', async () => {
    const bloc = newBloc();
    bloc.add(new VerifiedForTest());
    const before = bloc.state;

    bloc.add(new NetworkDiscoveredEvent(testWifiNetwork({ ssid: 'Home' })));
    bloc.add(new NetworkDiscoveredEvent(testWifiNetwork({ ssid: 'Shop' })));
    bloc.add(
      new NetworkDiscoveredEvent(testWifiNetwork({ ssid: 'Home', rssi: -40 })),
    );
    await tick();

    expect([...bloc.wifiNetworks.keys()]).toEqual(['Home', 'Shop']);
    expect(bloc.wifiNetworks.get('Home')?.rssi).toBe(-40);
    expect(bloc.state).toBeInstanceOf(ConnectedToHubState);
    expect(bloc.state).not.toBe(before);
  });

  test('a refresh forgets the list, bumps the scan generation and asks again', async () => {
    const bloc = newBloc();
    const pending = UDPConnection.getInstance();
    await tick(1001);
    bloc.hubSocket = await pending;
    bloc.wifiNetworks.set('Home', testWifiNetwork({ ssid: 'Home' }));

    bloc.add(new RefreshHubWifiNetworksEvent());
    await tick(1);

    expect(bloc.wifiNetworks.size).toBe(0);
    expect(bloc.scanGeneration).toBe(1);
    expect(sentTypes()).toEqual(['000A00C4']);
    expect(bloc.state).toBeInstanceOf(ConnectedToHubState);
  });

  test('picking a network shows the password step', async () => {
    const bloc = newBloc();
    const network = testWifiNetwork({ ssid: 'Home' });
    bloc.add(new SelectWifiNetworkEvent(network));
    await tick();
    expect((bloc.state as SelectedNetworkState).wifiNetwork).toBe(network);
  });
});

/** ConnectedToHubState without the hub (the list tests need only the state). */
class VerifiedForTest {
  async handleEvent(
    _bloc: HubConnectionBloc,
    emit: (state: ConnectedToHubState) => void,
  ) {
    emit(new ConnectedToHubState());
  }
}

describe('ConnectHubToWifiEvent', () => {
  async function onHubNetwork(device = testDevice()) {
    const bloc = newBloc(device);
    const pending = UDPConnection.getInstance();
    await tick(1001);
    bloc.hubSocket = await pending;
    return bloc;
  }

  test('no acknowledgement after four sends ends in dbd39a14-b708', async () => {
    const bloc = await onHubNetwork();
    bloc.add(
      new ConnectHubToWifiEvent(
        testWifiNetwork({ ssid: 'Home' }),
        'MyWifiPass123',
      ),
    );
    expect(bloc.state).toBeInstanceOf(HubConnectingToWifiState);

    await tick(16_100);
    expect(sentTypes()).toEqual([
      '000A0123',
      '000A0123',
      '000A0123',
      '000A0123',
    ]);
    expect(bloc.state).toBeInstanceOf(HubConnectingToWifiState);

    await tick(4000);
    expect(bloc.state).toBeInstanceOf(ReestablishConnectionToServerState);
    await tick(5000);
    const state = bloc.state as AnErrorOccurredState;
    expect(state.errorCode).toBe('dbd39a14-b708');
    expect(state.errorMessage).toBe(
      "We weren't able to connect to your hub. \nPlease try again later.",
    );
  });

  test('a password too long for the hub is reported and the sends go on (as an uncaught Dart timer error)', async () => {
    const bloc = await onHubNetwork();
    bloc.add(
      new ConnectHubToWifiEvent(
        testWifiNetwork({ ssid: 'Home' }),
        'x'.repeat(65),
      ),
    );
    await tick(4100);
    expect(reporter.reportError).toHaveBeenCalledTimes(1);
    expect(udpMock.sent).toHaveLength(0);
    await tick(16_000);
    expect(bloc.state).toBeInstanceOf(ReestablishConnectionToServerState);
  });
});

describe('the whole flow, joining the hub to the server confirming it', () => {
  test('ends on success, with maintenance checks back on and one "registered" summary', async () => {
    const device = testDevice({ macAddress: '34:cd:b0:e6:5e:34' });
    const { requests } = installFakeServer({
      'GET /test/': { status: 200 },
      [`GET /devices/${device.id}/`]: {
        status: 200,
        body: hubJson({
          id: device.id,
          device: { mac_address: '34:cd:b0:e6:5e:34', is_connected: true },
        }),
      },
    });
    const bloc = newBloc(device);

    bloc.add(new StartConnectionEvent());
    await tick(3100);
    hubSends(GetFWVersionReply.generate({ version: 1029 }));
    await tick(150);
    hubSends(testWifiNetwork({ ssid: 'Home' }));
    await tick(1);
    expect(bloc.wifiNetworks.has('Home')).toBe(true);

    const network = bloc.wifiNetworks.get('Home') as ScanWifiNetworksReply;
    bloc.add(new SelectWifiNetworkEvent(network));
    bloc.add(new ConnectHubToWifiEvent(network, 'MyWifiPass123'));
    await tick(4100);
    expect(sentTypes().filter(type => type === '000A0123')).toHaveLength(1);

    const ackAt = Date.now();
    hubSends(CheckandSaveEncryptedSSIDandPasswordReply.generate({ result: 1 }));
    await tick(1);
    expect(bloc.credentialAckAt).toBe(ackAt);

    // 2 s, close the socket, 1 s, stop routing over Wi-Fi, 1 s, leave, 1 s.
    await tick(5100);
    expect(UDPConnection.instance).toBeNull();
    expect(wifiIot.forceWifiUsage).toHaveBeenLastCalledWith(false);
    expect(wifiIot.disconnect).toHaveBeenCalledTimes(1);
    await tick(10);

    expect(bloc.state).toBeInstanceOf(HubConnectedToWifiSuccessfullyState);
    // The confirmation asked Django whether the hub is connected.
    expect(requests.map(r => `${r.method} ${r.path}`)).toContain(
      `GET /devices/${device.id}/`,
    );
    expect(ModeWatcherHelper.isPairingDevices).toBe(false);
    expect(ModeWatcherHelper.currentState).toBe('active');
    expect(summaryContexts()).toEqual([
      expect.objectContaining({
        outcome: 'registered',
        completed_checks: 1,
        ever_reached_server: true,
      }),
    ]);
  });

  test('a hub not yet online keeps the waiting screen, with the reason', async () => {
    const device = testDevice();
    installFakeServer({
      [`GET /devices/${device.id}/`]: {
        status: 200,
        body: hubJson({ id: device.id, device: { is_connected: false } }),
      },
    });
    const bloc = newBloc(device);
    bloc.credentialAckAt = Date.now();
    bloc.add(new StartCheckingIfHubConnectedToWifiEvent());
    expect((bloc.state as CheckingIfHubConnectedToWifiState).reason).toBe(
      WaitingReason.rejoiningNetwork,
    );
    await tick(1);

    const state = bloc.state as CheckingIfHubConnectedToWifiState;
    expect(state.reason).toBe(WaitingReason.waitingForHub);
    expect(state.showLightReadings).toBe(false);
  });
});
