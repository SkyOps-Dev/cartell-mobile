// Port of frontend/lib/screens/devices/connect_hub_to_wifi/connection_constants.dart: the hub's
// own network and the pairing flow's timings.

import { Platform } from 'react-native';

/** The hub's access point is "Cartell Hub <MAC>". */
export const hubSsidPrefix = 'Cartell Hub ';
export const hubWifiPassword = 'family12';

/**
 * The word on the system's button that approves joining the hub's network: Android's
 * WifiNetworkSpecifier picker says Connect, iOS's hotspot alert says Join. Shown only on a phone
 * that has not approved this hub before.
 */
export function joinApprovalLabelFor({ isIOS }: { isIOS: boolean }): string {
  return isIOS ? 'Join' : 'Connect';
}

/** joinApprovalLabelFor for the platform this build runs on. */
export function joinApprovalLabel(): string {
  return joinApprovalLabelFor({ isIOS: Platform.OS === 'ios' });
}

// Begin pairing (seconds).
export const beginPairingWaitTime = 15;

// Validating the connection (FinishedConnectingEvent).
export const validationMessagesPerSecond = 2;
export const validationTimeoutSeconds = 40;
export const totalValidationMessages =
  validationMessagesPerSecond * validationTimeoutSeconds;

// Sending the Wi-Fi credentials to the hub (ConnectHubToWifiEvent), in milliseconds.
export const credentialSendTimeout = 16_000;
export const credentialSendInterval = 4_000;
