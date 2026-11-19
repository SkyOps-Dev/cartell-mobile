// Port of frontend/test/screens/devices/firmware_update/firmware_update_listener_test.dart (every
// test, in its groups), plus the snapshot's arithmetic (update_progress_snapshot.dart), the
// listener's cursor and elapsed-time rules, and the screen's duration format.

import { parseDevice } from '../../../src/models/device';
import { Firmware, FirmwareUpdate } from '../../../src/models/firmware';
import {
  FirmwareUpdateStatusCodes,
  statusCodeText,
} from '../../../src/screens/devices/firmwareUpdate/firmwareUpdateStatusCode';
import { UpdateListener } from '../../../src/screens/devices/firmwareUpdate/firmwareUpdateListener';
import { formatDuration } from '../../../src/screens/devices/firmwareUpdate/UpdateDeviceScreen';
import { UpdateProgressSnapshot } from '../../../src/screens/devices/firmwareUpdate/updateProgressSnapshot';
import {
  DartDateTime,
  parseDartDateTime,
} from '../../../src/utilities/dartDateTime';
import { hubJson } from '../../helpers/hubJson';

let nextHubId = 9600;
const testDevice = (id = nextHubId++) =>
  parseDevice(
    hubJson({
      id,
      device: { esp32_app_version: null, rfm6601_app_version: null },
    }),
  );

const testFirmware = ({
  id = 7,
  processor = 'ESP32',
  versionNumber = 5020,
} = {}) => new Firmware(id, versionNumber, null, null, null, processor);

const date2024 = () => parseDartDateTime('2024-01-01T00:00:00Z');

const update = ({
  id = 1,
  status = null as string | null,
  fileCursor = null as number | null,
  fileSize = null as number | null,
  dateStarted = null as DartDateTime | null,
} = {}) =>
  new FirmwareUpdate(
    id,
    fileSize,
    fileCursor,
    status,
    null,
    dateStarted,
    null,
    null,
  );

/** Lets queued microtasks (the stream's deliveries) run. */
const pumpEventQueue = async () => {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
};

type Captured = { snapshots: UpdateProgressSnapshot[]; errors: unknown[] };

function listen(
  listener: UpdateListener,
  device = testDevice(),
  firmware = testFirmware(),
): Captured {
  const captured: Captured = { snapshots: [], errors: [] };
  listener.getUpdateStream(device, firmware, {
    onData: s => captured.snapshots.push(s),
    onError: e => captured.errors.push(e),
  });
  return captured;
}

/** A listener for parseEvent tests: starting an update is not expected. */
function listenerFor(device = testDevice(), firmware = testFirmware()) {
  const listener = new UpdateListener({
    startFwUpdate: async () => {
      throw new Error(
        'startFwUpdate should not be invoked in parseEvent tests',
      );
    },
  });
  return { listener, ...listen(listener, device, firmware) };
}

afterEach(() => jest.useRealTimers());

describe('UpdateListener error propagation', () => {
  test('emits an error on the stream when startFwUpdate throws', async () => {
    const boom = new Error(
      'Device is not connected. Please check its connection and try again.',
    );
    const listener = new UpdateListener({
      startFwUpdate: async () => {
        throw boom;
      },
    });
    const { snapshots, errors } = listen(listener);

    await listener.startListening({ shouldStart: true });
    await pumpEventQueue();

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBe(boom);
    expect(snapshots).toEqual([]);
    listener.close();
  });

  test('does NOT emit an error on the stream when startFwUpdate succeeds', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
    const listener = new UpdateListener({ startFwUpdate: async () => 123 });
    const { errors } = listen(listener);

    await listener.startListening({ shouldStart: true });
    await pumpEventQueue();

    expect(errors).toEqual([]);
    expect(listener.firmwareUpdateId).toBe(123);
    listener.close();
  });

  test('does NOT call startFwUpdate when shouldStart is false', async () => {
    let calls = 0;
    const listener = new UpdateListener({
      startFwUpdate: async () => {
        calls++;
        return 1;
      },
    });
    listen(listener);

    await listener.startListening();
    await pumpEventQueue();

    expect(calls).toBe(0);
    listener.close();
  });

  test('forwards deviceId and firmwareId to the injected startFwUpdate', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
    let received: { deviceId: number; firmwareId: number } | null = null;
    const listener = new UpdateListener({
      startFwUpdate: async args => {
        received = args;
        return 1;
      },
    });
    listen(listener, testDevice(555), testFirmware({ id: 9 }));

    await listener.startListening({ shouldStart: true });
    await pumpEventQueue();

    expect(received).toEqual({ deviceId: 555, firmwareId: 9 });
    listener.close();
  });
});

