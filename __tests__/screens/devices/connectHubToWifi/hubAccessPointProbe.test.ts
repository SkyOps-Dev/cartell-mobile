// Ported from the "probeHubAccessPoint" group of
// frontend/test/screens/devices/connect_hub_to_wifi/access_point_probe_test.dart, plus
// askHubForFirmwareVersion (utilities.dart), which Flutter tests only through the probe, here
// against the in-memory socket.

import { udpMock } from '../../../helpers/udpMock';
import {
  HubBackInAccessPointMode,
  HubNotOnAccessPoint,
  probeHubAccessPoint,
  ProbeInconclusive,
} from '../../../../src/screens/devices/connectHubToWifi/hubAccessPointProbe';
import { askHubForFirmwareVersion } from '../../../../src/screens/devices/connectHubToWifi/utilities';
import {
  ArgumentError,
  SocketException,
} from '../../../../src/services/exceptions';
import {
  GetFWVersionReply,
  ReadWebsocketUriReply,
} from '../../../../src/udpCommands/commands';
import { UDPConnection } from '../../../../src/udpCommands/udpConnection';
import { AsyncTimeoutException } from '../../../../src/utilities/dartAsync';

const never = () => new Promise<void>(() => undefined);

describe('probeHubAccessPoint', () => {
  test('a reply means the hub reverted', async () => {
    const result = await probeHubAccessPoint({
      join: async () => undefined,
      ask: async () => undefined,
      leave: async () => undefined,
    });
    expect(result).toBeInstanceOf(HubBackInAccessPointMode);
  });

  test('silence means it is not on its access point', async () => {
    const result = await probeHubAccessPoint({
      join: async () => undefined,
      ask: never,
      leave: async () => undefined,
      timeoutMs: 20,
    });
    expect(result).toBeInstanceOf(HubNotOnAccessPoint);
  });

  test('a failure to get there settles nothing', async () => {
    const result = await probeHubAccessPoint({
      join: async () => {
        throw new Error('wifi refused');
      },
      ask: async () => undefined,
      leave: async () => undefined,
    });
    // The probe failing says nothing about the hub.
    expect(result).toBeInstanceOf(ProbeInconclusive);
  });

  test('an Error is caught too, not only an Exception', async () => {
    const result = await probeHubAccessPoint({
      join: async () => {
        throw new ArgumentError('bad address');
      },
      ask: async () => undefined,
      leave: async () => undefined,
    });
    expect(result).toBeInstanceOf(ProbeInconclusive);
  });

  describe('leaves the hub network on every path', () => {
    test('after a reply', async () => {
      let left = false;
      await probeHubAccessPoint({
        join: async () => undefined,
        ask: async () => undefined,
        leave: async () => {
          left = true;
        },
      });
      expect(left).toBe(true);
    });

    test('after a timeout', async () => {
      let left = false;
      await probeHubAccessPoint({
        join: async () => undefined,
        ask: never,
        leave: async () => {
          left = true;
        },
        timeoutMs: 20,
      });
      expect(left).toBe(true);
    });

    test('after a throw', async () => {
      // Nothing else in the flow puts the phone back on its own network.
      let left = false;
      await probeHubAccessPoint({
        join: async () => {
          throw new Error('boom');
        },
        ask: async () => undefined,
        leave: async () => {
          left = true;
        },
      });
      expect(left).toBe(true);
    });

    test('and a cleanup that never returns cannot hold the answer', async () => {
      // Seen on a Pixel 8 Pro on 2026-09-01: the plugin's disconnect never completed.
      const result = await probeHubAccessPoint({
        join: async () => undefined,
        ask: async () => undefined,
        leave: never,
        cleanupTimeoutMs: 20,
      });
      expect(result).toBeInstanceOf(HubBackInAccessPointMode);
    });

    test('and a failure to leave does not replace the answer', async () => {
      const result = await probeHubAccessPoint({
        join: async () => undefined,
        ask: async () => undefined,
        leave: async () => {
          throw new Error('already gone');
        },
      });
      expect(result).toBeInstanceOf(HubBackInAccessPointMode);
    });
  });
});

describe('askHubForFirmwareVersion', () => {
  let socket: UDPConnection;

  beforeEach(async () => {
    jest.useFakeTimers();
    udpMock.reset();
    UDPConnection.instance = null;
    const pending = UDPConnection.getInstance();
    await jest.advanceTimersByTimeAsync(1001);
    socket = await pending;
  });

  afterEach(() => {
    UDPConnection.clearConnection();
    jest.useRealTimers();
  });

  const reply = (command: { data: DataView }) =>
    udpMock.deliver(
      new Uint8Array(
        command.data.buffer,
        command.data.byteOffset,
        command.data.byteLength,
      ),
    );

  test('sends one GetFWVersion and settles on the version reply', async () => {
    let settled = false;
    const asked = askHubForFirmwareVersion(socket, { timeoutMs: 8000 }).then(
      () => {
        settled = true;
      },
    );
    await jest.advanceTimersByTimeAsync(1);
    expect(udpMock.sent).toHaveLength(1);
    expect(udpMock.sent[0].bytes[4]).toBe(0x01); // type 000A0001, little-endian

    reply(GetFWVersionReply.generate({ version: 1029 }));
    await asked;
    expect(settled).toBe(true);
    expect(socket.listeners).toHaveLength(0);
  });

  test('any other message does not count', async () => {
    const outcome = askHubForFirmwareVersion(socket, { timeoutMs: 8000 }).catch(
      error => error,
    );
    await jest.advanceTimersByTimeAsync(1);
    reply(ReadWebsocketUriReply.generate({ uri: 'ws://x' }));
    await jest.advanceTimersByTimeAsync(8000);

    expect(await outcome).toBeInstanceOf(AsyncTimeoutException);
  });

  test("times out with dart:async's TimeoutException and takes its listener off", async () => {
    const outcome = askHubForFirmwareVersion(socket, { timeoutMs: 8000 }).catch(
      error => error,
    );
    await jest.advanceTimersByTimeAsync(8000);

    expect(await outcome).toBeInstanceOf(AsyncTimeoutException);
    expect(socket.listeners).toHaveLength(0);
  });

  test('a failed send ends the wait at once (dart:io throws it)', async () => {
    udpMock.failSendWith = 'Network is unreachable';
    const outcome = askHubForFirmwareVersion(socket, { timeoutMs: 8000 }).catch(
      error => error,
    );
    await jest.advanceTimersByTimeAsync(1);

    expect(await outcome).toBeInstanceOf(SocketException);
    expect(socket.listeners).toHaveLength(0);
  });
});
