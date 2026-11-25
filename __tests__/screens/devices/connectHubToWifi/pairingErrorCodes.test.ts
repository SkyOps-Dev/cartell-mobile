// Ported from frontend/test/screens/devices/connect_hub_to_wifi/pairing_error_codes_test.dart.

import {
  AdvanceVerificationStage,
  describeVerificationTimeout,
  IgnoreVerificationMessage,
  interpretVerificationMessage,
  PairingErrorCodes,
  SucceedVerification,
  UnknownVerificationMessage,
  ValidatingConnectionStep,
} from '../../../../src/screens/devices/connectHubToWifi/pairingErrorCodes';
import {
  GetFWVersionReply,
  ReadWebsocketUriReply,
} from '../../../../src/udpCommands/commands';

const stages = Object.values(ValidatingConnectionStep);

describe('PairingErrorCodes.timeout', () => {
  test('returns 762c844a-1 for stage 1 (GettingFw)', () => {
    expect(
      PairingErrorCodes.timeout({ stage: ValidatingConnectionStep.GettingFw }),
    ).toBe('762c844a-1');
  });

  test('returns 762c844a-2 for stage 2 (GettingWsUrl)', () => {
    expect(
      PairingErrorCodes.timeout({
        stage: ValidatingConnectionStep.GettingWsUrl,
      }),
    ).toBe('762c844a-2');
  });

  test('returns 762c844a-3 for stage 3 (UpdatingWsUrl)', () => {
    expect(
      PairingErrorCodes.timeout({
        stage: ValidatingConnectionStep.UpdatingWsUrl,
      }),
    ).toBe('762c844a-3');
  });
});

