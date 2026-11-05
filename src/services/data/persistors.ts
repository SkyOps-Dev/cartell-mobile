// The cache singletons registerPersistors() makes at launch (frontend/lib/utilities/
// start_services.dart): one DataPersistor per cached model, never cleared.
// PORT-GAP: DataPersistor<Results>, <User> and <Firmware> (User has a stand-in, userPersistor.ts).

import type { Device } from '../../models/device';
import type { Location } from '../../models/location';
import type { Sensor } from '../../models/sensor';
import { DataPersistor } from './dataPersistor';

export const devicePersistor = new DataPersistor<Device>();
export const sensorPersistor = new DataPersistor<Sensor>();
export const locationPersistor = new DataPersistor<Location>();
