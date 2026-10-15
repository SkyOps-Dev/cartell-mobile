// Port of AuthRequestManager and AuthGateway (frontend/lib/services/requests/auth_requests.dart,
// auth_gateway.dart; spec 04 §4, §5): the session check, and the login / register / verify /
// refresh calls.
//
// Session check (`auth`): probe the mode → unreachable: offline → confirmed < 60 s ago (whole
// seconds): success → join a check already running → verify the access token → no refresh
// token: not signed in → refresh and store BOTH new tokens → refused: dead session (66c58).
// The 15 s background timer that calls `auth` is in ../startServices.ts.

import { baseUrlHttp } from '../../config/environment';
import { Mode, ModeWatcherHelper } from '../../utilities/modeWatcher';
import {
  AccountCreationFailedException,
  InvalidTokensException,
  NoAccountInformationFoundException,
  StoredCredentialsException,
} from '../exceptions';
import { reportError } from '../reportError';
import { Result } from '../result';
import { SecureStorage } from '../secureStorage';
import {
  HttpResponse,
  NetworkHelper,
  setDefaultAuthRefresh,
} from './networkHelper';

/** The side effects the session check performs, behind an interface so it can be tested. */
export interface AuthGateway {
  readAccessToken(): Promise<string | null>;
  readRefreshToken(): Promise<string | null>;
  verify(token: string): Promise<HttpResponse>;
  refresh(token: string): Promise<HttpResponse>;
  persistTokens(tokens: { access: string; refresh: string }): Promise<void>;
}

type DoAuth = (options: { shouldForceAuth: boolean }) => Promise<Result>;

export class AuthRequestManager {
  /** When the session was last confirmed (ms since epoch), or null. */
  static lastAuthed: number | null = null;
  private static inFlightAuth: Promise<Result> | null = null;

  /** For tests only. */
  static resetSingleFlightForTesting() {
    AuthRequestManager.inFlightAuth = null;
    AuthRequestManager.lastAuthed = null;
  }

  /** For tests only. */
  static get inFlightAuthForTesting(): Promise<Result> | null {
    return AuthRequestManager.inFlightAuth;
  }

  private readonly gateway: AuthGateway;

  constructor(gateway?: AuthGateway) {
    this.gateway = gateway ?? new RealAuthGateway(this);
  }

  async auth({
    shouldForceAuth = false,
    doAuth,
    probeMode,
  }: {
    shouldForceAuth?: boolean;
    /** Test seam. */
    doAuth?: DoAuth;
    /** Test seam. */
    probeMode?: () => Promise<Mode>;
  } = {}): Promise<Result> {
    // Always notify listeners: this drives the maintenance screen even when short-circuiting.
    const mode = await (probeMode?.() ?? NetworkHelper.validateServerMode());
    ModeWatcherHelper.notifyListeners(mode);
    // Before the cache, so an offline device reports offline rather than a stale success.
    if (mode === Mode.UNREACHABLE) {
      return Result.offline();
    }
    // Dart's Duration.inSeconds truncates, so 59.9 s is still cached and 60.0 s is not.
    const last = AuthRequestManager.lastAuthed;
    if (last !== null && !shouldForceAuth) {
      if (Math.floor((Date.now() - last) / 1000) < 60) {
        return Result.success();
      }
    }
    // Single flight: if a check is already running, wait for it.
    const pending = AuthRequestManager.inFlightAuth;
    if (pending !== null) {
      return pending;
    }
    const future = (doAuth ?? (options => this.doAuth(options)))({
      shouldForceAuth,
    });
    AuthRequestManager.inFlightAuth = future;
    try {
      return await future;
    } finally {
      AuthRequestManager.inFlightAuth = null;
    }
  }

