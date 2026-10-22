// Port of the environment part of frontend/lib/utilities/constants.dart (spec 02).
//
// Values come from src/config/env.generated.json, written by `node scripts/use-env.js <env>`.
// A missing key falls back to the same default the Flutter app's String.fromEnvironment uses.

import generated from './env.generated.json';

type EnvFile = Partial<Record<string, string | number | boolean>>;
const env: EnvFile = generated as EnvFile;

function stringValue(key: string, defaultValue: string): string {
  const value = env[key];
  return value === undefined ? defaultValue : String(value);
}

// int.fromEnvironment: a value that is not an integer falls back to the default.
function intValue(key: string, defaultValue: number): number {
  const value = env[key];
  if (value === undefined) {
    return defaultValue;
  }
  const text = String(value).trim();
  return /^[+-]?\d+$/.test(text) ? parseInt(text, 10) : defaultValue;
}

// bool.fromEnvironment: only "true" is true.
function boolValue(key: string, defaultValue: boolean): boolean {
  const value = env[key];
  return value === undefined ? defaultValue : String(value) === 'true';
}

const defaultBaseDomain = stringValue('baseDomain', 'cartellap.com');
// Flutter compares the string: `String.fromEnvironment('shouldUseTLS', defaultValue: 'true') == 'true'`.
const defaultShouldUseTLS = stringValue('shouldUseTLS', 'true') === 'true';
const defaultEnvironmentName = stringValue('envIdentifier', 'UNSET');
const defaultHubAddress = stringValue('hubAddress', '192.168.4.1');
const defaultHubPort = intValue('hubPort', 5002);
const defaultHubReplyPort = intValue('hubReplyPort', 6452);

/** The Sentry DSN. Empty means Sentry is effectively disabled. */
export const sentryPublicId: string = stringValue('sentryPublicKey', '');

/** HMAC key for MAC hashing (spec 17). Differs per environment. Secret. */
export const macAddressHashKey: string = stringValue(
  'macAddressHashKey',
  '???',
);

/** Turns every Wi-Fi call in pairing into a no-op (simulator testing only). */
export const skipWifiHandoff: boolean = boolValue('skipWifiHandoff', false);

// These are the actual values used in the app, and are mutable (the Debug menu changes
// baseDomain, shouldUseTLS and environmentName at runtime).
export const config = {
  baseDomain: defaultBaseDomain,
  shouldUseTLS: defaultShouldUseTLS,
  hubAddress: defaultHubAddress,
  hubPort: defaultHubPort,
  hubReplyPort: defaultHubReplyPort,
};

// environmentName is observable, like Flutter's environmentNameNotifier, so the EnvBanner can
// repaint when the Debug menu switches environment.
let currentEnvironmentName = defaultEnvironmentName;
const environmentNameListeners = new Set<() => void>();

export function getEnvironmentName(): string {
  return currentEnvironmentName;
}

export function setEnvironmentName(value: string): void {
  if (value === currentEnvironmentName) {
    return;
  }
  currentEnvironmentName = value;
  environmentNameListeners.forEach(listener => listener());
}

export function subscribeToEnvironmentName(listener: () => void): () => void {
  environmentNameListeners.add(listener);
  return () => {
    environmentNameListeners.delete(listener);
  };
}

export function baseUrlHttp(): string {
  return config.shouldUseTLS
    ? `https://${config.baseDomain}`
    : `http://${config.baseDomain}`;
}

// Not part of the Flutter port: the Node backend is ported one endpoint at a time, and a call
// site moved to Node uses this instead of baseUrlHttp() (node_backend/CLAUDE.md §1). Node runs
// only on the developer's machine, so this is Django's address whenever the env has no
// nodeBaseDomain (test, beta and live) or the Debug Info panel has switched to another server.
const nodeBaseDomain = stringValue('nodeBaseDomain', '');

export function nodeBaseUrlHttp(): string {
  if (nodeBaseDomain === '' || config.baseDomain !== defaultBaseDomain) {
    return baseUrlHttp();
  }
  return config.shouldUseTLS
    ? `https://${nodeBaseDomain}`
    : `http://${nodeBaseDomain}`;
}

export function baseUrlWs(): string {
  return config.shouldUseTLS
    ? `wss://${config.baseDomain}`
    : `ws://${config.baseDomain}`;
}

// Computed once at startup, as in Flutter, so a runtime switch to LIVE does not change it (Q9).
export const isTestBuild: boolean = currentEnvironmentName !== 'LIVE';
