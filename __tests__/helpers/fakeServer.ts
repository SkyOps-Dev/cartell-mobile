// A fake `fetch` for tests: routes "METHOD /path" to canned responses and records every request,
// so tests can check both what the app sent and what it did with the answer.

type Reply = { status: number; body?: unknown } | (() => never);

export type RecordedRequest = {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string | undefined;
};

export function installFakeServer(routes: Record<string, Reply>) {
  const requests: RecordedRequest[] = [];
  const fetchMock = jest.fn(async (url: string, init: RequestInit = {}) => {
    const method = (init.method ?? 'GET').toUpperCase();
    const path = new URL(url).pathname;
    requests.push({
      method,
      path,
      headers: (init.headers ?? {}) as Record<string, string>,
      body: init.body as string | undefined,
    });
    const reply = routes[`${method} ${path}`] ?? { status: 404, body: '' };
    if (typeof reply === 'function') {
      reply();
    }
    const { status, body } = reply as { status: number; body?: unknown };
    const text = typeof body === 'string' ? body : JSON.stringify(body ?? '');
    return { status, text: async () => text } as unknown as Response;
  });
  (global as unknown as { fetch: unknown }).fetch = fetchMock;
  return { requests, fetchMock };
}

/** Lets pending promise callbacks run. */
export const flush = () => new Promise(resolve => setImmediate(resolve));
