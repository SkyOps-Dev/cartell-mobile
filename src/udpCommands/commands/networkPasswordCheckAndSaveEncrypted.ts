// Port of frontend/lib/udp_commands/commands/network_password_check_and_save_encrypted.dart: the
// Wi-Fi name and password the pairing flow sends, each AES-encrypted into a 64-byte field, and
// the hub's reply. The reply is a receipt, never a verdict: a hub given a wrong password still
// answers 1.

import {
  AbstractUdpCommand,
  getRawStringFromData,
  setEncryptedDataFromString,
} from './abstractUdpCommand';

export class CheckandSaveEncryptedSSIDandPasswordReply extends AbstractUdpCommand {
  static readonly type = '000B0124';
  static readonly frameLength = 20;

  result = 0;

  private constructor(data?: DataView) {
    super(
      CheckandSaveEncryptedSSIDandPasswordReply.type,
      CheckandSaveEncryptedSSIDandPasswordReply.frameLength,
      data,
    );
  }

  static generate({
    result,
  }: {
    result: number;
  }): CheckandSaveEncryptedSSIDandPasswordReply {
    const command = new CheckandSaveEncryptedSSIDandPasswordReply();
    command.result = result;
    return command.generateFrame();
  }

  static parse(data: DataView): CheckandSaveEncryptedSSIDandPasswordReply {
    return new CheckandSaveEncryptedSSIDandPasswordReply(data).parseFrame();
  }

  parseData() {
    this.result = this.data.getUint32(12, true);
  }

  setData() {
    this.data.setUint32(12, this.result, true);
  }

  get title() {
    return 'Check and Save Encrypted SSID and Password Reply';
  }

  resultStatus(): string {
    switch (this.result) {
      case 0:
        return 'Failure.';
      case 1:
        return 'Success!';
      default:
        return 'Unknown?';
    }
  }

  dataToString() {
    return `Status : ${this.resultStatus()}`;
  }
}

export class CheckandSaveEncryptedSSIDandPassword extends AbstractUdpCommand {
  static readonly type = '000A0123';
  static readonly frameLength = 144;

  ssid = '';
  password = '';

  private constructor(data?: DataView) {
    super(
      CheckandSaveEncryptedSSIDandPassword.type,
      CheckandSaveEncryptedSSIDandPassword.frameLength,
      data,
    );
  }

  /** Throws ArgumentError if either value is longer than 64 UTF-8 bytes. */
  static generate({
    ssid,
    password,
  }: {
    ssid: string;
    password: string;
  }): CheckandSaveEncryptedSSIDandPassword {
    const command = new CheckandSaveEncryptedSSIDandPassword();
    command.ssid = ssid;
    command.password = password;
    return command.generateFrame();
  }

  static parse(data: DataView): CheckandSaveEncryptedSSIDandPassword {
    return new CheckandSaveEncryptedSSIDandPassword(data).parseFrame();
  }

  // Raw, not up to the first NUL: these fields are ciphertext, where 0x00 is data. Only the log
  // reads them.
  parseData() {
    this.ssid = getRawStringFromData({ data: this.data, start: 12, end: 76 });
    this.password = getRawStringFromData({
      data: this.data,
      start: 76,
      end: 140,
    });
  }

  setData() {
    setEncryptedDataFromString({
      dataPacket: this.data,
      start: 12,
      string: this.ssid,
      end: 76,
      maxNumChar: 64,
    });
    setEncryptedDataFromString({
      dataPacket: this.data,
      start: 76,
      string: this.password,
      end: 140,
      maxNumChar: 64,
    });
  }

  get title() {
    return 'Check and Save Encrypted SSID and Password';
  }

  dataToString() {
    return `SSID : ${this.ssid}\n    Password : ${this.password}`;
  }
}
