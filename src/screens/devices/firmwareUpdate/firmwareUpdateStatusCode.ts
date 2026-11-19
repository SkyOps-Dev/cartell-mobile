// Port of frontend/lib/screens/devices/firmware_update/firmware_update_status_code.dart and
// frontend/lib/screens/devices/firmware_update/firmware_update_status_type.dart (spec 14 §3).
// Only Starting, InProgress, FailTimeout and CompleteSuccess are ever produced (by the poller,
// from the server's four statuses); the other codes are kept as Flutter declares them.

export enum FirmwareUpdateStatusType {
  InProgress = 'InProgress',
  Success = 'Success',
  Failure = 'Failure',
}

export type FirmwareUpdateStatusCode = {
  readonly name: string;
  readonly code: number;
  readonly msg: string;
  readonly statusType: FirmwareUpdateStatusType;
  /** "Reference: <code>" is shown under a failure when true. */
  readonly isError: boolean;
};

const statusCode = (
  name: string,
  code: number,
  msg: string,
  statusType: FirmwareUpdateStatusType,
  isError = true,
): FirmwareUpdateStatusCode => ({ name, code, msg, statusType, isError });

const { InProgress, Success, Failure } = FirmwareUpdateStatusType;

export const FirmwareUpdateStatusCodes = {
  Starting: statusCode('Starting', 1, 'Waiting for hub', InProgress, false),
  InProgress: statusCode('InProgress', 2, 'Downloading', InProgress, false),
  FailTimeout: statusCode(
    'FailTimeout',
    3,
    'Firmware update timed out.',
    Failure,
  ),
  InvalidProcessor: statusCode(
    'InvalidProcessor',
    4,
    'Failure! Code: 2f088a11',
    Failure,
  ),
  CompleteSuccess: statusCode('CompleteSuccess', 5, 'Success!', Success, false),
  BadPacketRequest: statusCode(
    'BadPacketRequest',
    6,
    'Failure! Code: 46ea3b81',
    Failure,
  ),
  FailCrcMismatch: statusCode(
    'FailCrcMismatch',
    7,
    'Failure! Code: 612c0483',
    Failure,
  ),
  InvalidFwType: statusCode(
    'InvalidFwType',
    8,
    'Failure! Code: 2640c683',
    Failure,
  ),
  InvalidAppLocation: statusCode(
    'InvalidAppLocation',
    9,
    'Failure! Code: 599f1070',
    Failure,
  ),
  InvalidFileSize: statusCode(
    'InvalidFileSize',
    10,
    'Failure! Code: a179b92a',
    Failure,
  ),
  Esp32OtaEndFailed: statusCode(
    'Esp32OtaEndFailed',
    11,
    'Failure! Code: 9d159864',
    Failure,
  ),
  Esp32WriteError: statusCode(
    'Esp32WriteError',
    12,
    'Failure! Code: 4814d774',
    Failure,
  ),
  ConnectingToServerFailed: statusCode(
    'ConnectingToServerFailed',
    100,
    'Failure! Code: 28475b4b',
    Failure,
  ),
  GenericFailure: statusCode(
    'GenericFailure',
    -1,
    'Failure! Code: 99999999',
    Failure,
  ),
} as const;

/** FirmwareUpdateStatusCode.toString. */
export function statusCodeText(status: FirmwareUpdateStatusCode): string {
  return `status=FirmwareUpdateStatusType.${status.statusType},code=${status.code},msg=${status.msg}`;
}
