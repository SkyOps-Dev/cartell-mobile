// Port of frontend/lib/udp_commands/commands/firmware_version_commands.dart: the hub's firmware
// version, asked for while verifying the connection and by the one-time hub check.

import { AbstractUdpCommand } from './abstractUdpCommand';

export class GetFWVersion extends AbstractUdpCommand {
  static readonly type = '000A0001';
  static readonly frameLength = 16;

  private constructor(data?: DataView) {
    super(GetFWVersion.type, GetFWVersion.frameLength, data);
  }

  static generate(): GetFWVersion {
    return new GetFWVersion().generateFrame();
  }

  static parse(data: DataView): GetFWVersion {
    return new GetFWVersion(data).parseFrame();
  }

  get title() {
    return 'Get Firmware Version';
  }
}

export class GetFWVersionReply extends AbstractUdpCommand {
  static readonly type = '000B0002';
  static readonly frameLength = 20;

  version = 0;

  private constructor(data?: DataView) {
    super(GetFWVersionReply.type, GetFWVersionReply.frameLength, data);
  }

  static generate({ version }: { version: number }): GetFWVersionReply {
    const command = new GetFWVersionReply();
    command.version = version;
    return command.generateFrame();
  }

  static parse(data: DataView): GetFWVersionReply {
    return new GetFWVersionReply(data).parseFrame();
  }

  parseData() {
    this.version = this.data.getUint32(12, true);
  }

  setData() {
    this.data.setUint32(12, this.version, true);
  }

  get title() {
    return 'Get Firmware Version - Reply';
  }

  dataToString() {
    return `Version : ${this.version}`;
  }
}
