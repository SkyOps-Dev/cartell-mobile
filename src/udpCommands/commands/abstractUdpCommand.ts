// Port of frontend/lib/udp_commands/commands/abstract_udp_command.dart (spec 17 §2): one hub UDP
// message, and the field helpers every message uses.
//
// A frame is DE AD BE EF | type u32 LE | length u32 LE | payload | checksum u32 LE, the checksum
// being the plain sum of every byte before it. Offsets are absolute from the frame's start.
//
// Dart builds a message in its named constructors (`X.generate(...)`, `X.parse(data)`), whose
// initialising formals are set before the base constructor runs setData(). TypeScript assigns a
// subclass's fields only after super() returns, so here each message has static generate() and
// parse() that construct first and then fill the frame. AbstractUdpCommand.get, which picks the
// parser by type, is getUdpCommand in ../udpCommandRouting.ts, so this file does not import the
// messages that extend it.

import { Encryption } from '../../services/encryption';
import { DartDateTime } from '../../utilities/dartDateTime';
import { utf8DecodeAllowMalformed, utf8Encode } from '../../utilities/dartUtf8';

export class AbstractUdpCommand {
  messageLength: number;
  messageType: string;
  checksum = 0;
  data: DataView;

  syncByte1 = 'DE';
  syncByte2 = 'AD';
  syncByte3 = 'BE';
  syncByte4 = 'EF';

  constructor(
    messageType: string,
    messageLength = 16,
    data: DataView = new DataView(new ArrayBuffer(0)),
  ) {
    this.messageType = messageType;
    this.messageLength = messageLength;
    this.data = data;
  }

  /** AbstractUdpCommand.parse: a message of a type with no parser of its own. */
  static parse(data: DataView): AbstractUdpCommand {
    return new AbstractUdpCommand('', 16, data).parseFrame();
  }

  /** The body of Dart's `.generate` constructor: a fresh zeroed frame, filled in. */
  protected generateFrame(): this {
    this.data = new DataView(new ArrayBuffer(this.messageLength));
    this.setHeader();
    this.setMessageType();
    this.setMessageLength();
    this.setData();
    this.setChecksum();
    return this;
  }

  /** The body of Dart's `.parse` constructor. The length comes from the frame, not the type. */
  protected parseFrame(): this {
    this.getHeader(this.data);
    this.messageType = intToHex(this.getMessageType(), 8);
    this.messageLength = this.getMessageLength();
    this.parseData();
    this.checksum = this.getChecksum();
    return this;
  }

  setData(): void {}

  parseData(): void {}

  dataToString(): string {
    return '';
  }

  setHeader(): void {
    this.data.setUint8(0, hexToInt(this.syncByte1));
    this.data.setUint8(1, hexToInt(this.syncByte2));
    this.data.setUint8(2, hexToInt(this.syncByte3));
    this.data.setUint8(3, hexToInt(this.syncByte4));
  }

  getHeader(data: DataView): void {
    this.syncByte1 = intToHex(data.getUint8(0));
    this.syncByte2 = intToHex(data.getUint8(1));
    this.syncByte3 = intToHex(data.getUint8(2));
    this.syncByte4 = intToHex(data.getUint8(3));
  }

  setMessageType(): void {
    this.data.setUint32(4, hexToInt(this.messageType), true);
  }

  getMessageType(): number {
    return this.data.getUint32(4, true);
  }

  static getType(data: DataView): number {
    return data.getUint32(4, true);
  }

  setMessageLength(): void {
    this.data.setUint32(8, this.messageLength, true);
  }

  getMessageLength(): number {
    return this.data.getUint32(8, true);
  }

  setChecksum(): void {
    this.checksum = this.calculateChecksum();
    this.data.setUint32(this.messageLength - 4, this.checksum, true);
  }

  /** The frame's checksum if it is right; a wrong one is not rejected, it reads as 0. */
  getChecksum(): number {
    const dataChecksum = this.data.getUint32(this.messageLength - 4, true);
    const calculatedChecksum = this.calculateChecksum();
    return dataChecksum === calculatedChecksum ? dataChecksum : 0;
  }

