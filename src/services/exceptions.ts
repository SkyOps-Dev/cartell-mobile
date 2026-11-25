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
/** HubExceptions.dart: thrown by the sensor requests (sensor_requests.dart). */
export const UnableToUpdateSensorEventsException = coded(
  'UnableToUpdateSensorEventsException',
);
/** HubExceptions.dart: thrown by the event-history requests (event_requests.dart). */
export const UnableToUpdateExceptions = coded('UnableToUpdateExceptions');

/**
 * frontend/lib/utilities/Exceptions/HubExceptions.dart's GenericPairToWifiException: a hub Wi-Fi
 * pairing failure, with its code and the message shown.
 */
export class GenericPairToWifiException extends CodedException {
  constructor(cause: string, readonly errorMessage: string) {
    super('GenericPairToWifiException', cause);
  }
}
/** AccountExceptions.dart: the event-history and firmware requests' failed auth(). */
export const UpdateTokenFailedException = coded('UpdateTokenFailedException');
/** HubExceptions.dart: the firmware requests (firmware_requests.dart). */
export const ESP32UnableToGetLatestFirmware = coded(
  'ESP32UnableToGetLatestFirmware',
);
export const RFM6601UnableToGetLatestFirmware = coded(
  'RFM6601UnableToGetLatestFirmware',
);
export const UnrecognizedFirmwareUpdate = coded('UnrecognizedFirmwareUpdate');
/** HubExceptions.dart: the server refused to start an update, and said why (`cause`). */
export const FirmwareUpdateRejectedException = coded(
  'FirmwareUpdateRejectedException',
);

/**
 * Dart's `toString()` of an exception, as a screen shows it (`e.toString()`): the app's exception
 * classes declare none, so Object's "Instance of '<class>'"; any other error keeps its own text.
 * PORT-GAP: Dart's own texts for network failures (ClientException, SocketException) differ.
 */
export function dartExceptionText(error: unknown): string {
  if (error instanceof AuthExpiredException) {
    return error.toString();
  }
  if (error instanceof CodedException) {
    return `Instance of '${error.name}'`;
  }
  return String(error);
}
export const FailedToAutologinException = coded('FailedToAutologinException');
/** Thrown by the NavBar when no user has been fetched (AccountExceptions.dart). */
export const NoUserObjectFound = coded('NoUserObjectFound');
export const UnableToUpdateUserInformationException = coded(
  'UnableToUpdateUserInformationException',
);
export const UnableToDeleteUserAccountException = coded(
  'UnableToDeleteUserAccountException',
);
export const AccountInformationSetFailedException = coded(
  'AccountInformationSetFailedException',
);
export const AccountFetchFailedException = coded('AccountFetchFailedException');
/** Sending the push token failed (sendFCMToken, "Error Code 938dc:"). */
export const SendTokenFailedException = coded('SendTokenFailedException');
/** SettingsExceptions.dart. */
export const FetchSettingsException = coded('FetchSettingsException');

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

/** Dart's FormatException (dart:core), as DateTime.parse throws it. */
export const FormatException = coded('FormatException');
/** json_parsing_exceptions.dart: what JsonParserErrorTracker turns a parse failure into. */
export const JsonStructureProblemException = coded(
  'JsonStructureProblemException',
);
export const TriedToConvertFromWrongJsonTypeException = coded(
  'TriedToConvertFromWrongJsonTypeException',
);
/** model_exceptions.dart: AbstractModel.updateModel given another type or id. */
export const IdDoesNotMatchForSomeReasonException = coded(
  'IdDoesNotMatchForSomeReasonException',
);
export const TypeDoesNotMatchForSomeReasonException = coded(
  'TypeDoesNotMatchForSomeReasonException',
);

/** dart:io's SocketException(message): a hub UDP send or bind that failed. */
export class SocketException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SocketException';
  }
  toString() {
    return `SocketException: ${this.message}`;
  }
}

/** Dart's ArgumentError(message) (dart:core), as Encryption.encryptDataBytes throws it. */
export class ArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArgumentError';
  }
  toString() {
    return `Invalid argument(s): ${this.message}`;
  }
}
