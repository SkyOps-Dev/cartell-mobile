// Port of frontend/lib/udp_commands/commands/scan_wifi_commands.dart: asking the hub to list the
// Wi-Fi networks it can see (one reply per network), and Reset (never sent by the app).

import {
  AbstractUdpCommand,
  getStringFromData,
  setDataFromString,
  sublistView,
} from './abstractUdpCommand';

export class ScanWifiNetworks extends AbstractUdpCommand {
  static readonly type = '000A00C4';
  static readonly frameLength = 16;

  private constructor(data?: DataView) {
    super(ScanWifiNetworks.type, ScanWifiNetworks.frameLength, data);
  }

  static generate(): ScanWifiNetworks {
    return new ScanWifiNetworks().generateFrame();
  }

  static parse(data: DataView): ScanWifiNetworks {
    return new ScanWifiNetworks(data).parseFrame();
  }

  get title() {
    return 'Scan Wifi Networks';
  }
}

export class ResetDevice extends AbstractUdpCommand {
  static readonly type = '000A0003';
  static readonly frameLength = 16;

  private constructor(data?: DataView) {
    super(ResetDevice.type, ResetDevice.frameLength, data);
  }

  static generate(): ResetDevice {
    return new ResetDevice().generateFrame();
  }

  static parse(data: DataView): ResetDevice {
    return new ResetDevice(data).parseFrame();
  }

  get title() {
    return 'Reset Hub';
  }
}

type ScanWifiNetworksReplyFields = {
  success: number;
  resultNumber: number;
  totalNumberOfResults: number;
  bssid: ArrayLike<number>;
  ssid: string;
  primaryChannel: number;
  secondaryChannel: number;
  rssi: number;
  otherWifiData: string;
};

export class ScanWifiNetworksReply extends AbstractUdpCommand {
  static readonly type = '000B00C5';
  static readonly frameLength = 108;

  ssid = '';
  otherWifiData = '';
  success = 0;
  resultNumber = 0;
  totalNumberOfResults = 0;
  primaryChannel = 0;
  /**
   * As in Flutter, a view of everything from byte 24 to the end of the frame, not just the six
   * BSSID bytes. generate() ignores the value it is given and leaves those bytes zero.
   */
  bssid: ArrayLike<number> = [];
  secondaryChannel = 0;
  rssi = 0;

  private constructor(data?: DataView) {
    super(ScanWifiNetworksReply.type, ScanWifiNetworksReply.frameLength, data);
  }

  static generate(fields: ScanWifiNetworksReplyFields): ScanWifiNetworksReply {
    const command = new ScanWifiNetworksReply();
    Object.assign(command, fields);
    return command.generateFrame();
  }

  static parse(data: DataView): ScanWifiNetworksReply {
    return new ScanWifiNetworksReply(data).parseFrame();
  }

  parseData() {
    this.success = this.data.getUint32(12, true);
    this.resultNumber = this.data.getUint32(16, true);
    this.totalNumberOfResults = this.data.getUint32(20, true);

    this.bssid = sublistView(this.data, 24);
    this.ssid = getStringFromData({ data: this.data, start: 30, end: 63 });

    this.primaryChannel = this.data.getUint8(63);
    this.secondaryChannel = this.data.getUint32(64, true);

    this.rssi = this.data.getInt8(68);

    this.otherWifiData = getStringFromData({
      data: this.data,
      start: 69,
      end: 104,
    });
  }

  setData() {
    this.data.setUint32(12, this.success, true);
    this.data.setUint32(16, this.resultNumber, true);
    this.data.setUint32(20, this.totalNumberOfResults, true);

    this.bssid = sublistView(this.data, 24);
    setDataFromString({
      string: this.ssid,
      dataPacket: this.data,
      start: 30,
      end: 63,
      maxNumChar: 33,
    });

    this.data.setUint8(63, this.primaryChannel);
    this.data.setUint32(64, this.secondaryChannel, true);

    this.data.setInt8(68, this.rssi);

    setDataFromString({
      string: this.otherWifiData,
      dataPacket: this.data,
      start: 69,
      end: 104,
      maxNumChar: 35,
    });
  }

  get title() {
    return 'Scan Wifi Networks - Reply';
  }

  dataToString() {
    // Dart prints a List<int> as "[1, 2, 3]".
    const bssid = `[${Array.from(this.bssid).join(', ')}]`;
    return [
      `        SSID : ${this.ssid}    Mac Address : ${bssid}`,
      `        Other Wifi Data : ${this.otherWifiData}`,
      `        Success : ${this.success}`,
      `        BSSID : ${bssid}`,
      `        Result number : ${this.resultNumber}`,
      `        Total number : ${this.totalNumberOfResults}`,
      `        RSSI (Strength of Signal) : ${this.rssi}`,
      `        Primary Channel : ${this.primaryChannel}`,
      `        Secondary Channel : ${this.secondaryChannel}`,
      '    ',
    ].join('\n');
  }
}
