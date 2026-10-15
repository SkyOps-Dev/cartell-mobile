// Ports of the exception classes the app throws and reports (utilities/Exceptions/*,
// services/requests/exceptions.dart; spec 03 §3). Each carries the same name and `cause`, so the
// "Error Code xxxxx:" markers reach the error reporter unchanged. Add classes as parts need them.

export class CodedException extends Error {
  constructor(name: string, readonly cause: string) {
    super(cause);
    this.name = name;
  }
}

const coded = (name: string) =>
  class extends CodedException {
    constructor(cause: string) {
      super(name, cause);
    }
  };

/** Dart's async TimeoutException, as reported with the per-method timeout codes. */
export const TimeoutException = coded('TimeoutException');
export const NoAccountInformationFoundException = coded(
  'NoAccountInformationFoundException',
);
export const StoredCredentialsException = coded('StoredCredentialsException');
export const UpdateStoredCredentialsFailedException = coded(
  'UpdateStoredCredentialsFailedException',
);
export const InvalidTokensException = coded('InvalidTokensException');
export const AccountCreationFailedException = coded(
  'AccountCreationFailedException',
);
export const NoHubInformationAvailableException = coded(
  'NoHubInformationAvailableException',
);
export const UnableToGetWifiInfoException = coded(
  'UnableToGetWifiInfoException',
);
export const FailedToAutologinException = coded('FailedToAutologinException');
/** Thrown by the NavBar when no user has been fetched (AccountExceptions.dart). */
export const NoUserObjectFound = coded('NoUserObjectFound');

export class AuthExpiredException extends CodedException {
  constructor(cause: string) {
    super('AuthExpiredException', cause);
  }
  toString() {
    return `AuthExpiredException: ${this.cause}`;
  }
}

/** services/requests/exceptions.dart TimeOutException: the text users may see. */
export class TimeOutException extends Error {
  constructor() {
    super(
      'The request timed out. Check your internet connection and try again.',
    );
    this.name = 'TimeOutException';
  }
  toString() {
    return this.message;
  }
}

/** services/requests/exceptions.dart OnHUBNetworkException. */
export class OnHUBNetworkException extends Error {
  constructor() {
    super(
      "We detected you are on a HUB's network. Please connect to your own WiFi network and try again.",
    );
    this.name = 'OnHUBNetworkException';
  }
  toString() {
    return this.message;
  }
}