describe('UpdateListener.parseEvent status mapping', () => {
  test('PENDING -> Starting (snapshot status is Starting, timer not set)', async () => {
    const { listener, snapshots } = listenerFor();
    await listener.startListening({ shouldStart: false });

    listener.parseEvent(
      update({ status: 'PENDING', fileCursor: 0, fileSize: 100 }),
    );
    await pumpEventQueue();

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].status).toBe(FirmwareUpdateStatusCodes.Starting);
    expect(listener.timer).toBeNull();
    listener.close();
  });

  test('RUNNING -> InProgress', async () => {
    const { listener, snapshots } = listenerFor();
    listener.parseEvent(
      update({
        status: 'RUNNING',
        fileCursor: 25,
        fileSize: 100,
        dateStarted: date2024(),
      }),
    );
    await pumpEventQueue();
    expect(snapshots[0].status).toBe(FirmwareUpdateStatusCodes.InProgress);
    listener.close();
  });

  test('FAILED -> FailTimeout', async () => {
    const { listener, snapshots } = listenerFor();
    listener.parseEvent(
      update({
        status: 'FAILED',
        fileCursor: 50,
        fileSize: 100,
        dateStarted: date2024(),
      }),
    );
    await pumpEventQueue();
    expect(snapshots[0].status).toBe(FirmwareUpdateStatusCodes.FailTimeout);
    listener.close();
  });

  test('SUCCEEDED for ESP32 firmware updates esp32AppVersion on the device', async () => {
    const device = testDevice();
    const notified = jest.fn();
    device.addListener(notified);
    const { listener, snapshots } = listenerFor(
      device,
      testFirmware({ processor: 'ESP32', versionNumber: 9001 }),
    );
    listener.parseEvent(
      update({
        status: 'SUCCEEDED',
        fileCursor: 100,
        fileSize: 100,
        dateStarted: date2024(),
      }),
    );
    await pumpEventQueue();

    expect(snapshots[0].status).toBe(FirmwareUpdateStatusCodes.CompleteSuccess);
    expect(device.device.esp32AppVersion).toBe(9001);
    expect(device.device.rfm6601AppVersion).toBeNull();
    expect(notified).toHaveBeenCalledTimes(1); // triggerFrontEndRebuild
    listener.close();
  });

  test('SUCCEEDED for RFM6601 firmware updates rfm6601AppVersion on the device', async () => {
    const device = testDevice();
    const { listener, snapshots } = listenerFor(
      device,
      testFirmware({ processor: 'RFM6601', versionNumber: 1234 }),
    );
    listener.parseEvent(
      update({
        status: 'SUCCEEDED',
        fileCursor: 100,
        fileSize: 100,
        dateStarted: date2024(),
      }),
    );
    await pumpEventQueue();

    expect(snapshots[0].status).toBe(FirmwareUpdateStatusCodes.CompleteSuccess);
    expect(device.device.rfm6601AppVersion).toBe(1234);
    expect(device.device.esp32AppVersion).toBeNull();
    listener.close();
  });

  test('unrecognised status defaults to FailTimeout', async () => {
    const { listener, snapshots } = listenerFor();
    listener.parseEvent(
      update({ status: 'SOMETHING_WEIRD', fileCursor: 0, fileSize: 0 }),
    );
    await pumpEventQueue();
    expect(snapshots[0].status).toBe(FirmwareUpdateStatusCodes.FailTimeout);
    listener.close();
  });

  test('close() cancels the timer, closes the stream, and stops the stopwatch', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
    const { listener } = listenerFor();
    listener.firmwareUpdateId = 5;
    await listener.startListening({ shouldStart: false });
    expect(listener.timer).not.toBeNull();
    expect(listener.start.isRunning).toBe(true);
    expect(listener.isClosed).toBe(false);

    listener.close();

    expect(listener.timer).toBeNull();
    expect(listener.isClosed).toBe(true);
    expect(listener.start.isRunning).toBe(false);
  });

  test('close() is idempotent: a second call does not throw', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
    const { listener } = listenerFor();
    listener.firmwareUpdateId = 5;
    await listener.startListening({ shouldStart: false });
    listener.close();
    listener.close();
    expect(listener.isClosed).toBe(true);
  });

  test('close() before any timer is set still completes cleanly', () => {
    const { listener } = listenerFor();
    listener.close();
    expect(listener.isClosed).toBe(true);
  });

  test('terminal status (SUCCEEDED) cancels the active polling timer', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
    const { listener } = listenerFor();
    listener.firmwareUpdateId = 99;
    await listener.startListening({ shouldStart: false });
    expect(listener.timer).not.toBeNull();

    listener.parseEvent(
      update({
        status: 'SUCCEEDED',
        fileCursor: 100,
        fileSize: 100,
        dateStarted: date2024(),
      }),
    );

    expect(listener.timer).toBeNull();
    listener.close();
  });
});

