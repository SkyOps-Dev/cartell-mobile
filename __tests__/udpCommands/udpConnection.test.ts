// Ported from frontend/test/udp_commands/udp_connection_test.dart (Subject.update and the send
// destination; its default-address tests are in __tests__/config/hubAddress.test.ts) and
// udp_connection_singleton_test.dart (the singleton when a bind fails or is abandoned), plus the
// receive path and react-native-udp's asynchronous send errors. The socket is the in-memory
// stand-in, __tests__/helpers/udpMock.ts.

import { udpMock } from '../helpers/udpMock';
import { config } from '../../src/config/environment';
import { StateError } from '../../src/config/hubAddress';
import { SocketException } from '../../src/services/exceptions';
import * as errorReporter from '../../src/services/reportError';
import {
  AbstractUdpCommand,
  GetFWVersion,
  GetFWVersionReply,
} from '../../src/udpCommands/commands';
import {
  Observer,
  sendToSocket,
  Subject,
  UDPConnection,
} from '../../src/udpCommands/udpConnection';
import dgram from 'react-native-udp';

class TestSubject extends Subject<string> {}

class RecordingObserver implements Observer<string> {
  received: string[] = [];
  constructor(private readonly onReceive?: () => void) {}
  receive(message: string) {
    this.received.push(message);
    this.onReceive?.();
  }
}

const original = { ...config };

beforeEach(() => {
  jest.useFakeTimers();
  udpMock.reset();
  UDPConnection.instance = null;
});

afterEach(() => {
  Object.assign(config, original);
  UDPConnection.instance = null;
  jest.useRealTimers();
});

/** getInstance, with the clock run through its one-second wait and the bind. */
async function open(): Promise<UDPConnection> {
  const pending = UDPConnection.getInstance();
  await jest.advanceTimersByTimeAsync(1000);
  await jest.advanceTimersByTimeAsync(1);
  return pending;
}

describe('Subject.update', () => {
  test('a listener removing itself mid-broadcast does not stop later listeners', () => {
    const subject = new TestSubject();
    const selfRemoving: RecordingObserver = new RecordingObserver(() =>
      subject.removeListener(selfRemoving),
    );
    const after = new RecordingObserver();
    subject.addListener(selfRemoving);
    subject.addListener(after);

    // What the credential acknowledgement does: remove itself from inside receive().
    expect(() => subject.update('ack')).not.toThrow();
    expect(selfRemoving.received).toEqual(['ack']);
    expect(after.received).toEqual(['ack']);

    subject.update('second');
    expect(selfRemoving.received).toEqual(['ack']);
    expect(after.received).toEqual(['ack', 'second']);
  });

  test('a listener that throws is reported, and the rest still receive', () => {
    const report = jest.spyOn(errorReporter, 'reportError');
    const subject = new TestSubject();
    const failing = new RecordingObserver(() => {
      throw new Error('listener failed');
    });
    const after = new RecordingObserver();
    subject.addListener(failing);
    subject.addListener(after);

    subject.update('message');
    expect(after.received).toEqual(['message']);
    expect(report).toHaveBeenCalledWith(new Error('listener failed'));
    report.mockRestore();
  });
});

describe('sendToSocket destination', () => {
  test('rejects an address a socket cannot send to as a SocketException', () => {
    const sender = dgram.createSocket({ type: 'udp4' });
    for (const bad of ['192.168.1.50:5002', 'my-laptop.local', '']) {
      config.hubAddress = bad;
      expect(() =>
        sendToSocket(sender, new DataView(new ArrayBuffer(4))),
      ).toThrow(
        new SocketException(`hubAddress '${bad}' is not an IPv4 address`),
      );
    }
  });

  test('sends to the configured address and port, not a fixed one', async () => {
    config.hubAddress = '127.0.0.1';
    config.hubPort = 40123;
    const sender = dgram.createSocket({ type: 'udp4' });
    const payload = new DataView(
      Uint8Array.from([0xde, 0xad, 0xbe, 0xef]).buffer,
    );

    const sent = sendToSocket(sender, payload);
    await jest.advanceTimersByTimeAsync(1);
    await sent;

    expect(udpMock.sent).toHaveLength(1);
    expect(udpMock.sent[0].address).toBe('127.0.0.1');
    expect(udpMock.sent[0].port).toBe(40123);
    expect(Array.from(udpMock.sent[0].bytes)).toEqual([0xde, 0xad, 0xbe, 0xef]);
  });
});

