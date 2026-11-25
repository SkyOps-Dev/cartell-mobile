// Port of frontend/lib/udp_commands/commands/set_websocket_uri_commands.dart: the address of the
// server the hub dials (128 bytes). Release builds write it once verification succeeds; reading it
// back only happens in Flutter's debug builds, which RN does not copy.

import {
  AbstractUdpCommand,
  getStringFromData,
  setDataFromString,
} from './abstractUdpCommand';
import { baseUrlWs } from '../../config/environment';

export class ReadWebsocketUri extends AbstractUdpCommand {
  static readonly type = '000A00E0';
  static readonly frameLength = 16;

  private constructor(data?: DataView) {
    super(ReadWebsocketUri.type, ReadWebsocketUri.frameLength, data);
  }

  static generate(): ReadWebsocketUri {
    return new ReadWebsocketUri().generateFrame();
  }

  static parse(data: DataView): ReadWebsocketUri {
    return new ReadWebsocketUri(data).parseFrame();
  }

  get title() {
    return 'Read Websocket URI';
  }
}

export class ReadWebsocketUriReply extends AbstractUdpCommand {
  static readonly type = '000B00E1';
  static readonly frameLength = 144;

  uri = '';

  private constructor(data?: DataView) {
    super(ReadWebsocketUriReply.type, ReadWebsocketUriReply.frameLength, data);
  }

  static generate({ uri }: { uri: string }): ReadWebsocketUriReply {
    const command = new ReadWebsocketUriReply();
    command.uri = uri;
    return command.generateFrame();
  }

  static parse(data: DataView): ReadWebsocketUriReply {
    return new ReadWebsocketUriReply(data).parseFrame();
  }

  parseData() {
    this.uri = getStringFromData({ data: this.data, start: 12, end: 140 });
  }

  setData() {
    setDataFromString({
      dataPacket: this.data,
      start: 12,
      string: this.uri,
      end: 140,
      maxNumChar: 128,
    });
  }

  get title() {
    return 'Read Websocket URI Reply';
  }

  dataToString() {
    return `WS URI : ${this.uri}`;
  }
}

export class SaveWebsocketUri extends AbstractUdpCommand {
  static readonly type = '000A00E2';
  static readonly frameLength = 144;

  uri = '';

  private constructor(data?: DataView) {
    super(SaveWebsocketUri.type, SaveWebsocketUri.frameLength, data);
  }

  /** With no `uri`, the server this build talks to: "<baseUrlWs>/hub/". */
  static generate({ uri }: { uri?: string } = {}): SaveWebsocketUri {
    const command = new SaveWebsocketUri();
    command.uri = uri ?? `${baseUrlWs()}/hub/`;
    return command.generateFrame();
  }

  static parse(data: DataView): SaveWebsocketUri {
    return new SaveWebsocketUri(data).parseFrame();
  }

  parseData() {
    this.uri = getStringFromData({ data: this.data, start: 12, end: 140 });
  }

  setData() {
    setDataFromString({
      dataPacket: this.data,
      start: 12,
      string: this.uri,
      end: 140,
      maxNumChar: 128,
    });
  }

  get title() {
    return 'Save Websocket Uri';
  }

  dataToString() {
    return `WS URI : ${this.uri}`;
  }
}