  calculateChecksum(): number {
    let sum = 0;
    for (let i = 0; i < this.messageLength - 4; i++) {
      sum += this.data.getUint8(i);
    }
    return sum;
  }

  get description(): string {
    return '';
  }

  get title(): string {
    return '';
  }

  /** For the log. */
  toString(): string {
    const raw: string[] = [];
    for (let i = 0; i < this.messageLength; i++) {
      raw.push(`${intToHex(this.data.getUint8(i))} `);
    }
    return [
      `      Packet Type : ${this.messageType} : ${this.title}`,
      `      Description : ${this.description}`,
      `      Length : ${this.messageLength}`,
      `      Time : ${DartDateTime.now().toString()}`,
      '      Data: {',
      `      ${this.dataToString()}`,
      '      }',
      `      Checksum : ${this.checksum}`,
      `      Raw data : ${raw.join('')}`,
    ].join('\n');
  }

  /** For the log: "0x" and each byte in lower-case hex, without zero padding. */
  packetToHexString(): string {
    let string = '0x';
    for (let i = 0; i < this.data.byteLength; i++) {
      string += this.data.getUint8(i).toString(16);
    }
    return string;
  }
}

export function hexToInt(str: string): number {
  return parseInt(str, 16);
}

export function intToHex(num: number, digits = 2): string {
  return num.toString(16).padStart(digits, '0').toUpperCase();
}

/**
 * Uint8List.sublistView(data, start, end): a view of the bytes, with Dart's range check (a
 * DataView can sit inside a larger buffer, so the buffer alone would not catch an overrun).
 */
export function sublistView(
  data: DataView,
  start: number,
  end: number = data.byteLength,
): Uint8Array {
  if (start < 0 || start > data.byteLength) {
    throw new RangeError(
      `Invalid value: Not in inclusive range 0..${data.byteLength}: ${start}`,
    );
  }
  if (end < start || end > data.byteLength) {
    throw new RangeError(
      `Invalid value: Not in inclusive range ${start}..${data.byteLength}: ${end}`,
    );
  }
  return new Uint8Array(data.buffer, data.byteOffset + start, end - start);
}

/**
 * One fixed-width plaintext field without its zero fill: decoded up to the first NUL, malformed
 * bytes allowed. A field carrying ciphertext uses getRawStringFromData.
 */
export function getStringFromData({
  data,
  start,
  end,
}: {
  data: DataView;
  start: number;
  end?: number;
}): string {
  const list = sublistView(data, start, end);
  const padding = list.indexOf(0);
  return utf8DecodeAllowMalformed(
    padding === -1 ? list : list.subarray(0, padding),
  );
}

/** A fixed-width field byte for byte, padding included (ciphertext, where 0x00 is data). */
export function getRawStringFromData({
  data,
  start,
  end,
}: {
  data: DataView;
  start: number;
  end?: number;
}): string {
  return utf8DecodeAllowMalformed(sublistView(data, start, end));
}

type FieldWrite = {
  dataPacket: DataView;
  start: number;
  end?: number;
  maxNumChar?: number;
  string: string;
};

function writeBytes(
  bytes: Uint8Array,
  { dataPacket, start, end, maxNumChar }: FieldWrite,
): void {
  for (
    let i = 0;
    (end === undefined || start + i < end) &&
    (maxNumChar === undefined || i < maxNumChar) &&
    i < bytes.length;
    i++
  ) {
    dataPacket.setUint8(start + i, bytes[i]);
  }
}

/** Writes the UTF-8 bytes of `string` into the field; anything past `end` or `maxNumChar` is cut. */
export function setDataFromString(field: FieldWrite): Uint8Array {
  const stringCodes = utf8Encode(field.string);
  writeBytes(stringCodes, field);
  return stringCodes;
}

/** As setDataFromString, with the 64 encrypted bytes of `string`. */
export function setEncryptedDataFromString(field: FieldWrite): Uint8Array {
  const stringCodes = Encryption.encryptDataBytes({ data: field.string });
  writeBytes(stringCodes, field);
  return stringCodes;
}
