// The pairing wizard's screens. Ported from, in frontend/test/screens/devices/connect_hub_to_wifi/:
// - frontend/test/screens/devices/connect_hub_to_wifi/abandon_dialog_widget_test.dart
// - frontend/test/screens/devices/connect_hub_to_wifi/light_check_branch_test.dart
// - frontend/test/screens/devices/connect_hub_to_wifi/no_password_dialog_test.dart
// - frontend/test/screens/devices/connect_hub_to_wifi/list_wifi_networks_widget_test.dart
// - frontend/test/screens/devices/connect_hub_to_wifi/pairing_copy_test.dart
// - frontend/test/screens/devices/connect_hub_to_wifi/pairing_stopped_widget_test.dart
// - frontend/test/screens/devices/connect_hub_to_wifi/password_length_test.dart (the field; the
//   byte count is in __tests__/services/encryption.test.ts)
// - frontend/test/screens/devices/connect_hub_to_wifi/probe_outcome_screens_test.dart
// - frontend/test/screens/devices/connect_hub_to_wifi/waiting_screen_test.dart
// - frontend/test/screens/devices/connect_hub_to_wifi/exit_wiring_test.dart and
//   frontend/test/screens/devices/connect_hub_to_wifi/button_palette_test.dart, source-text checks
//   in Flutter, checked here by what the screens do (which event or exit each button sends, and
//   the fills where the palette matters).
// Not ported: waiting_screen_test's "the tick leaves the scaffold untouched" (a Flutter widget
// identity check); here the clock lives in its own ElapsedNotice component, as in Flutter.
// Plus the wizard itself (HubConnectWidget): each state's screen, Back, and "Stop Pairing?".

import React from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { installFakeServer } from '../../../helpers/fakeServer';
import { testDevice, testWifiNetwork } from '../../../helpers/pairingFixtures';
import { Icons } from '../../../../src/components/icons/iconData';
import {
  PageBackHandler,
  PopScope,
} from '../../../../src/components/layout/PopScope';
import { PairingStep } from '../../../../src/components/pairing/pairingStep';
import {
  PairingExitContext,
  PairingStepContext,
} from '../../../../src/components/pairing/PairingStepScaffold';
import {
  PopupHost,
  resetPopupsForTests,
} from '../../../../src/components/popups/popups';
import { ErrorOccurredEvent } from '../../../../src/screens/devices/connectHubToWifi/events/errorEvents';
import {
  BeginPairingHubEvent,
  CheckingHubIsPluggedInEvent,
} from '../../../../src/screens/devices/connectHubToWifi/events/hubSetupEvents';
import { SelectWifiNetworkEvent } from '../../../../src/screens/devices/connectHubToWifi/events/wifiNetworkEvents';
import { ConnectHubToWifiEvent } from '../../../../src/screens/devices/connectHubToWifi/events/wifiConnectionEvents';
import {
  HubConnectionBloc,
  HubConnectionEvent,
} from '../../../../src/screens/devices/connectHubToWifi/hubConnectionBloc';
import { HubConnectionBlocProvider } from '../../../../src/screens/devices/connectHubToWifi/HubConnectionBlocContext';
import { HubConnectWidget } from '../../../../src/screens/devices/connectHubToWifi/HubConnectWidget';
import { WaitingReason } from '../../../../src/screens/devices/connectHubToWifi/hubRegistrationCheck';
import {
  describeVerificationTimeout,
  HubRegistrationErrorCodes,
  ValidatingConnectionStep,
} from '../../../../src/screens/devices/connectHubToWifi/pairingErrorCodes';
import {
  AnErrorOccurredState,
  BeginPairingHubState,
  ConnectedToHubState,
  HubConnectedToWifiSuccessfullyState,
  HubConnectingToWifiState,
  HubConnectionState,
  ReestablishConnectionToServerState,
  ResettingHubWifiCredentialsState,
  SelectedNetworkState,
  SessionExpiredState,
} from '../../../../src/screens/devices/connectHubToWifi/states';
import { CheckIfHubIsPluggedInWidget } from '../../../../src/screens/devices/connectHubToWifi/widgets/CheckIfHubIsPluggedInWidget';
import { CheckingIfHubConnectedToServerWidget } from '../../../../src/screens/devices/connectHubToWifi/widgets/CheckingIfHubConnectedToServerWidget';
import { ConnectingToHubWidget } from '../../../../src/screens/devices/connectHubToWifi/widgets/ConnectingToHubWidget';
import { BeginPairingHubWidget } from '../../../../src/screens/devices/connectHubToWifi/widgets/BeginPairingHubWidget';
import { FailureWidget } from '../../../../src/screens/devices/connectHubToWifi/widgets/FailureWidget';
import { HubLightReadings } from '../../../../src/screens/devices/connectHubToWifi/widgets/HubLightReadings';
import { HubRevertedWidget } from '../../../../src/screens/devices/connectHubToWifi/widgets/HubRevertedWidget';
import { InitialConnectionWidget } from '../../../../src/screens/devices/connectHubToWifi/widgets/InitialConnectionWidget';
import { ListWifiNetworksWidget } from '../../../../src/screens/devices/connectHubToWifi/widgets/ListWifiNetworksWidget';
import { PairingStoppedWidget } from '../../../../src/screens/devices/connectHubToWifi/widgets/PairingStoppedWidget';
import { ReestablishConnectionToServerWidget } from '../../../../src/screens/devices/connectHubToWifi/widgets/ReestablishConnectionToServerWidget';
import { ResettingHubWidget } from '../../../../src/screens/devices/connectHubToWifi/widgets/ResettingHubWidget';
import { VerifyingHubStateWidget } from '../../../../src/screens/devices/connectHubToWifi/widgets/VerifyingHubStateWidget';
import { ViewWifiNetworkWidget } from '../../../../src/screens/devices/connectHubToWifi/widgets/ViewWifiNetworkWidget';
import { joinApprovalLabel } from '../../../../src/screens/devices/connectHubToWifi/connectionConstants';
import {
  DevicesBloc,
  GoToDevicesHomeScreen,
} from '../../../../src/state/devices/devicesBloc';
import { DevicesBlocProvider } from '../../../../src/state/devices/DevicesBlocContext';
import { kCartellBlue, kCartellLightGray } from '../../../../src/theme/colors';
import { ModeWatcherHelper } from '../../../../src/utilities/modeWatcher';

