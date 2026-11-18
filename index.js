/**
 * @format
 */

// Startup, in the order of frontend/lib/main.dart (spec 02 §3).
// PORT-GAP: SentryFlutter.init, before registerServices.

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
import { initFirebase } from './src/utilities/notifications';

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

initFirebase();

// registerServices() (main.dart runs it before runApp) starts when the app's screen does, not here:
// with the app closed, a push makes @react-native-firebase run this file in the background just for
// its message handler, and Flutter's background handler runs without main(), so the 15 s session
// check must not start then. React Native asks for the root component only when it runs the app
// with a screen (AppRegistryImpl registerComponent), possibly again if the screen is recreated, so
// it runs once per process, as main() does. The first screen still comes after it, and the first
// check 15 s later, so nothing visible moves. (Decided with the developer, 2026-11-18.)
let servicesRegistered = false;
AppRegistry.registerComponent(appName, () => {
  if (!servicesRegistered) {
    servicesRegistered = true;
    registerServices();
  }
  return App;
});