describe('UpdateListener resume', () => {
  test('adopting an existing update id skips the POST and polls that record', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
    let startCalls = 0;
    let fetchedId = -1;
    const listener = new UpdateListener({
      startFwUpdate: async () => {
        startCalls++;
        return 999;
      },
      fetchUpdateStatus: async id => {
        fetchedId = id;
        return update({
          id,
          status: 'RUNNING',
          fileCursor: 40,
          fileSize: 100,
          dateStarted: parseDartDateTime('2026-01-01T00:00:00Z'),
        });
      },
    });
    listen(listener);

    listener.firmwareUpdateId = 55;
    await listener.startListening({ shouldStart: true });
    await listener.getUpdateStatus();

    expect(startCalls).toBe(0);
    expect(fetchedId).toBe(55);
    listener.close();
  });

  test('with no id adopted, starting does POST once', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
    let startCalls = 0;
    const listener = new UpdateListener({
      startFwUpdate: async () => {
        startCalls++;
        return 77;
      },
      fetchUpdateStatus: async id => update({ id, status: 'PENDING' }),
    });
    listen(listener);

    await listener.startListening({ shouldStart: true });

    expect(startCalls).toBe(1);
    expect(listener.firmwareUpdateId).toBe(77);
    listener.close();
  });

  test('listening with an id already set starts the poll at once, as onListen does', () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
    const listener = new UpdateListener();
    listener.firmwareUpdateId = 55;
    listen(listener);
    expect(listener.timer).not.toBeNull();
    listener.close();
  });
});

