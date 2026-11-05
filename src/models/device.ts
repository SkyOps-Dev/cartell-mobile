// Port of frontend/lib/models/device.dart, device_model.dart and connection.dart (spec 05 §3).
// A Device is a hub's registration (cached); its DeviceMeta is the physical hub, with its
// connections and sensors (not cached, but its sensors are).

import { devicePersistor } from '../services/data/persistors';
import { DartDateTime, parseDartDateTime } from '../utilities/dartDateTime';
import { AbstractModel } from './abstractModel';
import { dartDoubleTryParse, Json, persist, trackParse } from './jsonParser';
import { parseSensor, Sensor } from './sensor';

export type DeviceModel = { name: string | null; releaseDate: string | null };

export type Connection = {
  ipAddress: string;
  port: number;
  isActive: boolean;
  connectionDate: DartDateTime;
  disconnectionDate: DartDateTime | null;
};

export type DeviceMeta = {
  id: number;
  isConnected: boolean;
  macAddress: string;
  esp32AppVersion: number | null;
  rfm6601AppVersion: number | null;
  deviceModel: DeviceModel;
  connections: Connection[];
  sensors: Sensor[];
  isBlacklisted: boolean;
};

export class Device extends AbstractModel {
  constructor(
    id: number,
    public name: string,
    public location: number,
    public latitude: number | null,
    public longitude: number | null,
    public archived: boolean,
    public shouldUseOnboardSensor: boolean,
    public addedDate: DartDateTime,
    public archivedDate: DartDateTime | null,
    public device: DeviceMeta,
    public shouldSendNotification: boolean,
    public shouldSendConnectionNotification: boolean,
    public shouldSendEmail: boolean,
    public shouldUseEmulatedSensor: boolean,
  ) {
    super(id);
  }

  /**
   * Not location, addedDate or shouldUseEmulatedSensor (quirk: a re-fetch never changes
   * integrator support on a hub already held).
   */
  updateFields(model: AbstractModel): void {
    const other = model as Device;
    this.name = other.name;
    this.latitude = other.latitude;
    this.longitude = other.longitude;
    this.archived = other.archived;
    this.shouldUseOnboardSensor = other.shouldUseOnboardSensor;
    this.shouldSendNotification = other.shouldSendNotification;
    this.shouldSendConnectionNotification =
      other.shouldSendConnectionNotification;
    this.shouldSendEmail = other.shouldSendEmail;
    this.archivedDate = other.archivedDate;
    this.device = other.device;
  }

  get hasBlacklistedSensor(): boolean {
    return this.device.sensors.some(sensor => sensor.isBlacklisted);
  }
}

/** The Device parser: parse (its sensors go into their cache), then the cached object. */
export function parseDevice(json: Json): Device {
  return persist(
    devicePersistor,
    trackParse(
      'Device',
      json,
      j =>
        new Device(
          j.id as number,
          j.name as string,
          j.location as number,
          dartDoubleTryParse(j.latitude),
          dartDoubleTryParse(j.longitude),
          (j.archived as boolean | null | undefined) ?? false,
          (j.should_use_onboard_sensor as boolean | null | undefined) ?? false,
          parseDartDateTime(j.added_date as string),
          readArchivedDate(j.archived_date),
          parseDeviceMeta(j.device as Json),
          j.should_send_notification as boolean,
          j.should_send_connection_notification as boolean,
          (j.should_send_email as boolean | null | undefined) ?? false,
          (j.should_use_emulated_sensor as boolean | null | undefined) ?? false,
        ),
    ),
  );
}

/**
 * Flutter assigns `json['archived_date']` as it is to a DateTime? field, so anything but null
 * fails the parse there.
 */
function readArchivedDate(value: unknown): DartDateTime | null {
  if (value === null || value === undefined) {
    return null;
  }
  throw new TypeError(
    `type '${typeof value}' is not a subtype of type 'DateTime?'`,
  );
}

function parseDeviceMeta(json: Json): DeviceMeta {
  return trackParse('DeviceMeta', json, j => ({
    id: j.id as number,
    isConnected: j.is_connected as boolean,
    macAddress: j.mac_address as string,
    rfm6601AppVersion:
      (j.rfm6601_app_version as number | null | undefined) ?? null,
    esp32AppVersion: (j.esp32_app_version as number | null | undefined) ?? null,
    deviceModel: parseDeviceModel(j.device_model as Json),
    connections: (j.connections as Json[]).map(parseConnection),
    sensors: (j.sensors as Json[]).map(parseSensor),
    isBlacklisted: j.is_blacklisted as boolean,
  }));
}

function parseDeviceModel(json: Json): DeviceModel {
  return trackParse('DeviceModel', json, j => ({
    name: (j.name as string | null | undefined) ?? null,
    releaseDate: (j.release_date as string | null | undefined) ?? null,
  }));
}

function parseConnection(json: Json): Connection {
  return trackParse('Connection', json, j => ({
    ipAddress: j.ip_address as string,
    port: j.port as number,
    isActive: j.is_active as boolean,
    connectionDate: parseDartDateTime(j.connection_date as string),
    disconnectionDate:
      j.disconnection_date === null || j.disconnection_date === undefined
        ? null
        : parseDartDateTime(j.disconnection_date as string),
  }));
}
