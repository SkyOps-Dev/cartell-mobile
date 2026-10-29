/**
 * @format
 */

// Startup, in the order of frontend/lib/main.dart (spec 02 §3).
// PORT-GAP: SentryFlutter.init, before registerServices.
// PORT-GAP: initFirebase(), after registerServices.

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import {
  config,
  getEnvironmentName,
  nodeBaseUrlHttp,
} from './src/config/environment';
import { assertHubAddressIsSendable } from './src/config/hubAddress';
import { registerServices } from './src/services/startServices';

console.log(`Environment Name: ${getEnvironmentName()}`);
// Not Flutter's line ("Domain: <baseDomain>"): the developer chose to log the server the ported
// calls use (2026-10-27).
console.log(`Node domain: ${nodeBaseUrlHttp().replace(/^https?:\/\//, '')}`);
console.log(`Should use TLS? : ${config.shouldUseTLS}`);
// PORT-GAP: log `sentryPublicId !== ''` again, as Flutter does, once Sentry starts here.
console.log('Is Sentry set up? : false');
console.log(
  `Hub: ${config.hubAddress}:${config.hubPort}, replies on ${config.hubReplyPort}`,
);

// Refuse to start on a hub address a socket cannot send to.
assertHubAddressIsSendable();

registerServices();

AppRegistry.registerComponent(appName, () => App);
