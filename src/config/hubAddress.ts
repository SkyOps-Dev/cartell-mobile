// Port of hubDestination / assertHubAddressIsSendable from
// frontend/lib/udp_commands/udp_connection.dart (spec 02 §3).

import { config } from './environment';

// InternetAddress.tryParse(...).type == IPv4: four dotted decimal parts, each 0–255.
function isIPv4Literal(address: string): boolean {
  const parts = address.split('.');
  return (
    parts.length === 4 &&
    parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255)
  );
}

/** The hub address if a UDP socket can send to it, otherwise null. */
export function hubDestination(): string | null {
  return isIPv4Literal(config.hubAddress) ? config.hubAddress : null;
}

export class StateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateError';
  }
}

/**
 * Throws if the hub address cannot be sent to. Called at startup so a bad hubAddress fails at
 * launch rather than four screens into pairing. It cannot fire in a shipped build: only an
 * environment override moves the address off the firmware default.
 */
export function assertHubAddressIsSendable(): void {
  if (hubDestination() === null) {
    throw new StateError(
      'hubAddress must be an IPv4 literal such as 192.168.4.1, got ' +
        `'${config.hubAddress}'. The port is configured separately as hubPort, so do not ` +
        'append it, and a hostname will not resolve here.',
    );
  }
}
