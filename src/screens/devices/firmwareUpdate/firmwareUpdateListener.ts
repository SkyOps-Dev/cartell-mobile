// Port of frontend/lib/screens/devices/firmware_update/firmware_update_listener.dart (spec 14 §3):
// starts an update (or adopts a running one) and polls its status once a second, handing each
// reading to the screen.
//
// Flutter hands readings over a single-subscription Stream: listening to it runs
// startListening() at once (which only starts the poll when an update id is already set), and
// events and errors reach the listener a microtask later. Here the screen passes its two
// callbacks to getUpdateStream, with the same timing.

import type { Device } from '../../../models/device';
import type { Firmware, FirmwareUpdate } from '../../../models/firmware';
import { reportError } from '../../../services/reportError';
import { startFwUpdateAndGetFileSize } from '../../../services/requests/deviceRequests';
import { getDeviceUpdateStatus } from '../../../services/requests/firmwareRequests';
import { DartDateTime } from '../../../utilities/dartDateTime';
import {
  type FirmwareUpdateStatusCode,
  FirmwareUpdateStatusCodes,
} from './firmwareUpdateStatusCode';
import { UpdateProgressSnapshot } from './updateProgressSnapshot';

export type StartFwUpdateFn = (args: {
  deviceId: number;
  firmwareId: number;
}) => Promise<number>;

export type FetchUpdateStatusFn = (id: number) => Promise<FirmwareUpdate>;

type Listeners = {
  onData: (snapshot: UpdateProgressSnapshot) => void;
  onError: (error: unknown) => void;
};

/** Dart's Stopwatch: elapsed time while running; start() resumes, stop() pauses. */
class Stopwatch {
  private startedAt: number | null = null;
  private accumulated = 0;

  start(): void {
    if (this.startedAt === null) {
      this.startedAt = Date.now();
    }
  }

  stop(): void {
    if (this.startedAt !== null) {
      this.accumulated += Date.now() - this.startedAt;
      this.startedAt = null;
    }
  }

  get isRunning(): boolean {
    return this.startedAt !== null;
  }

  get elapsedMilliseconds(): number {
    return (
      this.accumulated +
      (this.startedAt === null ? 0 : Date.now() - this.startedAt)
    );
  }
}

export class UpdateListener {
  /**
   * A flash runs for minutes and is polled once a second, often from a phone standing outdoors at
   * a gate, so the poll rides out a short run of misses and keeps the last reading on screen.
   */
  static readonly maxConsecutiveFetchFailures = 5;

  consecutiveFetchFailures = 0;
  /** One request at a time: the timer does not wait for its callback. */
  isFetchingStatus = false;
  readonly start = new Stopwatch();
  latestSnapshot: UpdateProgressSnapshot | null = null;
  firmwareUpdateId: number | null = null;
  /** The 1 s poll while it runs. */
  timer: ReturnType<typeof setInterval> | null = null;
  private listeners: Listeners | null = null;
  private closed = false;
  private device!: Device;
  private firmware!: Firmware;
  private readonly startFwUpdate: StartFwUpdateFn;
  private readonly fetchUpdateStatus: FetchUpdateStatusFn;

  constructor({
    startFwUpdate,
    fetchUpdateStatus,
  }: {
    startFwUpdate?: StartFwUpdateFn;
    fetchUpdateStatus?: FetchUpdateStatusFn;
  } = {}) {
    this.startFwUpdate = startFwUpdate ?? startFwUpdateAndGetFileSize;
    this.fetchUpdateStatus = fetchUpdateStatus ?? getDeviceUpdateStatus;
  }

  /** getUpdateStream(...).listen(onData, onError): the first listen starts listening. */
  getUpdateStream(
    device: Device,
    firmware: Firmware,
    listeners: Listeners,
  ): void {
    if (this.listeners !== null) {
      return;
    }
    this.device = device;
    this.firmware = firmware;
    this.listeners = listeners;
    this.startListening();
  }

  private addError(error: unknown): void {
    const listeners = this.listeners;
    if (listeners === null || this.closed) {
      return;
    }
    queueMicrotask(() => listeners.onError(error));
  }

