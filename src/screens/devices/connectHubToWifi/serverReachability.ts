// Port of frontend/lib/screens/devices/connect_hub_to_wifi/server_reachability.dart: after an
// error, whether the phone is back on a network that reaches the server. Pure decisions; the loop
// that uses them is awaitServerReachable (utilities.ts).
//
// It runs right after the hub's network is dropped, while the phone may still be reconnecting, so
// no failure ends it early: only 90 s without one answer does.

import { HubCheckUnavailableReason } from './hubRegistrationCheck';

export abstract class ServerReachabilityCheck {}

/** The server answered, with any status at all (a 500 or maintenance answers the question too). */
export class ServerReachable extends ServerReachabilityCheck {}

/** Nothing came back, and why. Never a definite no on its own. */
export class ServerUnreachable extends ServerReachabilityCheck {
  constructor(readonly reason: HubCheckUnavailableReason) {
    super();
  }
}

export abstract class ReconnectDecision {}

export class SettleReconnected extends ReconnectDecision {}

/** The window closed without one answer: the only way to "could not reconnect". */
export class SettleReconnectFailed extends ReconnectDecision {}

export class KeepTrying extends ReconnectDecision {
  constructor(readonly delayMs: number) {
    super();
  }
}

/** How long the loop keeps trying before calling the reconnect failed. */
export const kReconnectWindow = 90_000;

/** 1 s after attempts 1–3, 2 s after 4–6, then 5 s. */
export function reconnectBackoffAfter(completedAttempts: number): number {
  if (completedAttempts <= 3) {
    return 1_000;
  }
  if (completedAttempts <= 6) {
    return 2_000;
  }
  return 5_000;
}

export function decideReconnectStep({
  last,
  completedAttempts,
  elapsedMs,
  windowMs = kReconnectWindow,
}: {
  last: ServerReachabilityCheck;
  completedAttempts: number;
  elapsedMs: number;
  windowMs?: number;
}): ReconnectDecision {
  if (last instanceof ServerReachable) {
    return new SettleReconnected();
  }
  if (elapsedMs >= windowMs) {
    return new SettleReconnectFailed();
  }
  return new KeepTrying(reconnectBackoffAfter(completedAttempts));
}

/** Why awaitServerReachable stopped. */
export enum ReconnectOutcome {
  /** The server answered. */
  reachable = 'reachable',
  /** The window closed without one answer. */
  windowClosed = 'windowClosed',
  /** The caller asked it to stop (the flow closed, a teardown took over, the user cancelled). */
  cancelled = 'cancelled',
}