describe('PairingErrorCodes constants', () => {
  test('unknownMessage is a recognisable variant of the timeout base', () => {
    expect(PairingErrorCodes.unknownMessage).toBe('762c844a-W');
  });

  test('noReplyAtAll and socketUnavailable', () => {
    expect(PairingErrorCodes.noReplyAtAll).toBe('762c844a-0');
    expect(PairingErrorCodes.socketUnavailable).toBe('762c844a-S');
  });

  test('all stage timeout codes start with the same base', () => {
    for (const stage of stages) {
      expect(PairingErrorCodes.timeout({ stage })).toMatch(/^762c844a-/);
    }
  });

  test('all stage timeout codes are unique', () => {
    const codes = stages.map(stage => PairingErrorCodes.timeout({ stage }));
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('interpretVerificationMessage', () => {
  const baseUrl = 'wss://test.cartellap.com';

  test('unexpected message at stage GettingFw produces UnknownVerificationMessage', () => {
    expect(
      interpretVerificationMessage({
        message: ReadWebsocketUriReply.generate({ uri: 'wss://something' }),
        currentStep: ValidatingConnectionStep.GettingFw,
        isVerified: false,
        shouldCheckWsUrl: false,
        baseUrlWs: baseUrl,
      }),
    ).toBeInstanceOf(UnknownVerificationMessage);
  });

  test('GetFWVersionReply at stage GettingWsUrl is unknown (wrong stage for that reply)', () => {
    expect(
      interpretVerificationMessage({
        message: GetFWVersionReply.generate({ version: 1 }),
        currentStep: ValidatingConnectionStep.GettingWsUrl,
        isVerified: false,
        shouldCheckWsUrl: true,
        baseUrlWs: baseUrl,
      }),
    ).toBeInstanceOf(UnknownVerificationMessage);
  });

  test('when already verified, any message is ignored', () => {
    expect(
      interpretVerificationMessage({
        message: GetFWVersionReply.generate({ version: 1 }),
        currentStep: ValidatingConnectionStep.GettingFw,
        isVerified: true,
        shouldCheckWsUrl: false,
        baseUrlWs: baseUrl,
      }),
    ).toBeInstanceOf(IgnoreVerificationMessage);
  });

  test('stage 1 + GetFWVersionReply + no WsUrl check => succeed', () => {
    const outcome = interpretVerificationMessage({
      message: GetFWVersionReply.generate({ version: 42 }),
      currentStep: ValidatingConnectionStep.GettingFw,
      isVerified: false,
      shouldCheckWsUrl: false,
      baseUrlWs: baseUrl,
    });
    expect(outcome).toBeInstanceOf(SucceedVerification);
    // The only success a release build reaches, so it owes the hub a SaveWebsocketUri.
    expect((outcome as SucceedVerification).writeWebsocketUri).toBe(true);
  });

  test('stage 1 + GetFWVersionReply + WsUrl check => advance to stage 2', () => {
    const outcome = interpretVerificationMessage({
      message: GetFWVersionReply.generate({ version: 42 }),
      currentStep: ValidatingConnectionStep.GettingFw,
      isVerified: false,
      shouldCheckWsUrl: true,
      baseUrlWs: baseUrl,
    });
    expect(outcome).toBeInstanceOf(AdvanceVerificationStage);
    expect((outcome as AdvanceVerificationStage).next).toBe(
      ValidatingConnectionStep.GettingWsUrl,
    );
  });

  test('stage 2 + ReadWebsocketUriReply with matching URI => succeed', () => {
    const outcome = interpretVerificationMessage({
      message: ReadWebsocketUriReply.generate({ uri: `${baseUrl}/some/path` }),
      currentStep: ValidatingConnectionStep.GettingWsUrl,
      isVerified: false,
      shouldCheckWsUrl: true,
      baseUrlWs: baseUrl,
    });
    expect(outcome).toBeInstanceOf(SucceedVerification);
    expect((outcome as SucceedVerification).writeWebsocketUri).toBe(false);
  });

  test('stage 2 + ReadWebsocketUriReply with mismatching URI => advance to stage 3', () => {
    const outcome = interpretVerificationMessage({
      message: ReadWebsocketUriReply.generate({ uri: 'wss://other.example/' }),
      currentStep: ValidatingConnectionStep.GettingWsUrl,
      isVerified: false,
      shouldCheckWsUrl: true,
      baseUrlWs: baseUrl,
    });
    expect(outcome).toBeInstanceOf(AdvanceVerificationStage);
    expect((outcome as AdvanceVerificationStage).next).toBe(
      ValidatingConnectionStep.UpdatingWsUrl,
    );
  });

  test('stage 3 + ReadWebsocketUriReply with matching URI => succeed', () => {
    const outcome = interpretVerificationMessage({
      message: ReadWebsocketUriReply.generate({ uri: `${baseUrl}/x` }),
      currentStep: ValidatingConnectionStep.UpdatingWsUrl,
      isVerified: false,
      shouldCheckWsUrl: true,
      baseUrlWs: baseUrl,
    });
    expect(outcome).toBeInstanceOf(SucceedVerification);
    expect((outcome as SucceedVerification).writeWebsocketUri).toBe(false);
  });

  test('stage 3 + ReadWebsocketUriReply with mismatching URI => ignore (keep retrying)', () => {
    expect(
      interpretVerificationMessage({
        message: ReadWebsocketUriReply.generate({ uri: 'wss://nope.example/' }),
        currentStep: ValidatingConnectionStep.UpdatingWsUrl,
        isVerified: false,
        shouldCheckWsUrl: true,
        baseUrlWs: baseUrl,
      }),
    ).toBeInstanceOf(IgnoreVerificationMessage);
  });

  test('reply URI shorter than baseUrlWs is treated as mismatch, not a crash', () => {
    expect(
      interpretVerificationMessage({
        message: ReadWebsocketUriReply.generate({ uri: 'short' }),
        currentStep: ValidatingConnectionStep.GettingWsUrl,
        isVerified: false,
        shouldCheckWsUrl: true,
        baseUrlWs: baseUrl,
      }),
    ).toBeInstanceOf(AdvanceVerificationStage);
  });
});

describe('describeVerificationTimeout', () => {
  test('zero replies blames the unanswered network prompt, not the hub', () => {
    const failure = describeVerificationTimeout({
      repliesReceived: 0,
      stage: ValidatingConnectionStep.GettingFw,
      approvalLabel: 'Connect',
    });
    expect(failure.code).toBe(PairingErrorCodes.noReplyAtAll);
    expect(failure.message).toBe('Your phone never reached the HUB.');
    expect(failure.message).not.toContain('could not be verified');
    expect(failure.detail).toBe(
      'If your phone asked for permission to join a network, that prompt may still be waiting, ' +
        'or it may have been dismissed. Try again, and tap "Connect" when you see it.',
    );
  });

  test('zero replies names the platform approval word', () => {
    expect(
      describeVerificationTimeout({
        repliesReceived: 0,
        stage: ValidatingConnectionStep.GettingFw,
        approvalLabel: 'Join',
      }).detail,
    ).toContain('tap "Join"');
  });

  test('one reply is enough to stop blaming the prompt', () => {
    const failure = describeVerificationTimeout({
      repliesReceived: 1,
      stage: ValidatingConnectionStep.GettingFw,
      approvalLabel: 'Connect',
    });
    expect(failure.code).toBe(
      PairingErrorCodes.timeout({ stage: ValidatingConnectionStep.GettingFw }),
    );
    expect(failure.message).toBe(
      'The connection to your hub could not be verified. \nPlease try again.',
    );
    expect(failure.detail).toBeNull();
  });

  test('the two failures stay distinguishable in Sentry', () => {
    expect(PairingErrorCodes.noReplyAtAll).not.toBe(
      PairingErrorCodes.timeout({ stage: ValidatingConnectionStep.GettingFw }),
    );
  });
});
