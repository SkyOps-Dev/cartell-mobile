// Ported from frontend/test/components/friendly_error_view_test.dart.

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { FriendlyErrorView } from '../../src/components/FriendlyErrorView';
import { Icons } from '../../src/components/icons/iconData';
import {
  AccountFetchFailedException,
  AuthExpiredException,
} from '../../src/services/exceptions';

describe('message selection', () => {
  test('shows the session-expired message for AuthExpiredException', async () => {
    await render(
      <FriendlyErrorView error={new AuthExpiredException('expired')} />,
    );
    expect(
      screen.getByText('Your session has expired. Please sign in again.'),
    ).toBeTruthy();
  });

  test('shows a try-again message for AccountFetchFailedException', async () => {
    await render(
      <FriendlyErrorView
        error={new AccountFetchFailedException('500 error')}
      />,
    );
    expect(
      screen.getByText(
        "We couldn't load your account information. Please try again.",
      ),
    ).toBeTruthy();
  });

  test('shows a generic message for an unknown error type', async () => {
    await render(<FriendlyErrorView error={new Error('some random thing')} />);
    expect(
      screen.getByText('Something went wrong. Please try again.'),
    ).toBeTruthy();
  });

  test('never renders the raw error text', async () => {
    const raw = "Instance of 'NoAccountInformationFoundException'";
    await render(<FriendlyErrorView error={raw} />);
    expect(screen.queryByText(raw)).toBeNull();
  });

  test.each([
    ['an int', 42, '42'],
    ['a map', { code: 'NETWORK', detail: 'down' }, 'NETWORK'],
    ['a list', ['a', 'b'], 'a,b'],
  ])(
    '%s renders the generic message, never itself',
    async (_name, error, text) => {
      await render(<FriendlyErrorView error={error} />);
      expect(screen.getByText(/went wrong/)).toBeTruthy();
      expect(screen.queryByText(new RegExp(text))).toBeNull();
    },
  );
});

describe('Retry button', () => {
  test('shows only when onRetry is given, and calls it once per tap', async () => {
    const error = new AccountFetchFailedException('boom');
    const { rerender } = await render(<FriendlyErrorView error={error} />);
    expect(screen.queryByText('Retry')).toBeNull();

    const onRetry = jest.fn();
    await rerender(<FriendlyErrorView error={error} onRetry={onRetry} />);
    await fireEvent.press(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('Sign In button', () => {
  test('shows for an expired session when onSignIn is given, and calls it', async () => {
    const onSignIn = jest.fn();
    await render(
      <FriendlyErrorView
        error={new AuthExpiredException('expired')}
        onSignIn={onSignIn}
      />,
    );
    await fireEvent.press(screen.getByText('Sign In'));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  test('does not show for any other error', async () => {
    await render(
      <FriendlyErrorView
        error={new AccountFetchFailedException('boom')}
        onSignIn={() => {}}
      />,
    );
    expect(screen.queryByText('Sign In')).toBeNull();
  });
});

describe('both buttons', () => {
  test('an expired session with both handlers shows both, each calling its own', async () => {
    const onRetry = jest.fn();
    const onSignIn = jest.fn();
    await render(
      <FriendlyErrorView
        error={new AuthExpiredException('expired')}
        onRetry={onRetry}
        onSignIn={onSignIn}
      />,
    );
    await fireEvent.press(screen.getByText('Retry'));
    expect([onRetry.mock.calls.length, onSignIn.mock.calls.length]).toEqual([
      1, 0,
    ]);
    await fireEvent.press(screen.getByText('Sign In'));
    expect([onRetry.mock.calls.length, onSignIn.mock.calls.length]).toEqual([
      1, 1,
    ]);
  });

  test('another error with both handlers shows only Retry', async () => {
    await render(
      <FriendlyErrorView
        error={new AccountFetchFailedException('500')}
        onRetry={() => {}}
        onSignIn={() => {}}
      />,
    );
    expect(screen.getByText('Retry')).toBeTruthy();
    expect(screen.queryByText('Sign In')).toBeNull();
  });
});

test('shows the error_outline icon in orange', async () => {
  await render(<FriendlyErrorView error={new Error('x')} />);
  const glyph = screen.getByText(
    String.fromCodePoint(Icons.error_outline.codePoint),
    { includeHiddenElements: true },
  );
  expect(glyph).toHaveStyle({ color: '#FF9800', fontSize: 64 });
});