const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 36, left: 0, right: 0, bottom: 44 },
};

const devicesBloc = { add: jest.fn() };
const backHandlers: (() => boolean | null | undefined)[] = [];
let blocs: HubConnectionBloc[] = [];

/** A bloc that records events instead of handling them. */
class RecordingHubConnectionBloc extends HubConnectionBloc {
  recordedEvents: HubConnectionEvent[] = [];
  add(event: HubConnectionEvent): void {
    this.recordedEvents.push(event);
  }
}

/** Puts the bloc in `state`, as bloc's @visibleForTesting emit does. */
class EmitForTest implements HubConnectionEvent {
  constructor(private readonly state: HubConnectionState) {}
  async handleEvent(
    _bloc: HubConnectionBloc,
    emit: (state: HubConnectionState) => void,
  ) {
    emit(this.state);
  }
}

function newBloc(): HubConnectionBloc {
  const bloc = new HubConnectionBloc(testDevice());
  blocs.push(bloc);
  return bloc;
}

function frame(children: React.ReactNode) {
  return (
    <GestureHandlerRootView>
      <SafeAreaProvider initialMetrics={metrics}>
        <PageBackHandler />
        <DevicesBlocProvider bloc={devicesBloc as unknown as DevicesBloc}>
          <PopupHost>
            {/* DevicesRouter's PopScope, which keeps Back on the page. */}
            <PopScope canPop={false}>{children}</PopScope>
          </PopupHost>
        </DevicesBlocProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** One screen, as the wizard gives it: the bloc, a step, and an exit that records its use. */
async function showScreen(
  element: React.ReactElement,
  {
    bloc = newBloc(),
    step = PairingStep.none(),
    exits = [] as string[],
  }: { bloc?: HubConnectionBloc; step?: PairingStep; exits?: string[] } = {},
) {
  await render(
    frame(
      <HubConnectionBlocProvider bloc={bloc}>
        <PairingStepContext.Provider value={step}>
          <PairingExitContext.Provider
            value={{ request: () => exits.push('requested') }}
          >
            {element}
          </PairingExitContext.Provider>
        </PairingStepContext.Provider>
      </HubConnectionBlocProvider>,
    ),
  );
  await settle(0);
  return bloc;
}

/** The whole wizard for a bloc of the test's own. */
async function showWizard(bloc: HubConnectionBloc) {
  await render(frame(<HubConnectWidget device={bloc.device} bloc={bloc} />));
  await settle(0);
}

async function settle(ms = 400) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

async function press(text: string | RegExp) {
  await fireEvent.press(screen.getByText(text));
  await settle();
}

async function pressBack() {
  await act(async () => {
    for (const handler of [...backHandlers].reverse()) {
      if (handler()) {
        return;
      }
    }
  });
  await settle();
}

/** Where each text first appears in the rendered tree, top to bottom. */
function orderOf(...texts: string[]): number[] {
  const tree = JSON.stringify(screen.toJSON());
  return texts.map(text => tree.indexOf(JSON.stringify(text)));
}

/** The fill of the button labelled `text` (the nearest background up the tree). */
function fillOf(text: string): unknown {
  let node: ReturnType<typeof screen.getByText> | null = screen.getByText(text);
  while (node !== null) {
    const fill = StyleSheet.flatten(node.props.style)?.backgroundColor;
    if (fill !== undefined && fill !== 'transparent') {
      return fill;
    }
    node = node.parent;
  }
  return undefined;
}

/** The accessibility role of the nearest element with one, from `text` up. */
function roleOf(text: string): unknown {
  let node: ReturnType<typeof screen.getByText> | null = screen.getByText(text);
  while (node !== null) {
    if (node.props.accessibilityRole !== undefined) {
      return node.props.accessibilityRole;
    }
    node = node.parent;
  }
  return undefined;
}

const glyph = (icon: { codePoint: number }) =>
  screen.queryAllByText(String.fromCodePoint(icon.codePoint), {
    includeHiddenElements: true,
  });

const events = () => devicesBloc.add.mock.calls.map(call => call[0]);

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
  devicesBloc.add.mockClear();
  resetPopupsForTests();
  // The reconnect wait after an abandon asks Django's /test/.
  installFakeServer({ 'GET /test/': { status: 200 } });
  backHandlers.length = 0;
  jest
    .spyOn(BackHandler, 'addEventListener')
    .mockImplementation((_event, handler) => {
      backHandlers.push(handler as () => boolean);
      return {
        remove: () => {
          backHandlers.splice(
            backHandlers.indexOf(handler as () => boolean),
            1,
          );
        },
      };
    });
});