describe('UpdateListener transient fetch failures', () => {
  function listenerWithFetches(results: (FirmwareUpdate | Error)[]) {
    let call = 0;
    const listener = new UpdateListener({
      startFwUpdate: async () => {
        throw new Error('startFwUpdate should not be invoked here');
      },
      fetchUpdateStatus: async () => {
        const result = results[Math.min(call, results.length - 1)];
        call++;
        if (result instanceof Error) {
          throw result;
        }
        return result;
      },
    });
    const captured = listen(listener);
    listener.firmwareUpdateId = 99;
    return { listener, ...captured };
  }

  const running = (cursor = 50) =>
    update({
      status: 'RUNNING',
      fileCursor: cursor,
      fileSize: 100,
      dateStarted: date2024(),
    });

  beforeEach(() => jest.useFakeTimers({ doNotFake: ['queueMicrotask'] }));

  test('a single dropped request does not report the update as failed', async () => {
    const { listener, snapshots, errors } = listenerWithFetches([
      new Error('connection reset'),
    ]);
    await listener.startListening({ shouldStart: false });

    await listener.getUpdateStatus();
    await pumpEventQueue();

    expect(snapshots.map(s => s.status)).not.toContain(
      FirmwareUpdateStatusCodes.FailTimeout,
    );
    expect(errors).toEqual([]);
    expect(listener.timer).not.toBeNull();
    listener.close();
  });

  test('a success after misses resets the failure budget', async () => {
    const { listener, snapshots, errors } = listenerWithFetches([
      new Error('miss 1'),
      new Error('miss 2'),
      running(),
    ]);
    await listener.startListening({ shouldStart: false });

    await listener.getUpdateStatus();
    await listener.getUpdateStatus();
    await listener.getUpdateStatus();
    await pumpEventQueue();

    expect(listener.consecutiveFetchFailures).toBe(0);
    expect(snapshots.at(-1)!.status).toBe(FirmwareUpdateStatusCodes.InProgress);
    expect(errors).toEqual([]);
    expect(listener.timer).not.toBeNull();
    listener.close();
  });

  test('exhausting the budget reports lost contact, not a firmware failure', async () => {
    const { listener, snapshots, errors } = listenerWithFetches([
      new Error('hub unreachable'),
    ]);
    await listener.startListening({ shouldStart: false });

    for (let i = 0; i < UpdateListener.maxConsecutiveFetchFailures; i++) {
      await listener.getUpdateStatus();
    }
    await pumpEventQueue();

    expect(errors).toHaveLength(1);
    expect(snapshots.map(s => s.status)).not.toContain(
      FirmwareUpdateStatusCodes.FailTimeout,
    );
    expect(listener.timer).toBeNull();
    listener.close();
  });

  test('a real FAILED status from the server is still terminal', async () => {
    const { listener, snapshots } = listenerWithFetches([
      update({
        status: 'FAILED',
        fileCursor: 10,
        fileSize: 100,
        dateStarted: date2024(),
      }),
    ]);
    await listener.startListening({ shouldStart: false });

    await listener.getUpdateStatus();
    await pumpEventQueue();

    expect(snapshots.at(-1)!.status).toBe(
      FirmwareUpdateStatusCodes.FailTimeout,
    );
    expect(listener.timer).toBeNull();
    listener.close();
  });

  test('an in-flight fetch is not overlapped by the next tick', async () => {
    let resolveFetch: (u: FirmwareUpdate) => void = () => {};
    let calls = 0;
    const listener = new UpdateListener({
      startFwUpdate: async () => {
        throw new Error('unused');
      },
      fetchUpdateStatus: () => {
        calls++;
        return new Promise(resolve => {
          resolveFetch = resolve;
        });
      },
    });
    listen(listener);
    listener.firmwareUpdateId = 99;

    const first = listener.getUpdateStatus();
    await listener.getUpdateStatus();
    expect(calls).toBe(1);

    resolveFetch(running());
    await first;
    listener.close();
  });

  test('the timer polls once a second', async () => {
    const { listener } = listenerWithFetches([running()]);
    const fetch = jest.spyOn(listener, 'getUpdateStatus');
    await listener.startListening({ shouldStart: false });
    await jest.advanceTimersByTimeAsync(3000);
    expect(fetch).toHaveBeenCalledTimes(3);
    listener.close();
  });
});

