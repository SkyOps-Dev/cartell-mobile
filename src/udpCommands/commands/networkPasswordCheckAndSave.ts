// Port of frontend/lib/udp_commands/commands/network_password_check_and_save.dart: the plaintext
// form of the credential message. Never sent, and not in the type routing (as in Flutter), so a
// frame of this type parses as a plain AbstractUdpCommand.

import { PlaintextCredentialsCommand } from './credentialFields';

export class CheckandSaveSSIDandPassword extends PlaintextCredentialsCommand {
  static readonly type = '000A0101';
  static readonly frameLength = 144;

  private constructor(data?: DataView) {
    super(
      CheckandSaveSSIDandPassword.type,
      CheckandSaveSSIDandPassword.frameLength,
      data,
    );
  }

  static generate({
    ssid,
    password,
  }: {
    ssid: string;
    password: string;
  }): CheckandSaveSSIDandPassword {
    const command = new CheckandSaveSSIDandPassword();
    command.ssid = ssid;
    command.password = password;
    return command.generateFrame();
  }

  static parse(data: DataView): CheckandSaveSSIDandPassword {
    return new CheckandSaveSSIDandPassword(data).parseFrame();
  }

  get title() {
    return 'Check and Save SSID and Password';
  }
}