  private async doAuth(_options: {
    shouldForceAuth: boolean;
  }): Promise<Result> {
    try {
      const accessToken = await this.gateway.readAccessToken();
      if (accessToken !== null) {
        const verify = await this.gateway.verify(accessToken);
        if (verify.statusCode === 200) {
          AuthRequestManager.lastAuthed = Date.now();
          return Result.success();
        }
      }
      const refreshToken = await this.gateway.readRefreshToken();
      if (refreshToken === null) {
        // Never signed in, or signed out: a normal state, so nothing is reported.
        return Result.notSignedIn();
      }
      const refresh = await this.gateway.refresh(refreshToken);
      if (refresh.statusCode === 200) {
        // Decode only after the status check, so an HTML error page is still reported below.
        const json = JSON.parse(refresh.body);
        await this.gateway.persistTokens({
          access: json.access,
          refresh: json.refresh,
        });
        AuthRequestManager.lastAuthed = Date.now();
        return Result.success();
      }
      reportError(new InvalidTokensException('Error Code 66c58:'));
      return Result.failure({
        message: 'Neither access nor request token were valid.',
      });
    } catch (error) {
      return Result.failure({
        message: 'Failed to Authenticate',
        messages: [String(error)],
      });
    }
  }

  /** POST /auth/users/. Returns the response, or null after reporting 5c9f3 on any error. */
  async register({
    email,
    firstName,
    lastName,
    password,
    phoneNo,
  }: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    phoneNo: string | null;
  }): Promise<HttpResponse | null> {
    try {
      return await new NetworkHelper(
        `${baseUrlHttp()}/auth/users/`,
      ).postSecureData({
        body: {
          email,
          first_name: firstName,
          last_name: lastName,
          password,
          phone_no: phoneNo ?? '',
        },
        shouldAuthenticate: false,
      });
    } catch {
      reportError(new AccountCreationFailedException('Error Code 5c9f3:'));
      return null;
    }
  }

  /** POST /auth/jwt/create. Returns the response, or null after reporting 11dd3 on any error. */
  async login({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<HttpResponse | null> {
    try {
      return await new NetworkHelper(
        `${baseUrlHttp()}/auth/jwt/create`,
      ).postSecureData({
        body: { email, password },
        shouldAuthenticate: false,
      });
    } catch {
      reportError(new NoAccountInformationFoundException('Error Code 11dd3:'));
      return null;
    }
  }

  /** Returns the refresh response, or throws (after reporting 045c9). Never returns null. */
  async postSecureTokenDataForRefresh(
    token: string,
    type: string,
  ): Promise<HttpResponse> {
    try {
      return await new NetworkHelper(
        `${baseUrlHttp()}/auth/jwt/refresh`,
      ).postSecureData({ body: { [type]: token }, shouldAuthenticate: false });
    } catch (error) {
      reportError(new StoredCredentialsException('Error Code 045c9:'));
      throw error;
    }
  }

  /** Returns the verify response, or throws (after reporting 675e0). Never returns null. */
  async postSecureTokenDataForVerify(
    token: string,
    type: string,
  ): Promise<HttpResponse> {
    try {
      return await new NetworkHelper(
        `${baseUrlHttp()}/auth/jwt/verify`,
      ).postSecureData({ body: { [type]: token }, shouldAuthenticate: false });
    } catch (error) {
      reportError(new StoredCredentialsException('Error Code 675e0:'));
      throw error;
    }
  }
}

/** Production gateway: SecureStorage and the two token endpoints. */
class RealAuthGateway implements AuthGateway {
  constructor(private readonly manager: AuthRequestManager) {}
  readAccessToken = () => SecureStorage.getAccessToken();
  readRefreshToken = () => SecureStorage.getRefreshToken();
  verify = (token: string) =>
    this.manager.postSecureTokenDataForVerify(token, 'token');
  refresh = (token: string) =>
    this.manager.postSecureTokenDataForRefresh(token, 'refresh');
  persistTokens = async ({
    access,
    refresh,
  }: {
    access: string;
    refresh: string;
  }) => {
    await SecureStorage.setAccessToken(access);
    await SecureStorage.setRefreshToken(refresh);
  };
}

setDefaultAuthRefresh(({ shouldForceAuth }) =>
  new AuthRequestManager().auth({ shouldForceAuth }),
);
