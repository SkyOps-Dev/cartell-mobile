// Stand-in for react-native-udp (the hub pairing socket): in-memory sockets with the library's
// bind / send / close / 'message' behaviour. Tests read what was sent, deliver datagrams as the hub
// would, and make binds or sends fail. jest.setup.js installs it; reset it in beforeEach.

import { EventEmitter } from 'events';

export type SentDatagram = { bytes: Uint8Array; port: number; address: string };

export class FakeUdpSocket extends EventEmitter {
  boundPort: number | null = null;
  closed = false;

  bind(port: number, address?: string) {
    setTimeout(() => {
      if (udpMock.failBindWith !== null) {
        this.emit('error', new Error(udpMock.failBindWith));
      } else if (port < 0 || port > 65535) {
        this.emit('error', new Error(`Invalid port ${port}`));
      } else if (udpMock.sockets.some(s => s.boundPort === port && !s.closed)) {
        this.emit('error', new Error('bind failed: EADDRINUSE'));
      } else {
        this.boundPort = port;
        udpMock.bindAddresses.push(address ?? '');
        this.emit('listening');
      }
    }, 0);
  }

  send(
    msg: Uint8Array,
    _offset: number | undefined,
    _length: number | undefined,
    port: number,
    address: string,
    callback: (error?: Error) => void,
  ) {
    const bytes = Uint8Array.from(msg);
    setTimeout(() => {
      if (udpMock.failSendWith !== null) {
        callback(new Error(udpMock.failSendWith));
        return;
      }
      udpMock.sent.push({ bytes, port, address });
      callback();
      udpMock.onSend?.(bytes, this);
    }, 0);
  }

  close(callback?: () => void) {
    this.closed = true;
    this.removeAllListeners('message');
    setTimeout(() => {
      this.emit('close');
      callback?.();
    }, 0);
  }
}

export const udpMock = {
  sockets: [] as FakeUdpSocket[],
  sent: [] as SentDatagram[],
  bindAddresses: [] as string[],
  failBindWith: null as string | null,
  failSendWith: null as string | null,
  /** Called after each successful send, e.g. to answer as a hub would. */
  onSend: null as ((bytes: Uint8Array, socket: FakeUdpSocket) => void) | null,

  reset() {
    udpMock.sockets = [];
    udpMock.sent = [];
    udpMock.bindAddresses = [];
    udpMock.failBindWith = null;
    udpMock.failSendWith = null;
    udpMock.onSend = null;
  },

  /** The socket bound to `port` and still open. */
  boundOn(port: number): FakeUdpSocket | undefined {
    return udpMock.sockets.find(s => s.boundPort === port && !s.closed);
  },

  /** A datagram arriving on every open bound socket, as react-native-udp hands it over. */
  deliver(bytes: Uint8Array) {
    for (const socket of udpMock.sockets) {
      if (socket.boundPort !== null && !socket.closed) {
        socket.emit('message', Buffer.from(bytes), {
          address: '192.168.4.1',
          port: 5002,
          family: 'IPv4',
          size: bytes.length,
        });
      }
    }
  },
};

export default {
  createSocket(_options: { type: string }) {
    const socket = new FakeUdpSocket();
    udpMock.sockets.push(socket);
    return socket;
  },
};