afterEach(() => {
  blocs.forEach(bloc => bloc.close());
  blocs = [];
  jest.restoreAllMocks();
  jest.useRealTimers();
  ModeWatcherHelper.isPairingDevices = false;
  ModeWatcherHelper.currentState = 'active';
});

describe('light check offers two kinds of No', () => {
  test('separates a wrong pattern from a light you cannot find', async () => {
    await showScreen(<VerifyingHubStateWidget />);
    expect(screen.getByText("I can't find the light")).toBeTruthy();
    expect(screen.getByText('It blinks differently')).toBeTruthy();
    // The single No is what collapsed both cases into a reset.
    expect(screen.queryByText('No')).toBeNull();
  });

  test('a wrong pattern confirms before resetting', async () => {
    await showScreen(<VerifyingHubStateWidget />);
    await press('It blinks differently');
    expect(screen.getByText(/erase/)).toBeTruthy();
    expect(screen.getByText('Reset the hub')).toBeTruthy();
    expect(screen.getByText('Keep trying')).toBeTruthy();

    await press('Keep trying');
    expect(screen.queryByText(/erase/)).toBeNull();
    expect(screen.getByText('It blinks differently')).toBeTruthy();
  });

  test('confirming the reset is what dispatches it', async () => {
    const bloc = await showScreen(<VerifyingHubStateWidget />);
    await press('It blinks differently');
    expect(bloc.state).not.toBeInstanceOf(ResettingHubWifiCredentialsState);

    await press('Reset the hub');
    expect(bloc.state).toBeInstanceOf(ResettingHubWifiCredentialsState);
    expect(screen.queryByText('Reset the hub')).toBeNull();
  });

  test('a light you cannot find gets help, not a reset', async () => {
    await showScreen(<VerifyingHubStateWidget />);
    await press("I can't find the light");
    // Once in the caption under the question, once in the help.
    expect(screen.getAllByText(/next to the antenna/)).toHaveLength(2);
    expect(screen.queryByText(/erase/)).toBeNull();
    expect(screen.getByText(/contact support/)).toBeTruthy();
    expect(screen.getByText('Contact support')).toBeTruthy();
  });

  test('"Contact support" closes the help (opening Contact Us is a gap)', async () => {
    await showScreen(<VerifyingHubStateWidget />);
    await press("I can't find the light");
    await press('Contact support');
    expect(screen.queryByText('Finding the Light on Your Hub')).toBeNull();
  });
});

describe('the reset screen the confirmation leads to', () => {
  test('names the button it tells you to press, once it appears after 3 s', async () => {
    await showScreen(<ResettingHubWidget />);
    expect(screen.queryByRole('button', { name: 'The Hub Reset' })).toBeNull();
    await settle(3000);
    expect(screen.getAllByText(/The Hub Reset/)).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'The Hub Reset' })).toBeTruthy();
    expect(screen.queryByText(/green button/)).toBeNull();
  });
});

