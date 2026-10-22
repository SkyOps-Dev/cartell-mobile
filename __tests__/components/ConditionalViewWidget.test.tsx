// Ported from frontend/test/components/conditional_view_widget_test.dart, plus the quirk Q34
// check: a new request on every build of its parent.

import React, { useReducer } from 'react';
import { Pressable, Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ConditionalViewWidget } from '../../src/components/ConditionalViewWidget';
import { flush } from '../helpers/fakeServer';

const child = <Text>shown</Text>;

test('renders the child when shouldRender resolves to true', async () => {
  await render(
    <ConditionalViewWidget shouldRender={async () => true}>
      {child}
    </ConditionalViewWidget>,
  );
  await act(flush);
  expect(screen.getByText('shown')).toBeTruthy();
});

test('hides the child when shouldRender resolves to false', async () => {
  await render(
    <ConditionalViewWidget shouldRender={async () => false}>
      {child}
    </ConditionalViewWidget>,
  );
  await act(flush);
  expect(screen.queryByText('shown')).toBeNull();
});

test('renders nothing user-facing when the future throws', async () => {
  await render(
    <ConditionalViewWidget
      shouldRender={async () => {
        throw new Error('boom');
      }}
    >
      {child}
    </ConditionalViewWidget>,
  );
  await act(flush);
  expect(screen.queryByText(/boom/)).toBeNull();
  expect(screen.queryByText(/Error/)).toBeNull();
  expect(screen.queryByText('shown')).toBeNull();
});

test('hides the child while the future is still loading', async () => {
  let resolve!: (value: boolean) => void;
  const pending = new Promise<boolean>(r => {
    resolve = r;
  });
  await render(
    <ConditionalViewWidget shouldRender={() => pending}>
      {child}
    </ConditionalViewWidget>,
  );
  expect(screen.queryByText('shown')).toBeNull();
  await act(async () => {
    resolve(false);
    await flush();
  });
});

test('asks again on every build of its parent, keeping the last answer meanwhile (Q34)', async () => {
  const answers: ((value: boolean) => void)[] = [];
  const shouldRender = jest.fn(
    () => new Promise<boolean>(resolve => answers.push(resolve)),
  );
  function Parent() {
    const [, rebuild] = useReducer((n: number) => n + 1, 0);
    return (
      <>
        <Pressable onPress={rebuild}>
          <Text>rebuild</Text>
        </Pressable>
        <ConditionalViewWidget shouldRender={shouldRender}>
          {child}
        </ConditionalViewWidget>
      </>
    );
  }
  await render(<Parent />);
  expect(shouldRender).toHaveBeenCalledTimes(1);
  await act(async () => {
    answers[0](true);
    await flush();
  });
  expect(screen.getByText('shown')).toBeTruthy();
  // The child's own update does not ask again; only the parent's build does.
  expect(shouldRender).toHaveBeenCalledTimes(1);

  await fireEvent.press(screen.getByText('rebuild'));
  expect(shouldRender).toHaveBeenCalledTimes(2);
  // Still shown while the second answer is pending (FutureBuilder keeps its data).
  expect(screen.getByText('shown')).toBeTruthy();
  await act(async () => {
    answers[1](false);
    await flush();
  });
  expect(screen.queryByText('shown')).toBeNull();
});
