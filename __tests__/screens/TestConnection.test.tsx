// The Debug Info panel's connection test (welcome_screen.dart tryUrl, testEcho,
// TestConnectionWidget): what each check sends, when it passes, and the rows' three states.

import React from 'react';
import { act, render, screen } from '@testing-library/react-native';

import { FontAwesomeIcons } from '../../src/components/icons/iconData';
import {
  testEcho,
  TestConnectionWidget,
  tryUrl,
} from '../../src/screens/welcome/TestConnection';

type Answer = { status: number; body?: string } | 'hang' | 'network-error';

/** A fetch that answers by "METHOD url", records calls, and honours the abort signal. */
function installFetch(answers: Record<string, Answer>) {
  const calls: { method: string; url: string; init: RequestInit }[] = [];
  const fetchMock = jest.fn(
    (url: string, init: RequestInit = {}) =>
      new Promise<Response>((resolve, reject) => {
        const method = init.method ?? 'GET';
        calls.push({ method, url, init });
        const answer = answers[`${method} ${url}`] ?? { status: 404 };
        init.signal?.addEventListener('abort', () =>
          reject(new Error('aborted')),
        );
        if (answer === 'hang') {
          return;
        }
        if (answer === 'network-error') {
          reject(new TypeError('Network request failed'));
          return;
        }
        resolve({
          status: answer.status,
          text: async () => answer.body ?? '',
        } as unknown as Response);
      }),
  );
  (global as unknown as { fetch: unknown }).fetch = fetchMock;
  return calls;
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

async function settled<T>(promise: Promise<T>, ms: number) {
  const outcome = promise.then(
    value => ({ value }),
    error => ({ error }),
  );
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
  return outcome;
}

describe('tryUrl', () => {
  test('waits 1 s, then passes on 200 only', async () => {
    const calls = installFetch({
      'GET https://ok/': { status: 200 },
      'GET https://missing/': { status: 404 },
    });
    const ok = tryUrl('https://ok/');
    await act(async () => {
      await jest.advanceTimersByTimeAsync(999);
    });
    expect(calls).toHaveLength(0);
    expect(await settled(ok, 1)).toEqual({ value: true });
    expect(await settled(tryUrl('https://missing/'), 1000)).toEqual({
      value: false,
    });
  });

  test('gives up after 15 s with an error, not with false', async () => {
    installFetch({ 'GET https://slow/': 'hang' });
    const outcome = await settled(tryUrl('https://slow/'), 1000 + 15000);
    expect(outcome).toHaveProperty('error');
  });

  test('a network error is an error, not false', async () => {
    installFetch({ 'GET https://down/': 'network-error' });
    expect(await settled(tryUrl('https://down/'), 1000)).toHaveProperty(
      'error',
    );
  });
});

describe('testEcho', () => {
  const url = 'https://server/echo/';
  const echo = (answer: Answer) => {
    const calls = installFetch({ [`POST ${url}`]: answer });
    return { calls, result: settled(testEcho(url), 1000) };
  };

  test('posts the JSON test message and passes when it comes back unchanged', async () => {
    const { calls, result } = echo({
      status: 200,
      body: '{"msg":"this is a test"}',
    });
    expect(await result).toEqual({ value: true });
    expect(calls[0].init.body).toBe('{"msg":"this is a test"}');
    expect(calls[0].init.headers).toEqual({
      'Content-Type': 'application/json',
    });
  });

  test('fails on another message', async () => {
    const { result } = echo({ status: 200, body: '{"msg":"other"}' });
    expect(await result).toEqual({ value: false });
  });

  test('fails on a non-200 without reading the body', async () => {
    const { result } = echo({ status: 500, body: 'not json' });
    expect(await result).toEqual({ value: false });
  });

  test('a 200 that is not a JSON object is an error', async () => {
    expect(await echo({ status: 200, body: 'not json' }).result).toHaveProperty(
      'error',
    );
    expect(await echo({ status: 200, body: '["msg"]' }).result).toHaveProperty(
      'error',
    );
  });
});

describe('TestConnectionWidget', () => {
  const hidden = { includeHiddenElements: true };
  const glyph = (codePoint: number) => String.fromCodePoint(codePoint);

  test('checks the four addresses, with no sign-in header', async () => {
    const calls = installFetch({});
    await render(<TestConnectionWidget />);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });
    expect(calls.map(c => `${c.method} ${c.url}`).sort()).toEqual(
      [
        'GET https://google.com',
        'GET https://test.cartellap.com/test/',
        'GET https://test.cartellap.com',
        'POST https://test.cartellap.com/echo/',
      ].sort(),
    );
    calls.forEach(c =>
      expect(JSON.stringify(c.init.headers ?? {})).not.toMatch(
        /Authorization/i,
      ),
    );
  });

  test('a passed check shows ✓, a failed one ✗, an unanswered one keeps spinning', async () => {
    installFetch({
      'GET https://google.com': { status: 200 },
      'GET https://test.cartellap.com/test/': { status: 503 },
      'GET https://test.cartellap.com': 'hang',
      'POST https://test.cartellap.com/echo/': 'network-error',
    });
    await render(<TestConnectionWidget />);
    expect(screen.getByText('Can Reach Spash Page')).toBeTruthy();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000 + 15000 + 100);
    });
    expect(
      screen.getAllByText(glyph(FontAwesomeIcons.check.codePoint), hidden),
    ).toHaveLength(1);
    expect(
      screen.getAllByText(glyph(FontAwesomeIcons.xmark.codePoint), hidden),
    ).toHaveLength(1);
    // The timed-out and the failed check never answer (Q33).
    const icons =
      screen.queryAllByText(glyph(FontAwesomeIcons.check.codePoint), hidden)
        .length +
      screen.queryAllByText(glyph(FontAwesomeIcons.xmark.codePoint), hidden)
        .length;
    expect(icons).toBe(2);
  });
});
