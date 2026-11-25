// Port of frontend/lib/udp_commands/commands/wifi_test_commands.dart: the hub's own credential
// test handshake. The app has these messages but has never sent them.

import { AbstractUdpCommand } from './abstractUdpCommand';
import {
  PlaintextCredentialsCommand,
  ResultReplyCommand,
} from './credentialFields';

export class QueryWifiTestResult extends AbstractUdpCommand {
  // 0x000A00C7 per the vendor spec; Flutter once had the reply's type here.
  static readonly type = '000A00C7';
  static readonly frameLength = 16;

  private constructor(data?: DataView) {
    super(QueryWifiTestResult.type, QueryWifiTestResult.frameLength, data);
  }

  static generate(): QueryWifiTestResult {
    return new QueryWifiTestResult().generateFrame();
  }

  static parse(data: DataView): QueryWifiTestResult {
    return new QueryWifiTestResult(data).parseFrame();
  }

  get title() {
    return 'Query Wifi Test Result';
  }
}

export class QueryWifiTestResultReply extends ResultReplyCommand {
  static readonly type = '000B00C8';
  static readonly frameLength = 20;

  private constructor(data?: DataView) {
    super(
      QueryWifiTestResultReply.type,
      QueryWifiTestResultReply.frameLength,
      data,
    );
  }

  static generate({ result }: { result: number }): QueryWifiTestResultReply {
    const command = new QueryWifiTestResultReply();
    command.result = result;
    return command.generateFrame();
  }

  static parse(data: DataView): QueryWifiTestResultReply {
    return new QueryWifiTestResultReply(data).parseFrame();
  }

  get title() {
    return 'Query Wifi Test Result - Reply';
  }

  resultStatus(): string {
    switch (this.result) {
      case 0:
        return 'Not started.';
      case 1:
        return 'In progress...';
      case 2:
        return 'Success!';
      case 3:
        return 'Failed.';
      default:
        return 'Unknown?';
    }
  }
}

export class TestSSIDandPassword extends PlaintextCredentialsCommand {
  static readonly type = '000A00C6';
  static readonly frameLength = 144;

  private constructor(data?: DataView) {
    super(TestSSIDandPassword.type, TestSSIDandPassword.frameLength, data);
  }

  static generate({
    ssid,
    password,
  }: {
    ssid: string;
    password: string;
  }): TestSSIDandPassword {
    const command = new TestSSIDandPassword();
    command.ssid = ssid;
    command.password = password;
    return command.generateFrame();
  }

  static parse(data: DataView): TestSSIDandPassword {
    return new TestSSIDandPassword(data).parseFrame();
  }

  get title() {
    return 'Test Wifi';
  }
}
