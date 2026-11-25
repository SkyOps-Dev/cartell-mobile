// Port of frontend/lib/screens/devices/connect_hub_to_wifi/utilities.dart: the Wi-Fi strength
// icon, the reconnect loop's server probe, the loop itself, and the one-question check of the hub
// on its own network.

import { Icons } from '../../../components/icons/iconData';
import type { IconData } from '../../../components/icons/iconData';
import { baseUrlHttp } from '../../../config/environment';
import {
  AbstractUdpCommand,
  GetFWVersion,
  GetFWVersionReply,
} from '../../../udpCommands/commands';
import { Observer, UDPConnection } from '../../../udpCommands/udpConnection';
import {
  classifyProbeFailure,
  HubCheckUnavailableReason,
} from './hubRegistrationCheck';
import {
  decideReconnectStep,
  KeepTrying,
  kReconnectWindow,
  ReconnectOutcome,
  ServerReachabilityCheck,
  ServerReachable,
  ServerUnreachable,
  SettleReconnected,
  SettleReconnectFailed,
} from './serverReachability';
import { futureDelayed, futureTimeout } from '../../../utilities/dartAsync';

/** The Wi-Fi glyph for a signal level (dBm): full from −60, two bars from −80, else one. */
export function rssiIcon(level: number): IconData {
  if (level >= -60) {
    return Icons.wifi;
  }
  if (level >= -80) {
    return Icons.wifi_2_bar;
  }
  return Icons.wifi_1_bar;
}

const probeTimeoutMs = 15_000;

/**
 * One GET of Django's /test/, straight to the server (no session, no maintenance check): any
 * answer means the phone is back on a network that reaches it. 15 s, then `network`.
 */
export async function probeServerReachable(): Promise<ServerReachabilityCheck> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, probeTimeoutMs);
  try {
    const response = await fetch(`${baseUrlHttp()}/test/`, {
      signal: controller.signal as RequestInit['signal'],
    });
    // package:http's get reads the whole body before answering.
    await response.text();
    return new ServerReachable();
  } catch (error) {
    if (timedOut) {
      return new ServerUnreachable(HubCheckUnavailableReason.network);
    }
    return new ServerUnreachable(classifyProbeFailure(error));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Probes until the server answers or `windowMs` closes, and says which. `isCancelled` is checked
 * before every probe and every sleep, so leaving the screen ends it. I/O is injected for tests.
 * (Flutter keeps one http Client for the window; fetch pools its connections itself.)
 */
export async function awaitServerReachable({
  probe = probeServerReachable,
  sleep = futureDelayed,
  elapsedMs,
  isCancelled = () => false,
  windowMs = kReconnectWindow,
}: {
  probe?: () => Promise<ServerReachabilityCheck>;
  sleep?: (ms: number) => Promise<void>;
  elapsedMs?: () => number;
  isCancelled?: () => boolean;
  windowMs?: number;
} = {}): Promise<ReconnectOutcome> {
  const startedAt = Date.now();
  const since = elapsedMs ?? (() => Date.now() - startedAt);
  let completedAttempts = 0;
  while (!isCancelled()) {
    const last = await probe();
    completedAttempts += 1;
    const decision = decideReconnectStep({
      last,
      completedAttempts,
      elapsedMs: since(),
      windowMs,
    });
    if (decision instanceof SettleReconnected) {
      return ReconnectOutcome.reachable;
    }
    if (decision instanceof SettleReconnectFailed) {
      return ReconnectOutcome.windowClosed;
    }
    if (isCancelled()) {
      return ReconnectOutcome.cancelled;
    }
    await sleep((decision as KeepTrying).delayMs);
  }
  return ReconnectOutcome.cancelled;
}

/**
 * Sends one GetFWVersion and settles when the hub's version reply arrives (any other message does
 * not count: a second hub nearby could send one). Rejects with dart:async's TimeoutException
 * after `timeoutMs`, or with the send's error. The listener comes off the socket either way.
 */
export function askHubForFirmwareVersion(
  socket: UDPConnection,
  { timeoutMs }: { timeoutMs: number },
): Promise<void> {
  let answer: () => void = () => undefined;
  const answered = new Promise<void>(resolve => {
    answer = resolve;
  });
  let isCompleted = false;
  const listener: Observer<AbstractUdpCommand> = {
    receive(message) {
      if (message instanceof GetFWVersionReply && !isCompleted) {
        isCompleted = true;
        answer();
      }
    },
  };
  socket.addListener(listener);
  // dart:io throws a failed send at once; here it arrives as a rejection, which ends the wait.
  const sent = socket.send(GetFWVersion.generate());
  return futureTimeout(
    Promise.race([answered, sent.then(() => answered)]),
    timeoutMs,
  ).finally(() => {
    socket.removeListener(listener);
  });
}