describe('connect without a password', () => {
  test('an empty password confirms first, and "Go back" does not join the network', async () => {
    const bloc = await showScreen(
      <ViewWifiNetworkWidget network={testWifiNetwork()} />,
    );
    await press('Connect');
    expect(screen.getByText('Connect without a password?')).toBeTruthy();
    await press('Go back');
    expect(bloc.state).not.toBeInstanceOf(HubConnectingToWifiState);
    expect(screen.queryByText('Connect without a password?')).toBeNull();
  });

  test('"Connect anyway" is the button that joins it, with no password', async () => {
    const bloc = new RecordingHubConnectionBloc(testDevice());
    const network = testWifiNetwork();
    await showScreen(<ViewWifiNetworkWidget network={network} />, { bloc });
    await press('Connect');
    await press('Connect anyway');
    expect(bloc.recordedEvents).toHaveLength(1);
    const event = bloc.recordedEvents[0] as ConnectHubToWifiEvent;
    expect(event).toBeInstanceOf(ConnectHubToWifiEvent);
    expect(event.network).toBe(network);
    expect(event.networkPassword).toBe('');
  });
});

describe('the wifi password field', () => {
  async function pumpField() {
    const bloc = new RecordingHubConnectionBloc(testDevice());
    await showScreen(<ViewWifiNetworkWidget network={testWifiNetwork()} />, {
      bloc,
      step: new PairingStep(5, 6),
    });
    return bloc;
  }
  const type = (text: string) =>
    fireEvent.changeText(screen.getByTestId('wifi-password'), text);

  test('says nothing about a password that fits, and Connect sends it', async () => {
    const bloc = await pumpField();
    await type('a real password');
    expect(screen.queryByText(/too long/)).toBeNull();
    await press('Connect');
    expect(
      (bloc.recordedEvents[0] as ConnectHubToWifiEvent).networkPassword,
    ).toBe('a real password');
  });

  test('explains an over-long password as it is typed', async () => {
    await pumpField();
    await type('é'.repeat(33));
    expect(screen.getByText(/too long for the hub/)).toBeTruthy();
    expect(screen.getAllByText(/64/)).toHaveLength(1);
  });

  test('disables Connect rather than throwing on it', async () => {
    const bloc = await pumpField();
    await type('é'.repeat(33));
    await press('Connect');
    expect(bloc.recordedEvents).toEqual([]);
    expect(screen.queryByText('Connect without a password?')).toBeNull();
  });

  test('is not offered to the platform as a saved credential', async () => {
    await pumpField();
    const field = screen.getByTestId('wifi-password');
    expect(field.props.importantForAutofill).toBe('no');
    expect(field.props.autoComplete).toBe('off');
    expect(field.props.autoCorrect).toBe(false);
    expect(field.props.secureTextEntry).toBe(true);
  });

  test('the eye shows and hides it', async () => {
    await pumpField();
    await fireEvent.press(glyph(Icons.visibility)[0]);
    expect(screen.getByTestId('wifi-password').props.secureTextEntry).toBe(
      false,
    );
  });

  test('clears once the password is shortened again', async () => {
    await pumpField();
    await type('é'.repeat(33));
    expect(screen.getByText(/too long/)).toBeTruthy();
    await type('shorter');
    expect(screen.queryByText(/too long/)).toBeNull();
  });

  test('"Back to networks" starts a new scan', async () => {
    const bloc = await pumpField();
    await press('Back to networks');
    expect(bloc.recordedEvents[0].constructor.name).toBe(
      'RefreshHubWifiNetworksEvent',
    );
  });
});

describe('wifi network rows', () => {
  test('a network row is a button, and tapping it selects the network', async () => {
    const bloc = newBloc();
    const network = testWifiNetwork();
    bloc.wifiNetworks.set(network.ssid, network);
    await showScreen(<ListWifiNetworksWidget />, { bloc });

    expect(roleOf(network.ssid)).toBe('button');
    await press(network.ssid);
    expect(bloc.state).toBeInstanceOf(SelectedNetworkState);
    expect((bloc.state as SelectedNetworkState).wifiNetwork).toBe(network);
  });

  test('each row shows its signal over a full glyph', async () => {
    const bloc = newBloc();
    bloc.wifiNetworks.set('Far', testWifiNetwork({ ssid: 'Far', rssi: -85 }));
    await showScreen(<ListWifiNetworksWidget />, { bloc });
    expect(glyph(Icons.wifi_1_bar)).toHaveLength(1);
  });
});

