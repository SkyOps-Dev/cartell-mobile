// Shared by the ports of set_wifi_ssid_and_password_commands.dart, wifi_test_commands.dart and
// network_password_check_and_save.dart, which repeat the same two layouts in Flutter: a 144-byte
// message with the plaintext SSID at 12–75 and password at 76–139, and a 20-byte reply whose
// uint32 result sits at 12. None of these messages is sent by the pairing flow.

import {
  AbstractUdpCommand,
  getStringFromData,
  setDataFromString,
} from './abstractUdpCommand';

export abstract class PlaintextCredentialsCommand extends AbstractUdpCommand {
  ssid = '';
  password = '';

  parseData() {
    this.ssid = getStringFromData({ data: this.data, start: 12, end: 76 });
    this.password = getStringFromData({
      data: this.data,
      start: 76,
      end: 140,
    });
  }

  setData() {
    setDataFromString({
      dataPacket: this.data,
      start: 12,
      string: this.ssid,
      end: 76,
      maxNumChar: 64,
    });
    setDataFromString({
      dataPacket: this.data,
      start: 76,
      string: this.password,
      end: 140,
      maxNumChar: 64,
    });
  }

  dataToString() {
    return `SSID : ${this.ssid}\n    Password : ${this.password}`;
  }
}

export abstract class ResultReplyCommand extends AbstractUdpCommand {
  result = 0;

  parseData() {
    this.result = this.data.getUint32(12, true);
  }

  setData() {
    this.data.setUint32(12, this.result, true);
  }

  abstract resultStatus(): string;

  dataToString() {
    return `Status : ${this.resultStatus()}`;
  }
}
