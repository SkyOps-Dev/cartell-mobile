// Port of NetworkHelper (frontend/lib/services/requests/networking.dart) and AuthorizedRequester
// (authorized_requester.dart); spec 04 §1, §2, §4.
//
// Every call: probe the server mode and tell the listeners, run the hub-Wi-Fi guard, then send.
// - Bodies are web forms (application/x-www-form-urlencoded; charset=utf-8), never JSON.
// - Authenticated calls send `Authorization: JWT <access token or "">` and go through the 401 →
//   forced session check → retry-once wrapper.
// - 15 s timeout. A timeout is reported with the method's code and becomes TimeOutException;
//   any other network error propagates unchanged.

import { nodeBaseUrlHttp } from '../../config/environment';
import { Mode, ModeWatcherHelper } from '../../utilities/modeWatcher';
import {
  AuthExpiredException,
  OnHUBNetworkException,
  TimeoutException,
  TimeOutException,
} from '../exceptions';
import { reportError } from '../reportError';
import { Result, ResultStatus } from '../result';
import { SecureStorage } from '../secureStorage';
import { NetworkNameCheck } from './hubNetworkNameCheck';

const TIMEOUT_MS = 15000;

export type HttpResponse = {
  statusCode: number;
  body: string;
};

class TimedOut extends Error {}

/** Sends one request with the 15 s timeout. Rejects with TimedOut on timeout. */
async function send(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: Record<string, string>,
): Promise<HttpResponse> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);
  try {
    const init: RequestInit = {
      method,
      headers: { ...headers },
      signal: controller.signal as RequestInit['signal'],
    };
    if (body !== undefined) {
      (init.headers as Record<string, string>)['content-type'] =
        'application/x-www-form-urlencoded; charset=utf-8';
      init.body = new URLSearchParams(body).toString();
    }
    const response = await fetch(url, init);
    const text = await response.text();
    return { statusCode: response.status, body: text };
  } catch (error) {
    if (timedOut) {
      throw new TimedOut();
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export type AuthRefreshFn = (options: {
  shouldForceAuth: boolean;
}) => Promise<Result>;

/** 401 → forced refresh → retry once. Offline → TimeOutException; rejected → AuthExpiredException. */
export class AuthorizedRequester {
  constructor(private readonly refreshAuth: AuthRefreshFn) {}

  async execute(
    sendRequest: () => Promise<HttpResponse>,
  ): Promise<HttpResponse> {
    const response = await sendRequest();
    if (response.statusCode !== 401) {
      return response;
    }
    const refresh = await this.refreshAuth({ shouldForceAuth: true });
    if (refresh.status === ResultStatus.OFFLINE) {
      throw new TimeOutException();
    }
    if (refresh.failed) {
      const detail =
        refresh.messages.length > 0 ? refresh.messages.join('; ') : 'unknown';
      throw new AuthExpiredException(detail);
    }
    return sendRequest();
  }
}

// Set by authRequests.ts to AuthRequestManager.auth, avoiding a circular import.
let defaultRefresh: AuthRefreshFn = async () => Result.failure();
export function setDefaultAuthRefresh(fn: AuthRefreshFn) {
  defaultRefresh = fn;
}

const TIMEOUT_CODES = {
  GET: 'Error Code 4f0ef:',
  POST: 'Error Code 64773:',
  PATCH: 'Error Code a0af6:',
  DELETE: 'Error Code 191d2:',
} as const;

export class NetworkHelper {
  static shouldCheckNetworkName = true;
  private readonly requester: AuthorizedRequester;

  constructor(readonly url: string, requester?: AuthorizedRequester) {
    this.requester =
      requester ?? new AuthorizedRequester(options => defaultRefresh(options));
  }

  getSecureData({ shouldAuthenticate = true } = {}) {
    return this.request('GET', shouldAuthenticate);
  }

  postSecureData({
    shouldAuthenticate = true,
    body,
  }: {
    shouldAuthenticate?: boolean;
    body: Record<string, string>;
  }) {
    return this.request('POST', shouldAuthenticate, body);
  }

  patchSecureData({
    shouldAuthenticate = true,
    body,
  }: {
    shouldAuthenticate?: boolean;
    body?: Record<string, string>;
  } = {}) {
    return this.request('PATCH', shouldAuthenticate, body);
  }

  secureDelete({
    shouldAuthenticate = true,
    body,
  }: {
    shouldAuthenticate?: boolean;
    body?: Record<string, string>;
  } = {}) {
    return this.request('DELETE', shouldAuthenticate, body);
  }

  private async request(
    method: keyof typeof TIMEOUT_CODES,
    shouldAuthenticate: boolean,
    body?: Record<string, string>,
  ): Promise<HttpResponse> {
    const mode = await NetworkHelper.validateServerMode();
    ModeWatcherHelper.notifyListeners(mode);
    if (NetworkHelper.shouldCheckNetworkName) {
      await NetworkNameCheck.checkName();
    }

    const sendOnce = async () => {
      const headers: Record<string, string> = {};
      if (shouldAuthenticate) {
        const token = await SecureStorage.getAccessToken();
        headers.authorization = `JWT ${token ?? ''}`;
      }
      return send(method, this.url, headers, body);
    };

    try {
      if (!shouldAuthenticate) {
        return await sendOnce();
      }
      return await this.requester.execute(sendOnce);
    } catch (error) {
      if (error instanceof TimedOut) {
        reportError(new TimeoutException(TIMEOUT_CODES[method]));
        throw new TimeOutException();
      }
      throw error;
    }
  }

  /**
   * Probes GET /maintenance-mode/ (no auth, 15 s): 200 → NORMAL, any other status →
   * MAINTENANCE_MODE, no answer → UNREACHABLE. Skipped (NORMAL) in the background, while
   * pairing, or on a hub's Wi-Fi.
   */
  static async validateServerMode(): Promise<Mode> {
    if (!ModeWatcherHelper.isResumed || ModeWatcherHelper.isPairingDevices) {
      return Mode.NORMAL;
    }
    try {
      if (NetworkHelper.shouldCheckNetworkName) {
        await NetworkNameCheck.checkName();
      }
    } catch (error) {
      if (error instanceof OnHUBNetworkException) {
        return Mode.NORMAL;
      }
      throw error;
    }
    try {
      const response = await send(
        'GET',
        // On the Node backend since 2026-10-21 (node_backend/docs/ENDPOINTS.md).
        `${nodeBaseUrlHttp()}/maintenance-mode/`,
        {},
      );
      return response.statusCode === 200 ? Mode.NORMAL : Mode.MAINTENANCE_MODE;
    } catch {
      return Mode.UNREACHABLE;
    }
  }
}
