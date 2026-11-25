// Ported from frontend/test/components/pairing/pairing_step_scaffold_test.dart, plus the
// scaffold's behaviour with no step above it (Add Hub's failure page, quirk Q14). Order on screen
// is read from the rendered tree, top to bottom.

import React from 'react';
import { Text, View } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RoundedButton } from '../../src/components/buttons/RoundedButton';
import { pairingStepIndex } from '../../src/screens/devices/connectHubToWifi/pairingStepIndex';
import { PairingStep } from '../../src/components/pairing/pairingStep';
import {
  PairingExitContext,
  PairingStepContext,
  PairingStepScaffold,
  ProviderNotFoundException,
} from '../../src/components/pairing/PairingStepScaffold';
import { ResettingHubWifiCredentialsState } from '../../src/screens/devices/connectHubToWifi/states';

let mockWindow = { width: 400, height: 1200, scale: 1, fontScale: 1 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockWindow,
}));

const metrics = {
  frame: { x: 0, y: 0, width: 400, height: 1200 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function show(
  element: React.ReactElement,
  step: PairingStep,
  exits: string[] = [],
) {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <PairingStepContext.Provider value={step}>
        <PairingExitContext.Provider
          value={{ request: () => exits.push('requested') }}
        >
          {element}
        </PairingExitContext.Provider>
      </PairingStepContext.Provider>
    </SafeAreaProvider>,
  );
}

/** Where each text first appears in the rendered tree, top to bottom. */
function orderOf(...texts: string[]): number[] {
  const tree = JSON.stringify(screen.toJSON());
  return texts.map(text => tree.indexOf(JSON.stringify(text)));
}

beforeEach(() => {
  mockWindow = { width: 400, height: 1200, scale: 1, fontScale: 1 };
});

describe('PairingStepScaffold', () => {
  test('shows the step count on a numbered step', async () => {
    await show(
      <PairingStepScaffold title="Plug in Hub" />,
      new PairingStep(2, 6),
    );
    expect(screen.getByText('Step 2 of 6')).toBeTruthy();
  });

  test('shows no count on a terminal screen', async () => {
    await show(
      <PairingStepScaffold title="Pairing stopped" />,
      PairingStep.none(),
    );
    expect(screen.queryByText(/Step/)).toBeNull();
  });

  test('the wizard numbers each screen from its state', async () => {
    // The reset detour is repair, not progress.
    expect(
      pairingStepIndex(new ResettingHubWifiCredentialsState()).isNumbered,
    ).toBe(false);
  });

  test('names the screen in the body; the app bar carries the logo', async () => {
    await show(
      <PairingStepScaffold title="Plug in Hub" />,
      new PairingStep(2, 6),
    );
    expect(screen.getAllByText('Plug in Hub')).toHaveLength(1);
    // The bar holds one image, the logo, and no text.
    expect(JSON.stringify(screen.toJSON())).toContain('"type":"Image"');
  });

  test('offers no global navigation on a phone', async () => {
    await show(
      <PairingStepScaffold title="Select WiFi Network" />,
      new PairingStep(5, 6),
    );
    // Wandering off mid-pairing leaves the phone on the hub's network.
    expect(screen.queryByLabelText('Open navigation menu')).toBeNull();
  });

  test('offers no navigation rail on a tablet either', async () => {
    mockWindow = { width: 1600, height: 1200, scale: 1, fontScale: 1 };
    await show(
      <PairingStepScaffold title="Select WiFi Network" />,
      new PairingStep(5, 6),
    );
    expect(screen.queryByText('HUBs')).toBeNull();
  });

  test('renders a help FAB only when help is supplied', async () => {
    await show(<PairingStepScaffold title="A" />, PairingStep.none());
    expect(screen.queryByLabelText('Help with this step')).toBeNull();

    const help = jest.fn();
    await show(
      <PairingStepScaffold title="A" help={help} />,
      PairingStep.none(),
    );
    await fireEvent.press(screen.getByLabelText('Help with this step'));
    expect(help).toHaveBeenCalledTimes(1);
  });

  test("orders the body title -> hero -> subtitle, per DESIGN.md's rhythm", async () => {
    await show(
      <PairingStepScaffold
        title="Plug in Hub"
        subtitle="Is your hub plugged in?"
        hero={<Text>hero</Text>}
      />,
      PairingStep.none(),
    );
    const [title, hero, subtitle] = orderOf(
      'Plug in Hub',
      'hero',
      'Is your hub plugged in?',
    );
    expect(hero).toBeGreaterThan(title);
    expect(hero).toBeLessThan(subtitle);
  });

  test('heroLeads puts the hero above the title, for outcome screens', async () => {
    await show(
      <PairingStepScaffold
        title="Pairing stopped"
        hero={<Text>hero</Text>}
        heroLeads
      />,
      PairingStep.none(),
    );
    const [title, hero] = orderOf('Pairing stopped', 'hero');
    expect(hero).toBeLessThan(title);
  });

  test('with no step above it, it throws as it is built, as package:provider does', async () => {
    const spy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    await expect(
      render(
        <SafeAreaProvider initialMetrics={metrics}>
          <PairingStepScaffold title="x" />
        </SafeAreaProvider>,
      ),
    ).rejects.toThrow(ProviderNotFoundException);
    spy.mockRestore();
  });
});

describe('the way out', () => {
  test('renders no exit unless the screen asks for one', async () => {
    await show(
      <PairingStepScaffold title="Plug in Hub" />,
      new PairingStep(1, 6),
    );
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  test('names the exit what the screen calls it', async () => {
    await show(
      <PairingStepScaffold
        title="Pairing stopped"
        exitLabel="Return to Devices"
      />,
      PairingStep.none(),
    );
    expect(screen.getByText('Return to Devices')).toBeTruthy();
  });

  test('the exit asks the flow, it does not navigate itself', async () => {
    const exits: string[] = [];
    await show(
      <PairingStepScaffold title="Plug in Hub" exitLabel="Cancel" />,
      new PairingStep(1, 6),
      exits,
    );
    await fireEvent.press(screen.getByText('Cancel'));
    expect(exits).toEqual(['requested']);
  });

  test('sits under the step actions by default', async () => {
    await show(
      <PairingStepScaffold title="Plug in Hub" exitLabel="Cancel">
        <RoundedButton onPressed={() => undefined} title="Continue" />
      </PairingStepScaffold>,
      new PairingStep(1, 6),
    );
    const [cancel, cont] = orderOf('Cancel', 'Continue');
    expect(cancel).toBeGreaterThan(cont);
  });

  test('leads when the screen says leaving is the recommendation', async () => {
    await show(
      <PairingStepScaffold
        title="Pairing stopped"
        exitLabel="Return to Devices"
        exitLeads
      >
        <View>
          <RoundedButton
            onPressed={() => undefined}
            title="Begin Pairing Again"
          />
        </View>
      </PairingStepScaffold>,
      PairingStep.none(),
    );
    const [leave, retry] = orderOf('Return to Devices', 'Begin Pairing Again');
    expect(leave).toBeLessThan(retry);
  });
});