describe('empty scan states', () => {
  test('shows a spinner, not the guidance, before the scan settles', async () => {
    await showScreen(<ListWifiNetworksWidget />);
    expect(screen.getByText('Looking for networks...')).toBeTruthy();
    expect(screen.queryByText('No networks found')).toBeNull();
  });

  test('shows guidance once an empty scan has settled', async () => {
    await showScreen(<ListWifiNetworksWidget />);
    await settle(9000);
    expect(screen.getByText('No networks found')).toBeTruthy();
    expect(screen.queryByText('Looking for networks...')).toBeNull();
    expect(screen.getAllByText(/2.4GHz networks/)).toHaveLength(1);
  });

  test('refreshing reopens the looking-for-networks window', async () => {
    const bloc = await showScreen(<ListWifiNetworksWidget />);
    await settle(9000);
    expect(screen.getByText('No networks found')).toBeTruthy();

    bloc.wifiNetworks = new Map();
    bloc.scanGeneration += 1;
    await act(async () => bloc.add(new BeginPairingHubEvent()));
    expect(screen.getByText('Looking for networks...')).toBeTruthy();
    expect(screen.queryByText('No networks found')).toBeNull();

    await settle(9000);
    expect(screen.getByText('No networks found')).toBeTruthy();
  });

  test('an ordinary rebuild does not reopen a settled window', async () => {
    const bloc = await showScreen(<ListWifiNetworksWidget />);
    await settle(9000);
    await act(async () => bloc.add(new BeginPairingHubEvent()));
    expect(screen.getByText('No networks found')).toBeTruthy();
    expect(screen.queryByText('Looking for networks...')).toBeNull();
  });
});

describe('pairing copy names controls that exist', () => {
  test('the countdown names the button it gates, and turns it on after 15 s', async () => {
    const bloc = new RecordingHubConnectionBloc(testDevice());
    await showScreen(<BeginPairingHubWidget />, { bloc });
    expect(screen.getAllByText(/Start Pairing/)).toHaveLength(2);
    expect(screen.getAllByText(/switch/)).toHaveLength(1);
    expect(screen.getByText('15')).toBeTruthy();

    await press('Start Pairing');
    expect(bloc.recordedEvents).toEqual([]);

    await settle(15_000);
    expect(screen.queryByText('1')).toBeNull();
    expect(glyph({ codePoint: 0xf00c }).length).toBeGreaterThan(0);
    await press('Start Pairing');
    expect(bloc.recordedEvents[0]).toBeInstanceOf(CheckingHubIsPluggedInEvent);
  });

  test('the wifi screen names the button it actually has', async () => {
    await showScreen(<ListWifiNetworksWidget />);
    expect(screen.getAllByText(/Refresh Wifi Networks/)).toHaveLength(1);
    expect(screen.queryByText(/Scan for WiFi Networks/)).toBeNull();
  });
});

