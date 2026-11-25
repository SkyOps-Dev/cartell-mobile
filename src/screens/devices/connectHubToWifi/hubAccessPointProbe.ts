// Port of frontend/lib/screens/devices/connect_hub_to_wifi/hub_access_point_probe.dart: one trip
// back to the hub's own network to ask whether it is still there.
//
// A hub that rejects the Wi-Fi details cannot say so: its acknowledgement is a receipt, and on
// failure it goes back to being an access point. Measured on a real hub (firmware 1025,
// 2026-09-01): with a wrong password it answers there again from 10 s; with the right one it never
// does and stops broadcasting. So an answer proves the details failed; silence is weaker (an
// unplugged hub is silent too), which is why that outcome only adds the light readings.

import {
  AsyncTimeoutException,
  futureTimeout,
} from '../../../utilities/dartAsync';

export abstract class AccessPointProbeResult {}

/** The hub answered on 192.168.4.1: it went back to its own network, so the details failed. */
export class HubBackInAccessPointMode extends AccessPointProbeResult {}

/** Nothing answered: most likely on the user's network, but possibly unplugged or out of range. */
export class HubNotOnAccessPoint extends AccessPointProbeResult {}

/** The probe itself failed (a platform call threw, the socket would not open): says nothing. */
export class ProbeInconclusive extends AccessPointProbeResult {
  constructor(readonly reason: unknown) {
    super();
  }
}

/** How long to wait for the hub's answer once the socket is open. */
export const kAccessPointProbeTimeout = 8_000;

/**
 * How long the Wi-Fi clean-up may take before the answer goes on without it. On 2026-09-01 the
 * plugin's disconnect never completed, and the screen sat for minutes with the answer in hand.
 */
export const kAccessPointProbeCleanupTimeout = 10_000;

/**
 * One probe, every piece of I/O injected. `join` and `leave` are the Wi-Fi hop; `ask` sends the
 * version request and settles when a reply arrives (or never). The phone always leaves the hub's
 * network afterwards, whatever happened.
 */
export async function probeHubAccessPoint({
  join,
  leave,
  ask,
  timeoutMs = kAccessPointProbeTimeout,
  cleanupTimeoutMs = kAccessPointProbeCleanupTimeout,
}: {
  join: () => Promise<void>;
  leave: () => Promise<void>;
  ask: () => Promise<void>;
  timeoutMs?: number;
  cleanupTimeoutMs?: number;
}): Promise<AccessPointProbeResult> {
  try {
    await join();
    await futureTimeout(ask(), timeoutMs);
    return new HubBackInAccessPointMode();
  } catch (error) {
    if (error instanceof AsyncTimeoutException) {
      return new HubNotOnAccessPoint();
    }
    return new ProbeInconclusive(error);
  } finally {
    try {
      await futureTimeout(leave(), cleanupTimeoutMs);
    } catch {
      // Already leaving, or too slow to say so: never replaces the answer.
    }
  }
}
