// Ported from frontend/test/components/env_banner_test.dart

import React, { useState } from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { EnvBanner } from '../../src/components/EnvBanner';
import {
  getEnvironmentName,
  setEnvironmentName,
} from '../../src/config/environment';

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function mount(child: React.ReactNode) {
  return render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      {child}
    </SafeAreaProvider>,
  );
}

/** A child with state to lose, so a remount at EnvBanner's slot is observable. */
function Counter() {
  const [count, setCount] = useState(0);
  return <Text onPress={() => setCount(c => c + 1)}>{`count: ${count}`}</Text>;
}

describe('EnvBanner', () => {
  const original = getEnvironmentName();
  afterEach(async () => {
    await act(async () => setEnvironmentName(original));
  });

  test('shows the environment name when not LIVE', async () => {
    setEnvironmentName('TEST');
    await mount(
      <EnvBanner>
        <Text>content</Text>
      </EnvBanner>,
    );
    expect(screen.getByText('TEST SERVER')).toBeTruthy();
    expect(screen.getByText('content')).toBeTruthy();
  });

  test('shows no banner on a LIVE build', async () => {
    setEnvironmentName('LIVE');
    await mount(
      <EnvBanner>
        <Text>content</Text>
      </EnvBanner>,
    );
    expect(screen.queryByText('LIVE SERVER')).toBeNull();
    expect(screen.queryByText(/SERVER/)).toBeNull();
    expect(screen.getByText('content')).toBeTruthy();
  });

  test('reflects a runtime environment switch', async () => {
    setEnvironmentName('LIVE');
    await mount(
      <EnvBanner>
        <Text>content</Text>
      </EnvBanner>,
    );
    expect(screen.queryByText(/SERVER/)).toBeNull();

    await act(async () => setEnvironmentName('BETA'));
    expect(screen.getByText('BETA SERVER')).toBeTruthy();
  });

  test('preserves its child across a runtime environment switch', async () => {
    setEnvironmentName('TEST');
    await mount(
      <EnvBanner>
        <Counter />
      </EnvBanner>,
    );

    await fireEvent.press(screen.getByText('count: 0'));
    expect(screen.getByText('count: 1')).toBeTruthy();

    await act(async () => setEnvironmentName('LIVE'));

    expect(screen.queryByText(/SERVER/)).toBeNull();
    // The child must keep its state when the banner appears or disappears.
    expect(screen.getByText('count: 1')).toBeTruthy();
  });

  test('returns the same tree shape whether or not the banner shows', async () => {
    // One shape for every environment: the child is always the first element under the same
    // root, so nothing below EnvBanner changes type.
    setEnvironmentName('LIVE');
    const { toJSON } = await mount(
      <EnvBanner>
        <Counter />
      </EnvBanner>,
    );
    // toJSON() is SafeAreaProvider's view; its only child is the EnvBanner root View.
    type Node = { type: string; children: Node[] | null };
    const bannerChildren = () =>
      ((toJSON() as Node).children ?? [])[0].children ?? [];

    const liveChildren = bannerChildren();
    expect(liveChildren).toHaveLength(1);

    await act(async () => setEnvironmentName('TEST'));
    const testChildren = bannerChildren();
    expect(testChildren).toHaveLength(2);
    expect(testChildren[0]).toEqual(liveChildren[0]);
    expect(screen.getByText('TEST SERVER')).toBeTruthy();
  });
});