  sendSnapshot(snapshot: UpdateProgressSnapshot): void {
    const listeners = this.listeners;
    if (listeners === null || this.closed) {
      return;
    }
    // PORT-GAP: debugPrint("send <snapshot> to frontend.").
    this.latestSnapshot = snapshot;
    queueMicrotask(() => listeners.onData(snapshot));
  }

  async startListening({ shouldStart = false } = {}): Promise<void> {
    this.start.start();
    if (this.firmwareUpdateId === null) {
      if (!shouldStart) {
        return;
      }
      try {
        this.firmwareUpdateId = await this.startFwUpdate({
          deviceId: this.device.id,
          firmwareId: this.firmware.id,
        });
      } catch (error) {
        this.addError(error);
        return;
      }
    }
    this.cancelTimer();
    this.timer = setInterval(() => {
      this.getUpdateStatus();
    }, 1000);
  }

  async getUpdateStatus(): Promise<void> {
    if (this.firmwareUpdateId === null || this.isFetchingStatus) {
      return;
    }
    this.isFetchingStatus = true;
    let update: FirmwareUpdate;
    try {
      update = await this.fetchUpdateStatus(this.firmwareUpdateId);
    } catch (error) {
      this.consecutiveFetchFailures++;
      if (
        this.consecutiveFetchFailures <
        UpdateListener.maxConsecutiveFetchFailures
      ) {
        // Inside the budget: say nothing, and leave the last reading on screen.
        return;
      }
      // Out of budget: report that the update cannot be seen (not that it failed).
      this.cancelTimer();
      this.addError(error);
      return;
    } finally {
      this.isFetchingStatus = false;
    }
    this.consecutiveFetchFailures = 0;
    this.parseEvent(update);
  }

  parseEvent(update: FirmwareUpdate): void {
    const cursor = Math.max(
      this.latestSnapshot?.cursorPosition ?? 0,
      update.fileCursor ?? 0,
    );
    let status: FirmwareUpdateStatusCode;
    switch (update.status) {
      case 'PENDING':
        status = FirmwareUpdateStatusCodes.Starting;
        break;
      case 'RUNNING':
        status = FirmwareUpdateStatusCodes.InProgress;
        break;
      case 'FAILED':
        status = FirmwareUpdateStatusCodes.FailTimeout;
        break;
      case 'SUCCEEDED':
        status = FirmwareUpdateStatusCodes.CompleteSuccess;
        // The hub's shown version changes at once (the hub reports its own a little later).
        if (this.firmware.processor === 'RFM6601') {
          this.device.device.rfm6601AppVersion = this.firmware.versionNumber;
        } else {
          this.device.device.esp32AppVersion = this.firmware.versionNumber;
        }
        this.device.triggerFrontEndRebuild();
        break;
      default:
        // Sentry.captureMessage in Flutter.
        reportError(`FirmwareUpdate status unrecognized ${update.toString()}`);
        status = FirmwareUpdateStatusCodes.FailTimeout;
        break;
    }
    if (
      status !== FirmwareUpdateStatusCodes.Starting &&
      status !== FirmwareUpdateStatusCodes.InProgress
    ) {
      this.cancelTimer();
    }
    const totalSize = update.fileSize ?? this.latestSnapshot?.totalSize ?? 0;
    const elapsedMilliseconds =
      update.dateStarted !== null
        ? // DateTime.now().difference(dateStarted).inMilliseconds (truncated; no −0).
          Math.trunc(
            (DartDateTime.now().microsecondsSinceEpoch -
              update.dateStarted.microsecondsSinceEpoch) /
              1000,
          ) + 0
        : this.start.elapsedMilliseconds;
    this.sendSnapshot(
      new UpdateProgressSnapshot(
        cursor,
        totalSize,
        elapsedMilliseconds,
        status,
      ),
    );
  }

  private cancelTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** The stream's controller has been closed. */
  get isClosed(): boolean {
    return this.closed;
  }

  close(): void {
    this.cancelTimer();
    this.closed = true;
    this.start.stop();
  }
}
