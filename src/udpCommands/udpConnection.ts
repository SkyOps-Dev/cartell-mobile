// Port of frontend/lib/udp_commands/udp_connection.dart (spec 17 §1): the one UDP socket pairing
// talks to the hub through, and the listeners that hear every reply.
//
// Flutter binds dart:io's RawDatagramSocket; RN binds react-native-udp's. The singleton's rules
// are Flutter's: getInstance waits a second and then binds the reply port; a bind that fails
// leaves nothing installed; a clearConnection that lands while the bind is in flight makes
// getInstance close the new socket and throw StateError, so no socket is left holding the port.
//
// Two things differ only in mechanism. dart:io's send is synchronous and throws a SocketException
// at once; react-native-udp reports a failed send in a callback, so send() here returns a promise
// that rejects with a SocketException instead. And a send on a closed socket does nothing, as
// dart:io's does (it returns 0). The sender's address is not checked, as in Flutter.

import dgram from 'react-native-udp';

import { config } from '../config/environment';
import { hubDestination, StateError } from '../config/hubAddress';
import { SocketException } from '../services/exceptions';
import { reportError } from '../services/reportError';
import { AbstractUdpCommand } from './commands/abstractUdpCommand';
import { getUdpCommand } from './udpCommandRouting';

type UdpSocket = ReturnType<typeof dgram.createSocket>;

export interface Observer<T> {
  receive(message: T): void;
}

export abstract class Subject<T> {
  listeners: Observer<T>[] = [];

  addListener(listener: Observer<T>): void {
    this.listeners.push(listener);
  }

  /** Removes the first registration of `listener`, as Dart's List.remove does. */
  removeListener(listener: Observer<T>): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Hands `message` to every listener. A copy is walked, so a listener may remove itself while it
   * receives (the credential acknowledgement does). A listener that throws is reported and the
   * rest still receive. (Dart reports only an Exception there and lets an Error end the loop; the
   * listeners throw neither.)
   */
  update(message: T): void {
    for (const listener of [...this.listeners]) {
      try {
        listener.receive(message);
      } catch (error) {
        reportError(error);
      }
    }
  }
}

const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

export class UDPConnection extends Subject<AbstractUdpCommand> {
  static instance: UDPConnection | null = null;

  private connected = false;
  private socket: UdpSocket | null = null;
  private closed = false;
  private readonly future: Promise<void>;

  /** Do not use: for the singleton (getInstance). */
  constructor() {
    super();
    this.future = this.openConnection().then(() => this.listenToSocket());
  }

  /** The shared connection, bound and listening. Throws if the bind fails. */
  static async getInstance(): Promise<UDPConnection> {
    const existing = UDPConnection.instance;
    if (existing !== null) {
      return existing;
    }

    const created = new UDPConnection();
    UDPConnection.instance = created;
    try {
      await created.getFuture();
    } catch (error) {
      // Only if nothing has replaced it in the meantime.
      if (UDPConnection.instance === created) {
        UDPConnection.instance = null;
      }
      throw error;
    }
    // A clearConnection while the bind was in flight: whoever asked was abandoned while waiting,
    // so the new socket is closed rather than left holding the reply port.
    if (UDPConnection.instance !== created) {
      created.close();
      throw new StateError(
        'The UDP connection was closed while it was opening',
      );
    }
    return created;
  }

  /** Clears the singleton first, then closes it; a socket never bound is nothing to close. */
  static clearConnection(): void {
    const existing = UDPConnection.instance;
    UDPConnection.instance = null;
    if (existing === null) {
      return;
    }
    try {
      existing.close();
    } catch {
      // Never bound, or already closed: nothing to release.
    }
  }

  getFuture(): Promise<void> {
    return this.future;
  }

  /** Waits a second, then binds the reply port on every address. */
  private async openConnection(): Promise<void> {
    await sleep(1000);
    const socket = dgram.createSocket({ type: 'udp4' });
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
        socket.removeListener('listening', onListening);
        // Release the native socket that never bound; nothing else holds it.
        socket.on('error', reportError);
        socket.close();
        reject(new SocketException(error.message));
      };
      const onListening = () => {
        socket.removeListener('error', onError);
        resolve();
      };
      socket.once('error', onError);
      socket.once('listening', onListening);
      socket.bind(config.hubReplyPort, '0.0.0.0');
    });
    // From here on a late error (a failed close) is reported, never thrown at the app.
    socket.on('error', reportError);
    this.socket = socket;
    this.connected = true;
  }

  /** Hands every datagram that arrives to the listeners, parsed. */
  private listenToSocket(): void {
    this.socket?.on('message', (datagram: Uint8Array) =>
      this.parsePacket(datagram),
    );
  }

  /**
   * A datagram as a message. A frame too short for its type throws (as ByteData does); Flutter's
   * stream then reports it to Sentry and keeps listening, as reportError does here.
   */
  parsePacket(datagram: Uint8Array): void {
    try {
      const data = new DataView(
        datagram.buffer,
        datagram.byteOffset,
        datagram.byteLength,
      );
      this.update(getUdpCommand(data));
    } catch (error) {
      reportError(error);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  /** Sends a message to the hub. Rejects with a SocketException if it could not be sent. */
  async send(packet: AbstractUdpCommand): Promise<void> {
    if (this.socket === null) {
      throw new StateError('The UDP connection is not open');
    }
    if (this.closed) {
      return;
    }
    await sendToSocket(this.socket, packet.data);
  }

  /** Closes the socket. Throws if it was never bound (Dart's unassigned late field). */
  close(): void {
    if (this.socket === null) {
      throw new StateError('The UDP connection was never opened');
    }
    this.closed = true;
    this.connected = false;
    this.socket.close();
  }
}

/**
 * Sends `data` to hubAddress:hubPort. An address a socket cannot send to throws a SocketException
 * at once, so the pairing loops handle it as any failed send.
 */
export function sendToSocket(socket: UdpSocket, data: DataView): Promise<void> {
  const destination = hubDestination();
  if (destination === null) {
    throw new SocketException(
      `hubAddress '${config.hubAddress}' is not an IPv4 address`,
    );
  }
  const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  return new Promise<void>((resolve, reject) => {
    socket.send(
      bytes,
      undefined,
      undefined,
      config.hubPort,
      destination,
      (error?: Error) => {
        if (error) {
          reject(new SocketException(error.message));
        } else {
          resolve();
        }
      },
    );
  });
}
