// Port of frontend/lib/models/firmware.dart and frontend/lib/models/firmware_update_model.dart
// (spec 05, spec 14): a firmware file on offer, and one hub's update to it.
//
// Flutter parses the two latest firmwares through a PersistedJsonParser (start_services.dart).
// PORT-GAP: DataPersistor<Firmware>. Nothing reads it; it only makes two parses of one id return
// the same object.

import { DartDateTime, parseDartDateTime } from '../utilities/dartDateTime';
import { AbstractModel } from './abstractModel';
import { Json, trackParse } from './jsonParser';

const orNull = <T>(value: unknown): T | null =>
  value === undefined ? null : (value as T | null);

export class Firmware extends AbstractModel {
  constructor(
    id: number,
    public versionNumber: number | null,
    public releaseDate: string | null,
    public stable: boolean | null,
    public supported: boolean | null,
    /** "ESP32" (the Controller) or "RFM6601" (the Transmitter). */
    public processor: string,
  ) {
    super(id);
  }

  updateFields(model: AbstractModel): void {
    const other = model as Firmware;
    this.versionNumber = other.versionNumber;
    this.releaseDate = other.releaseDate;
    this.stable = other.stable;
    this.supported = other.supported;
    this.processor = other.processor;
  }
}

/** FirmwareParser.fromJson, with no error tracking (as FirmwareUpdateParser calls it). */
function firmwareFromJson(j: Json): Firmware {
  return new Firmware(
    j.id as number,
    orNull<number>(j.version_number),
    orNull<string>(j.release_date),
    orNull<boolean>(j.stable),
    orNull<boolean>(j.supported),
    j.processor as string,
  );
}

/** The Firmware parser (JsonParserErrorTracker; the cache is a PORT-GAP above). */
export function parseFirmware(json: Json): Firmware {
  return trackParse('Firmware', json, firmwareFromJson);
}

export class FirmwareUpdate extends AbstractModel {
  constructor(
    id: number,
    public fileSize: number | null,
    public fileCursor: number | null,
    /** PENDING, RUNNING, SUCCEEDED or FAILED. */
    public status: string | null,
    public message: string | null,
    public dateStarted: DartDateTime | null,
    public dateEnded: DartDateTime | null,
    public firmware: Firmware | null,
  ) {
    super(id);
  }

  updateFields(model: AbstractModel): void {
    const other = model as FirmwareUpdate;
    this.fileSize = other.fileSize;
    this.fileCursor = other.fileCursor;
    this.status = other.status;
    this.message = other.message;
    this.dateStarted = other.dateStarted;
    this.dateEnded = other.dateEnded;
    this.firmware = other.firmware;
  }

  /** FirmwareUpdate.toString, as the unrecognised-status report quotes it. */
  toString(): string {
    const date = (d: DartDateTime | null) =>
      d === null ? 'null' : d.toDate().toISOString();
    return (
      `file_size=${this.fileSize},file_cursor=${this.fileCursor},status=${this.status},` +
      `message=${this.message},date_started=${date(this.dateStarted)},` +
      `date_ended=${date(this.dateEnded)}`
    );
  }
}

/**
 * FirmwareUpdateParser through JsonParserErrorTracker. The nested firmware goes through a plain
 * FirmwareParser, so a missing one is a TypeError, as Dart's cast of null to a Map.
 */
export function parseFirmwareUpdate(json: Json): FirmwareUpdate {
  return trackParse(
    'FirmwareUpdate',
    json,
    j =>
      new FirmwareUpdate(
        j.id as number,
        orNull<number>(j.file_size),
        orNull<number>(j.file_cursor),
        orNull<string>(j.status),
        orNull<string>(j.message),
        j.date_started !== null && j.date_started !== undefined
          ? parseDartDateTime(j.date_started as string)
          : null,
        j.date_ended !== null && j.date_ended !== undefined
          ? parseDartDateTime(j.date_ended as string)
          : null,
        firmwareFromJson(j.firmware as Json),
      ),
  );
}
