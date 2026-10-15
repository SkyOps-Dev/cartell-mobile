// Ported from the hub-address tests in frontend/test/udp_commands/udp_connection_test.dart.
// The socket-sending tests there belong to the UDP part and are ported with it.

import { config, skipWifiHandoff } from '../../src/config/environment';
import {
  assertHubAddressIsSendable,
  StateError,
} from '../../src/config/hubAddress';

describe('hub address', () => {
  const original = { ...config };
  afterEach(() => Object.assign(config, original));

  test('defaults address and ports to what real hardware needs', () => {
    // A hub running its setup AP is the gateway of that AP. If these defaults drift, pairing
    // breaks on every real device while every simulator-backed test keeps passing.
    expect(config.hubAddress).toBe('192.168.4.1');
    expect(config.hubPort).toBe(5002);
    // Send and receive use different ports; the app listens on 6452 and sends to 5002.
    expect(config.hubReplyPort).toBe(6452);
    expect(skipWifiHandoff).toBe(false);
  });

  test('refuses to start on an address a socket cannot send to', () => {
    // The shipped default must always pass.
    expect(() => assertHubAddressIsSendable()).not.toThrow();

    // A bad override should fail at launch, not as a generic pairing timeout four screens in.
    config.hubAddress = '192.168.1.50:5002';
    expect(() => assertHubAddressIsSendable()).toThrow(StateError);
  });
});