describe('UpdateListener snapshots', () => {
  test('the cursor never goes backwards, and the size falls back to the last one', async () => {
    const { listener, snapshots } = listenerFor();
    listener.parseEvent(
      update({ status: 'RUNNING', fileCursor: 60, fileSize: 100 }),
    );
    listener.parseEvent(update({ status: 'RUNNING', fileCursor: 40 }));
    await pumpEventQueue();
    expect(snapshots.map(s => [s.cursorPosition, s.totalSize])).toEqual([
      [60, 100],
      [60, 100],
    ]);
    listener.close();
  });

  test('elapsed time counts from the server start when there is one', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
    jest.setSystemTime(new Date('2026-11-18T13:00:10.500Z'));
    const { listener, snapshots } = listenerFor();
    listener.parseEvent(
      update({
        status: 'RUNNING',
        fileCursor: 1,
        fileSize: 10,
        dateStarted: parseDartDateTime('2026-11-18T07:00:00.000250-06:00'),
      }),
    );
    await pumpEventQueue();
    // 10.5 s less 250 µs, truncated to the millisecond.
    expect(snapshots[0].elapsedMilliseconds).toBe(10499);
    listener.close();
  });

  test('without a start time, elapsed time is the stopwatch', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
    const { listener, snapshots } = listenerFor();
    await listener.startListening({ shouldStart: false });
    jest.advanceTimersByTime(2500);
    listener.parseEvent(update({ status: 'PENDING' }));
    await pumpEventQueue();
    expect(snapshots[0].elapsedMilliseconds).toBe(2500);
    expect(snapshots[0].totalSize).toBe(0);
    listener.close();
  });

  test('nothing reaches the screen once closed', async () => {
    const { listener, snapshots } = listenerFor();
    listener.close();
    listener.parseEvent(update({ status: 'RUNNING' }));
    await pumpEventQueue();
    expect(snapshots).toEqual([]);
  });
});

describe('UpdateProgressSnapshot', () => {
  test('percentage, overshoot and time left', () => {
    expect(new UpdateProgressSnapshot(0, 0, 0).percentageDone).toBe(0);
    expect(new UpdateProgressSnapshot(3072, 3000, 0).percentageDone).toBe(
      1.024,
    );
    // Below 0.1%: unknown.
    expect(
      new UpdateProgressSnapshot(2, 3000, 60000).estimatedTimeLeftSeconds,
    ).toBeNull();
    // A quarter done in 30.9 s: 3 × 30 = 90 s left.
    expect(
      new UpdateProgressSnapshot(25, 100, 30900).estimatedTimeLeftSeconds,
    ).toBe(90);
    // Past 100%: (1/1.024 − 1) × 30 truncates to 0.
    expect(
      new UpdateProgressSnapshot(3072, 3000, 30000).estimatedTimeLeftSeconds,
    ).toBe(0);
    expect(new UpdateProgressSnapshot(3000, 3000, 0).isTotalFileSent).toBe(
      true,
    );
  });

  test('toString, as Flutter prints it', () => {
    expect(
      new UpdateProgressSnapshot(
        1,
        2,
        3,
        FirmwareUpdateStatusCodes.Starting,
      ).toString(),
    ).toBe(
      'cursorPosition=1,totalSize=2,elapsedMilliseconds=3,status=(status=FirmwareUpdateStatusType.InProgress,code=1,msg=Waiting for hub)',
    );
    expect(statusCodeText(FirmwareUpdateStatusCodes.FailTimeout)).toBe(
      'status=FirmwareUpdateStatusType.Failure,code=3,msg=Firmware update timed out.',
    );
  });

  test('only the failure codes show a reference', () => {
    const errors = Object.values(FirmwareUpdateStatusCodes)
      .filter(c => c.isError)
      .map(c => c.code);
    expect(errors).toEqual([3, 4, 6, 7, 8, 9, 10, 11, 12, 100, -1]);
  });
});

describe('formatDuration (the progress screen)', () => {
  const s = (seconds: number) => formatDuration(seconds * 1e6);
  test('mm:ss under an hour, hh:mm:ss from one', () => {
    expect(s(0)).toBe('00:00');
    expect(s(75)).toBe('01:15');
    expect(s(3599)).toBe('59:59');
    expect(s(3600)).toBe('01:00:00');
    expect(s(36 * 3600 + 61)).toBe('36:01:01');
  });

  test("negative times use Dart's modulo (a phone clock behind the server's)", () => {
    expect(s(-5)).toBe('00:55');
    expect(formatDuration(-1500 * 1000)).toBe('00:59');
  });
});