describe('the singleton', () => {
  /** Out of range for a UDP port, so the bind fails. */
  const makeBindFail = () => {
    config.hubReplyPort = 99999;
  };

  test('a failed bind does not leave the broken instance installed', async () => {
    makeBindFail();
    const pending = UDPConnection.getInstance();
    const outcome = pending.catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(1);
    expect(await outcome).toBeInstanceOf(SocketException);

    expect(UDPConnection.instance).toBeNull();
    // The native socket that never bound is released.
    expect(udpMock.sockets[0].closed).toBe(true);
  });

  test('clearConnection after a failed bind clears rather than throwing', async () => {
    makeBindFail();
    const connection = new UDPConnection();
    UDPConnection.instance = connection;
    const settled = connection.getFuture().catch(() => undefined);
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(1);
    await settled;

    expect(() => UDPConnection.clearConnection()).not.toThrow();
    expect(UDPConnection.instance).toBeNull();
  });

  test('a good bind still installs and reuses one instance', async () => {
    const first = await open();
    const second = await UDPConnection.getInstance();

    expect(second).toBe(first);
    expect(UDPConnection.instance).toBe(first);
    expect(first.isConnected()).toBe(true);
    // The reply port, on every address.
    expect(udpMock.boundOn(6452)).toBeDefined();
    expect(udpMock.bindAddresses).toEqual(['0.0.0.0']);

    UDPConnection.clearConnection();
    expect(UDPConnection.instance).toBeNull();
    expect(udpMock.boundOn(6452)).toBeUndefined();
  });

  test('waits a second before it binds', async () => {
    const pending = UDPConnection.getInstance();
    await jest.advanceTimersByTimeAsync(999);
    expect(udpMock.sockets).toHaveLength(0);
    await jest.advanceTimersByTimeAsync(1);
    await jest.advanceTimersByTimeAsync(1);
    await pending;
    expect(udpMock.boundOn(6452)).toBeDefined();
    UDPConnection.clearConnection();
  });

  test('a connection cleared while it was opening does not leak', async () => {
    const pending = UDPConnection.getInstance();
    const outcome = pending.catch((error: unknown) => error);

    // Inside the second before the bind, where a Cancel during pairing lands.
    await jest.advanceTimersByTimeAsync(100);
    UDPConnection.clearConnection();
    await jest.advanceTimersByTimeAsync(900);
    await jest.advanceTimersByTimeAsync(1);
    expect(await outcome).toBeInstanceOf(StateError);
    expect(UDPConnection.instance).toBeNull();

    // The port is free again: a leaked socket would hold it and this bind would fail.
    const replacement = await open();
    expect(replacement.isConnected()).toBe(true);
    UDPConnection.clearConnection();
  });
});

describe('sending and receiving', () => {
  test('a datagram reaches every listener as its parsed message', async () => {
    const connection = await open();
    const received: AbstractUdpCommand[] = [];
    connection.addListener({ receive: message => received.push(message) });

    udpMock.deliver(
      new Uint8Array(GetFWVersionReply.generate({ version: 1025 }).data.buffer),
    );

    expect(received).toHaveLength(1);
    expect(received[0]).toBeInstanceOf(GetFWVersionReply);
    expect((received[0] as GetFWVersionReply).version).toBe(1025);
    UDPConnection.clearConnection();
  });

  test('a datagram too short to read is reported, and listening goes on', async () => {
    const report = jest.spyOn(errorReporter, 'reportError');
    const connection = await open();
    const received: AbstractUdpCommand[] = [];
    connection.addListener({ receive: message => received.push(message) });

    udpMock.deliver(Uint8Array.from([0xde, 0xad]));
    expect(report).toHaveBeenCalledWith(expect.any(RangeError));

    udpMock.deliver(new Uint8Array(GetFWVersion.generate().data.buffer));
    expect(received).toHaveLength(1);
    report.mockRestore();
    UDPConnection.clearConnection();
  });

  test('send writes the frame to the hub', async () => {
    const connection = await open();
    const sending = connection.send(GetFWVersion.generate());
    await jest.advanceTimersByTimeAsync(1);
    await sending;

    expect(udpMock.sent).toHaveLength(1);
    expect(udpMock.sent[0]).toEqual({
      bytes: new Uint8Array(GetFWVersion.generate().data.buffer),
      port: 5002,
      address: '192.168.4.1',
    });
    UDPConnection.clearConnection();
  });

  test('a failed send rejects with a SocketException', async () => {
    const connection = await open();
    udpMock.failSendWith = 'Network is unreachable';
    const sending = connection.send(GetFWVersion.generate());
    const outcome = sending.catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(1);
    expect(await outcome).toEqual(
      new SocketException('Network is unreachable'),
    );
    UDPConnection.clearConnection();
  });

  test('a send on a closed connection does nothing, as dart:io’s does', async () => {
    const connection = await open();
    UDPConnection.clearConnection();
    const sending = connection.send(GetFWVersion.generate());
    await jest.advanceTimersByTimeAsync(1);
    await expect(sending).resolves.toBeUndefined();
    expect(udpMock.sent).toHaveLength(0);
  });
});