describe('help dialogs describe the screen they open from', () => {
  const openHelp = async (element: React.ReactElement) => {
    await showScreen(element);
    await fireEvent.press(screen.getByLabelText('Help with this step'));
    await settle();
  };

  test('the plug-in help explains plugging in, not the light pattern', async () => {
    await openHelp(<CheckIfHubIsPluggedInWidget />);
    expect(screen.getByText('Plugging In Your Hub')).toBeTruthy();
    expect(screen.queryByText(/Help Verifying the Light/)).toBeNull();
    expect(screen.queryByText(/blinking in the correct pattern/)).toBeNull();
  });

  test('the connect help names only controls this screen has', async () => {
    await openHelp(<InitialConnectionWidget />);
    expect(screen.getByText('Connecting to Your Hub')).toBeTruthy();
    expect(screen.getAllByText(/Connect to Hub/)).toHaveLength(2);
    expect(screen.queryByText(/Go to Settings/)).toBeNull();
    expect(screen.queryByText(/I've connected to the HUB/)).toBeNull();
  });

  test('help explains why the phone is asking at all', async () => {
    await openHelp(<ConnectingToHubWidget />);
    expect(screen.getByText("Joining the HUB's Network")).toBeTruthy();
    expect(screen.getByText(/leaves your home network/)).toBeTruthy();
    expect(screen.getByText(/times out/)).toBeTruthy();
  });
});

describe('the connecting step prepares the user for the OS network prompt', () => {
  test('the body names the prompt rather than being empty', async () => {
    await showScreen(<ConnectingToHubWidget />);
    expect(
      screen.getByText(
        `Tap "${joinApprovalLabel()}" if your phone asks for permission.`,
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(/Pairing cannot continue until you answer/),
    ).toBeTruthy();
    expect(screen.queryByText(/only asks the first time/)).toBeNull();
  });

  test('the timeout headline stays short enough to be a headline', () => {
    const failure = describeVerificationTimeout({
      repliesReceived: 0,
      stage: ValidatingConnectionStep.GettingFw,
      approvalLabel: 'Connect',
    });
    expect(failure.message.length).toBeLessThan(60);
    expect(failure.message).not.toContain('\n');
    expect(failure.detail).toContain('tap "Connect"');
  });

  test('the failure screen renders the detail below the headline', async () => {
    const failure = describeVerificationTimeout({
      repliesReceived: 0,
      stage: ValidatingConnectionStep.GettingFw,
      approvalLabel: 'Connect',
    });
    await showScreen(
      <FailureWidget
        message={failure.message}
        detail={failure.detail}
        code={failure.code}
      />,
    );
    expect(screen.getByText(failure.message)).toBeTruthy();
    expect(screen.getByText(failure.detail as string)).toBeTruthy();
    expect(screen.getByText('Error: 762c844a-0')).toBeTruthy();
    const [headline, detail] = orderOf(
      failure.message,
      failure.detail as string,
    );
    expect(headline).toBeLessThan(detail);
  });
});

describe('PairingStoppedWidget', () => {
  test('leads with the hub possibly already being connected, and claims no failure', async () => {
    await showScreen(<PairingStoppedWidget />);
    expect(screen.getByText(/may already be connected/)).toBeTruthy();
    expect(screen.getByText(/Check your Devices list/)).toBeTruthy();
    expect(screen.queryByText(/failed/)).toBeNull();
  });

  test('offers Return to Devices before Begin Pairing Again', async () => {
    await showScreen(<PairingStoppedWidget />);
    const [leave, retry] = orderOf('Return to Devices', 'Begin Pairing Again');
    expect(leave).toBeLessThan(retry);
  });

  test('shows the stage-specific error code', async () => {
    await showScreen(<PairingStoppedWidget />);
    expect(
      screen.getByText(
        `Code: ${HubRegistrationErrorCodes.cancelledWhileWaiting}`,
      ),
    ).toBeTruthy();
  });

  test('spends no amber: neither action completes the task', async () => {
    await showScreen(<PairingStoppedWidget />);
    expect(fillOf('Return to Devices')).toBe(kCartellBlue);
    expect(fillOf('Begin Pairing Again')).toBe(kCartellBlue);
  });
});

describe('the hub reverted screen', () => {
  test('says the hub did not join, without saying why', async () => {
    await showScreen(<HubRevertedWidget />);
    expect(screen.getByText(/could not join/)).toBeTruthy();
    expect(screen.queryByText(/wrong password/)).toBeNull();
  });

  test('lists the password first, as the usual cause', async () => {
    await showScreen(<HubRevertedWidget />);
    const [password, range, router] = orderOf(
      'The Wi-Fi password, which is the usual cause.',
      'That the hub is close enough to your router.',
      'That your router is powered on and its network is up.',
    );
    expect(password).toBeLessThan(range);
    expect(range).toBeLessThan(router);
  });

  test('shows the light the hub is actually showing, a retry and a way out, and no step', async () => {
    await showScreen(<HubRevertedWidget />);
    expect(screen.getAllByTestId('hub-light')).toHaveLength(1);
    expect(screen.getByText('Try Again')).toBeTruthy();
    expect(screen.getByText('Return to Devices')).toBeTruthy();
    expect(screen.queryByText(/Step /)).toBeNull();
  });
});

describe('the light readings panel', () => {
  test('asks the user to read the light, asserts no cause, and offers four readings', async () => {
    await showScreen(<HubLightReadings />);
    for (const claim of [/failed/, /wrong password/, /could not/]) {
      expect(screen.queryByText(claim)).toBeNull();
    }
    expect(screen.getByText(/light on it/)).toBeTruthy();
    expect(screen.getByText(/No power/)).toBeTruthy();
    expect(screen.getByText(/Already set up/)).toBeTruthy();
    expect(screen.getByText(/no internet/)).toBeTruthy();
    expect(screen.getByText(/Still waiting for setup/)).toBeTruthy();
    // A light against a light: three play their pattern; the fourth is the absence of one.
    expect(screen.getAllByTestId('hub-light')).toHaveLength(3);
    expect(screen.getByLabelText('No light')).toBeTruthy();
  });
});

describe('the waiting screen', () => {
  const waiting = (agoMs: number, reason = WaitingReason.waitingForHub) =>
    showScreen(
      <CheckingIfHubConnectedToServerWidget
        startedAt={Date.now() - agoMs}
        reason={reason}
      />,
    );

  test('shows the readings only when told to, whatever the label', async () => {
    for (const reason of Object.values(WaitingReason)) {
      for (const showLightReadings of [false, true]) {
        await showScreen(
          <CheckingIfHubConnectedToServerWidget
            startedAt={Date.now()}
            reason={reason}
            showLightReadings={showLightReadings}
          />,
        );
        expect(screen.queryByText(/has not reached us yet/) !== null).toBe(
          showLightReadings,
        );
      }
    }
  });

  test('reads 0:00 at the start, then counts every second', async () => {
    await waiting(0);
    expect(screen.getByText('0:00 elapsed')).toBeTruthy();
    await settle(1000);
    expect(screen.getByText('0:01 elapsed')).toBeTruthy();
  });

  test('zero-pads seconds past the first minute', async () => {
    await waiting(125_000);
    expect(screen.getByText('2:05 elapsed')).toBeTruthy();
  });

  test('the patience copy is absent at 59 s and appears at 60 s', async () => {
    await waiting(59_000);
    expect(screen.queryByText(/take a few minutes/)).toBeNull();
    await waiting(60_000);
    expect(screen.getByText(/take a few minutes/)).toBeTruthy();
  });

  test('pairs each reason with its own icon and copy', async () => {
    const cases: [WaitingReason, { codePoint: number }, RegExp][] = [
      [WaitingReason.rejoiningNetwork, Icons.sync, /Reconnecting your phone/],
      [WaitingReason.waitingForHub, Icons.router, /Waiting for your hub/],
      [
        WaitingReason.reachingServer,
        Icons.wifi_off,
        /Having trouble reaching Cartell/,
      ],
      [WaitingReason.checkingHub, Icons.travel_explore, /Checking on your hub/],
      [
        WaitingReason.hubNotAnswering,
        Icons.lightbulb_outline,
        /Still waiting for your hub/,
      ],
    ];
    for (const [reason, icon, copy] of cases) {
      await waiting(0, reason);
      expect(glyph(icon)).toHaveLength(1);
      expect(screen.getByText(copy)).toBeTruthy();
    }
  });

  test('reason text is Gravel, matching its icon deliberately', async () => {
    await waiting(0);
    const label = screen.getByText(/Waiting for your hub/);
    expect(StyleSheet.flatten(label.props.style).color).toBe(kCartellLightGray);
  });
});

describe('the screens ask for the exit rather than leaving on their own', () => {
  test('the waiting screen asks for the exit rather than cancelling the poll itself', async () => {
    const bloc = new RecordingHubConnectionBloc(testDevice());
    const exits: string[] = [];
    await showScreen(
      <CheckingIfHubConnectedToServerWidget
        startedAt={Date.now()}
        reason={WaitingReason.waitingForHub}
      />,
      { bloc, exits },
    );
    await press('Cancel');
    expect(exits).toEqual(['requested']);
    expect(bloc.recordedEvents).toEqual([]);
  });

  test('ConnectingToHubWidget asks for the exit rather than dispatching its own abandon', async () => {
    const bloc = new RecordingHubConnectionBloc(testDevice());
    const exits: string[] = [];
    await showScreen(<ConnectingToHubWidget />, { bloc, exits });
    await press('Cancel');
    expect(exits).toEqual(['requested']);
    expect(bloc.recordedEvents).toEqual([]);
  });

  test('each abandonable screen gets a distinct code', () => {
    const codes = [
      'ConnectingToHubState',
      'VerifyingHubConnectionState',
      'ConnectedToHubState',
      'SelectedNetworkState',
      'HubConnectingToWifiState',
      'ReestablishConnectionToServerState',
    ].map(name => {
      const states = require('../../../../src/screens/devices/connectHubToWifi/states');
      const state =
        name === 'SelectedNetworkState'
          ? new states.SelectedNetworkState(testWifiNetwork())
          : new states[name]();
      return HubRegistrationErrorCodes.cancelledAt(state);
    });
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('ReestablishConnectionToServerWidget keeps its own Cancel', () => {
  test('it dispatches exactly one ErrorOccurredEvent', async () => {
    const bloc = new RecordingHubConnectionBloc(testDevice());
    await showScreen(<ReestablishConnectionToServerWidget />, { bloc });
    await press('Cancel');
    expect(bloc.recordedEvents).toHaveLength(1);
    const event = bloc.recordedEvents[0] as ErrorOccurredEvent;
    expect(event).toBeInstanceOf(ErrorOccurredEvent);
    expect(event.errorCode).toBe('d63f9b07');
  });

  test('while a teardown owns the flow it asks the wait to stop instead', async () => {
    const bloc = new RecordingHubConnectionBloc(testDevice());
    bloc.teardownInFlight = true;
    await showScreen(<ReestablishConnectionToServerWidget />, { bloc });
    await press('Cancel');
    expect(bloc.recordedEvents).toEqual([]);
    expect(bloc.abandonRequested).toBe(true);
  });
});

describe('the wizard (HubConnectWidget)', () => {
  test('opens on step 1, "Getting Your Hub Ready"', async () => {
    await showWizard(newBloc());
    expect(screen.getByText('Step 1 of 6')).toBeTruthy();
    expect(screen.getByText('Getting Your Hub Ready')).toBeTruthy();
  });

  test('each state shows its screen, with its step number', async () => {
    const bloc = newBloc();
    await showWizard(bloc);
    await act(async () => bloc.add(new CheckingHubIsPluggedInEvent()));
    expect(screen.getByText('Plug in Hub')).toBeTruthy();
    expect(screen.getByText('Step 2 of 6')).toBeTruthy();

    await act(async () => bloc.add(new EmitForTest(new ConnectedToHubState())));
    expect(screen.getByText('Select WiFi Network')).toBeTruthy();
    expect(screen.getByText('Step 5 of 6')).toBeTruthy();

    await act(async () =>
      bloc.add(new EmitForTest(new HubConnectedToWifiSuccessfullyState())),
    );
    expect(
      screen.getByText('Hub has successfully connected to the network.'),
    ).toBeTruthy();
    expect(screen.queryByText(/Step /)).toBeNull();
    await press('Continue');
    expect(events()[0]).toBeInstanceOf(GoToDevicesHomeScreen);
  });

  test('an expired session shows its own failure', async () => {
    const bloc = newBloc();
    await showWizard(bloc);
    await act(async () => bloc.add(new EmitForTest(new SessionExpiredState())));
    expect(
      screen.getByText(
        'Your session has expired.\nPlease sign in again to finish setting up your hub.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Error: e5b1907d-A')).toBeTruthy();
  });

  test('an error shows its message, detail and code; Begin Pairing Again starts over', async () => {
    const bloc = newBloc();
    await showWizard(bloc);
    await act(async () =>
      bloc.add(
        new EmitForTest(
          new AnErrorOccurredState({
            errorMessage: 'Headline',
            errorCode: 'abc',
            errorDetail: 'Detail',
          }),
        ),
      ),
    );
    expect(screen.getByText('Headline')).toBeTruthy();
    expect(screen.getByText('Detail')).toBeTruthy();
    expect(screen.getByText('Error: abc')).toBeTruthy();
    await press('Begin Pairing Again');
    expect(bloc.state).toBeInstanceOf(BeginPairingHubState);
  });

  test('Back where nothing is at stake leaves at once', async () => {
    await showWizard(newBloc());
    await pressBack();
    expect(screen.queryByText('Stop Pairing?')).toBeNull();
    expect(events()).toHaveLength(1);
    expect(events()[0]).toBeInstanceOf(GoToDevicesHomeScreen);
  });

  test('Back mid-provision asks first; "Keep pairing" stays', async () => {
    const bloc = newBloc();
    await showWizard(bloc);
    await act(async () =>
      bloc.add(new SelectWifiNetworkEvent(testWifiNetwork())),
    );
    await pressBack();
    expect(screen.getByText('Stop Pairing?')).toBeTruthy();
    await press('Keep pairing');
    expect(screen.queryByText('Stop Pairing?')).toBeNull();
    expect(events()).toEqual([]);
    expect(bloc.state).toBeInstanceOf(SelectedNetworkState);
  });

  test('"Stop pairing" abandons with the code for where the user was', async () => {
    const bloc = newBloc();
    await showWizard(bloc);
    await act(async () => bloc.add(new EmitForTest(new ConnectedToHubState())));
    // The screen's exit button and Back ask the same question.
    await press('Cancel');
    expect(screen.getByText('Stop Pairing?')).toBeTruthy();
    await press('Stop pairing');
    expect(bloc.state).toBeInstanceOf(ReestablishConnectionToServerState);
    await settle(10_000);
    expect((bloc.state as AnErrorOccurredState).errorCode).toBe('e5b1907d-N');
    expect(events()).toEqual([]);
  });

  test('a state that became poppable while the dialog was open is not torn down', async () => {
    const bloc = newBloc();
    await showWizard(bloc);
    await act(async () =>
      bloc.add(new SelectWifiNetworkEvent(testWifiNetwork())),
    );
    await pressBack();
    expect(screen.getByText('Stop Pairing?')).toBeTruthy();

    // The bloc moves on by itself while the user is still reading.
    await act(async () => bloc.add(new BeginPairingHubEvent()));
    await press('Stop pairing');

    expect(bloc.state).toBeInstanceOf(BeginPairingHubState);
    expect(events()).toHaveLength(1);
    expect(events()[0]).toBeInstanceOf(GoToDevicesHomeScreen);
  });

  test('closing the wizard closes its bloc, unless the bloc was given', async () => {
    const given = newBloc();
    await showWizard(given);
    await act(async () => screen.unmount());
    expect(given.isClosed).toBe(false);

    const close = jest.spyOn(HubConnectionBloc.prototype, 'close');
    await render(frame(<HubConnectWidget device={testDevice()} />));
    await act(async () => screen.unmount());
    expect(close).toHaveBeenCalledTimes(1);
  });
});
