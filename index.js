/**
 * @format
 */

// Startup, in the order of frontend/lib/main.dart (spec 02 §3).
// LATER(part 2): SentryFlutter.init, before registerServices.
// LATER(part 14): initFirebase(), after registerServices.

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import {
  config,
  getEnvironmentName,
  sentryPublicId,
} from './src/config/environment';
import { assertHubAddressIsSendable } from './src/config/hubAddress';
import { registerServices } from './src/services/startServices';

console.log(`Environment Name: ${getEnvironmentName()}`);
console.log(`Domain: ${config.baseDomain}`);
console.log(`Should use TLS? : ${config.shouldUseTLS}`);
console.log(`Is Sentry set up? : ${sentryPublicId !== ''}`);
console.log(
  `Hub: ${config.hubAddress}:${config.hubPort}, replies on ${config.hubReplyPort}`,
);

// Refuse to start on a hub address a socket cannot send to.
assertHubAddressIsSendable();

registerServices();

AppRegistry.registerComponent(appName, () => App);
