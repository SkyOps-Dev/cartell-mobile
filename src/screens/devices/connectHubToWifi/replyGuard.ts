// Port of frontend/lib/screens/devices/connect_hub_to_wifi/reply_guard.dart.

import {
  AbstractUdpCommand,
  CheckandSaveEncryptedSSIDandPasswordReply,
  SaveSSIDandPasswordReply,
} from '../../../udpCommands/commands';

/**
 * Whether this reply moves pairing on to the server-confirmation stage. The credentials go out
 * every 4 s for up to 16 s, so several replies can come back; only the first credential-save
 * reply counts.
 */
export function shouldAdvanceOnReply({
  alreadyAdvanced,
  message,
}: {
  alreadyAdvanced: boolean;
  message: AbstractUdpCommand;
}): boolean {
  if (alreadyAdvanced) {
    return false;
  }
  return (
    message instanceof SaveSSIDandPasswordReply ||
    message instanceof CheckandSaveEncryptedSSIDandPasswordReply
  );
}
