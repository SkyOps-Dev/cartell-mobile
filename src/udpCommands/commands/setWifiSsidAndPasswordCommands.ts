// Port of frontend/lib/udp_commands/commands/set_wifi_ssid_and_password_commands.dart: saving
// plaintext credentials, and the hub's reply. The pairing flow sends the encrypted message
// instead, but it still accepts this reply as the credential acknowledgement.

import {
  PlaintextCredentialsCommand,
  ResultReplyCommand,
} from './credentialFields';

export class SaveSSIDandPasswordReply extends ResultReplyCommand {
  static readonly type = '000B00CA';
  static readonly frameLength = 20;

  private constructor(data?: DataView) {
    super(
      SaveSSIDandPasswordReply.type,
      SaveSSIDandPasswordReply.frameLength,
      data,
    );
  }

  static generate({ result }: { result: number }): SaveSSIDandPasswordReply {
    const command = new SaveSSIDandPasswordReply();
    command.result = result;
    return command.generateFrame();
  }

  static parse(data: DataView): SaveSSIDandPasswordReply {
    return new SaveSSIDandPasswordReply(data).parseFrame();
  }

  get title() {
    return 'Save SSID and Password Reply';
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
}

export class SaveSSIDandPassword extends PlaintextCredentialsCommand {
  static readonly type = '000A00C9';
  static readonly frameLength = 144;

  private constructor(data?: DataView) {
    super(SaveSSIDandPassword.type, SaveSSIDandPassword.frameLength, data);
  }

  static generate({
    ssid,
    password,
  }: {
    ssid: string;
    password: string;
  }): SaveSSIDandPassword {
    const command = new SaveSSIDandPassword();
    command.ssid = ssid;
    command.password = password;
    return command.generateFrame();
  }

  static parse(data: DataView): SaveSSIDandPassword {
    return new SaveSSIDandPassword(data).parseFrame();
  }

  get title() {
    return 'Save SSID and Password';
  }
}
