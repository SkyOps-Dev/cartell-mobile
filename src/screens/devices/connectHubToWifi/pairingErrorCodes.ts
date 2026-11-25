// Port of frontend/lib/screens/devices/connect_hub_to_wifi/pairing_error_codes.dart: what each
// reply means while the hub connection is being verified, what a verification timeout says, and
// the pairing flow's error codes. All pure.
//
// ValidatingConnectionStep is declared here (Flutter declares it in hub_connection_events.dart),
// so the events and these decisions do not import each other.

import {
  AbstractUdpCommand,
  GetFWVersionReply,
  ReadWebsocketUriReply,
} from '../../../udpCommands/commands';
import {
  ConnectedToHubState,
  ConnectingToHubState,
  HubConnectingToWifiState,
  HubConnectionState,
  ReestablishConnectionToServerState,
  SelectedNetworkState,
  VerifyingHubConnectionState,
} from './states';

/** The verification's three stages, in order; release builds only ever run the first. */
export enum ValidatingConnectionStep {
  GettingFw = 'GettingFw',
  GettingWsUrl = 'GettingWsUrl',
  UpdatingWsUrl = 'UpdatingWsUrl',
}

const stageOrder = [
  ValidatingConnectionStep.GettingFw,
  ValidatingConnectionStep.GettingWsUrl,
  ValidatingConnectionStep.UpdatingWsUrl,
];

export abstract class VerificationOutcome {}

/** Ignore it (verification already succeeded, or stage 3's read-back does not match yet). */
export class IgnoreVerificationMessage extends VerificationOutcome {}

export class SucceedVerification extends VerificationOutcome {
  /**
   * Whether the hub is still owed a SaveWebsocketUri: true for the stage-1 success, the only one a
   * release build reaches, since it skips the two stages that would write it.
   */
  constructor(readonly writeWebsocketUri = false) {
    super();
  }
}

export class AdvanceVerificationStage extends VerificationOutcome {
  constructor(readonly next: ValidatingConnectionStep) {
    super();
  }
}

/** A reply not expected at this stage: the loop stops with its own code. */
export class UnknownVerificationMessage extends VerificationOutcome {}

export function interpretVerificationMessage({
  message,
  currentStep,
  isVerified,
  shouldCheckWsUrl,
  baseUrlWs,
}: {
  message: AbstractUdpCommand;
  currentStep: ValidatingConnectionStep;
  isVerified: boolean;
  shouldCheckWsUrl: boolean;
  baseUrlWs: string;
}): VerificationOutcome {
  if (isVerified) {
    return new IgnoreVerificationMessage();
  }

  if (
    message instanceof GetFWVersionReply &&
    currentStep === ValidatingConnectionStep.GettingFw
  ) {
    if (shouldCheckWsUrl) {
      return new AdvanceVerificationStage(
        ValidatingConnectionStep.GettingWsUrl,
      );
    }
    return new SucceedVerification(true);
  }

  if (
    message instanceof ReadWebsocketUriReply &&
    currentStep === ValidatingConnectionStep.GettingWsUrl
  ) {
    if (uriMatches(message.uri, baseUrlWs)) {
      return new SucceedVerification();
    }
    return new AdvanceVerificationStage(ValidatingConnectionStep.UpdatingWsUrl);
  }

  if (
    message instanceof ReadWebsocketUriReply &&
    currentStep === ValidatingConnectionStep.UpdatingWsUrl
  ) {
    if (uriMatches(message.uri, baseUrlWs)) {
      return new SucceedVerification();
    }
    return new IgnoreVerificationMessage();
  }

  return new UnknownVerificationMessage();
}

/** The hub's URI starts with the server's (a shorter one is a mismatch, not a crash). */
function uriMatches(reportedUri: string, expected: string): boolean {
  if (reportedUri.length < expected.length) {
    return false;
  }
  return reportedUri.substring(0, expected.length) === expected;
}

/** What the failure screen says when verification runs out of time. */
export type VerificationTimeout = {
  code: string;
  /** The headline: one short sentence. */
  message: string;
  /** The explanation under it, at body size. */
  detail: string | null;
};

export function describeVerificationTimeout({
  repliesReceived,
  stage,
  approvalLabel,
}: {
  repliesReceived: number;
  stage: ValidatingConnectionStep;
  approvalLabel: string;
}): VerificationTimeout {
  if (repliesReceived === 0) {
    return {
      code: PairingErrorCodes.noReplyAtAll,
      message: 'Your phone never reached the HUB.',
      detail:
        'If your phone asked for permission to join a network, that prompt ' +
        'may still be waiting, or it may have been dismissed. Try again, and ' +
        `tap "${approvalLabel}" when you see it.`,
    };
  }
  return {
    code: PairingErrorCodes.timeout({ stage }),
    message:
      'The connection to your hub could not be verified. \nPlease try again.',
    detail: null,
  };
}

const verificationBase = '762c844a';

/** The UDP verification stage's codes. */
export const PairingErrorCodes = {
  /** Verification timed out at `stage` (762c844a-1, -2 or -3). */
  timeout({ stage }: { stage: ValidatingConnectionStep }): string {
    return `${verificationBase}-${stageOrder.indexOf(stage) + 1}`;
  },
  /** The whole budget went by without one reply: the phone very likely never reached the hub. */
  noReplyAtAll: `${verificationBase}-0`,
  /** An unexpected UDP message arrived during verification. */
  unknownMessage: `${verificationBase}-W`,
  /** The UDP socket could not be opened, so nothing was ever sent. */
  socketUnavailable: `${verificationBase}-S`,
} as const;

const registrationBase = 'e5b1907d';

/** The server-confirmation stage's codes, on a base of their own. */
export const HubRegistrationErrorCodes = {
  /** The user stopped waiting. Not a proven failure. */
  cancelledWhileWaiting: `${registrationBase}-C`,
  /** The poll settled because the session died. */
  sessionExpired: `${registrationBase}-A`,
  /** The hub answered on its own network, so the details failed. */
  hubRevertedToAccessPoint: `${registrationBase}-P`,

  /** Where the user was when they abandoned pairing. */
  cancelledAt(state: HubConnectionState): string {
    if (state instanceof ConnectingToHubState) {
      return `${registrationBase}-J`;
    }
    if (state instanceof VerifyingHubConnectionState) {
      return `${registrationBase}-V`;
    }
    if (state instanceof ConnectedToHubState) {
      return `${registrationBase}-N`;
    }
    if (state instanceof SelectedNetworkState) {
      return `${registrationBase}-K`;
    }
    if (state instanceof HubConnectingToWifiState) {
      return `${registrationBase}-S`;
    }
    if (state instanceof ReestablishConnectionToServerState) {
      return `${registrationBase}-R`;
    }
    return HubRegistrationErrorCodes.cancelledWhileWaiting;
  },
};
