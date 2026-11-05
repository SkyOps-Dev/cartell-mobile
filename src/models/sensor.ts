// Port of frontend/lib/models/sensor.dart (spec 05 §3): a sensor paired to a hub. Cached.

import { sensorPersistor } from '../services/data/persistors';
import { DartDateTime, parseDartDateTime } from '../utilities/dartDateTime';
import { AbstractModel } from './abstractModel';
import { Json, persist, trackParse } from './jsonParser';

export class Sensor extends AbstractModel {
  constructor(
    id: number,
    public sensorId: string,
    public name: string,
    public longitude: string | null,
    public latitude: string | null,
    public hasLowBattery: boolean | null,
    public isActive: boolean | null,
    public connectionDate: DartDateTime | null,
    public disconnectionDate: string | null,
    public shouldSendNotification: boolean,
    public firmwareVersion: number | null,
    public sensorType: string | null,
    public isBlacklisted: boolean,
  ) {
    super(id);
  }

  hasLatLong(): boolean {
    return this.latitude !== null && this.longitude !== null;
  }

  isOnboardSensor(): boolean {
    return this.sensorType === 'ON';
  }

  /** Everything but isBlacklisted (quirk: a re-fetch never changes it). */
  updateFields(model: AbstractModel): void {
    const other = model as Sensor;
    this.sensorId = other.sensorId;
    this.name = other.name;
    this.longitude = other.longitude;
    this.latitude = other.latitude;
    this.hasLowBattery = other.hasLowBattery;
    this.isActive = other.isActive;
    this.connectionDate = other.connectionDate;
    this.disconnectionDate = other.disconnectionDate;
    this.shouldSendNotification = other.shouldSendNotification;
    this.firmwareVersion = other.firmwareVersion;
    this.sensorType = other.sensorType;
  }
}

/** The Sensor parser: parse, then the cached object. */
export function parseSensor(json: Json): Sensor {
  return persist(
    sensorPersistor,
    trackParse(
      'Sensor',
      json,
      j =>
        new Sensor(
          j.id as number,
          j.sensor_id as string,
          j.name as string,
          (j.longitude as string | null | undefined) ?? null,
          (j.latitude as string | null | undefined) ?? null,
          (j.has_low_battery as boolean | null | undefined) ?? null,
          (j.is_active as boolean | null | undefined) ?? null,
          parseDartDateTime(j.connection_date as string),
          (j.disconnection_date as string | null | undefined) ?? null,
          j.should_send_notification as boolean,
          (j.fw_version as number | null | undefined) ?? null,
          (j.sensor_type as string | null | undefined) ?? null,
          j.is_blacklisted as boolean,
        ),
    ),
  );
}
