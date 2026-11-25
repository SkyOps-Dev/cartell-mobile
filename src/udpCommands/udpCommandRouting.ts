// Port of frontend/lib/udp_commands/upd_command_routing.dart: which parser reads a frame, by its
// type. Also AbstractUdpCommand.get (abstract_udp_command.dart), here as getUdpCommand so the base
// class does not import the messages that extend it. CheckandSaveSSIDandPassword (000A0101) is
// not routed, as in Flutter.

import { AbstractUdpCommand, intToHex } from './commands/abstractUdpCommand';
import {
  GetFWVersion,
  GetFWVersionReply,
} from './commands/firmwareVersionCommands';
import {
  CheckandSaveEncryptedSSIDandPassword,
  CheckandSaveEncryptedSSIDandPasswordReply,
} from './commands/networkPasswordCheckAndSaveEncrypted';
import {
  ResetDevice,
  ScanWifiNetworks,
  ScanWifiNetworksReply,
} from './commands/scanWifiCommands';
import {
  ReadWebsocketUri,
  ReadWebsocketUriReply,
  SaveWebsocketUri,
} from './commands/setWebsocketUriCommands';
import {
  SaveSSIDandPassword,
  SaveSSIDandPasswordReply,
} from './commands/setWifiSsidAndPasswordCommands';
import {
  QueryWifiTestResult,
  QueryWifiTestResultReply,
  TestSSIDandPassword,
} from './commands/wifiTestCommands';

type Parser = {
  readonly type: string;
  parse(data: DataView): AbstractUdpCommand;
};

const routed: Parser[] = [
  GetFWVersion,
  GetFWVersionReply,
  ScanWifiNetworks,
  ScanWifiNetworksReply,
  ResetDevice,
  QueryWifiTestResult,
  QueryWifiTestResultReply,
  SaveSSIDandPassword,
  SaveSSIDandPasswordReply,
  TestSSIDandPassword,
  CheckandSaveEncryptedSSIDandPassword,
  CheckandSaveEncryptedSSIDandPasswordReply,
  SaveWebsocketUri,
  ReadWebsocketUri,
  ReadWebsocketUriReply,
];

export const udpCommands: ReadonlyMap<
  string,
  (data: DataView) => AbstractUdpCommand
> = new Map(routed.map(command => [command.type, command.parse]));

/** AbstractUdpCommand.get: parse a frame with its type's parser, or as a plain message. */
export function getUdpCommand(data: DataView): AbstractUdpCommand {
  const type = intToHex(AbstractUdpCommand.getType(data), 8);
  const parse = udpCommands.get(type);
  return parse === undefined ? AbstractUdpCommand.parse(data) : parse(data);
}
