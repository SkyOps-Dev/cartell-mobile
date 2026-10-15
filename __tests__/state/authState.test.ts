// Ported from frontend/test/bloc/auth/auth_state_test.dart

import {
  IsInMaintenanceMode,
  IsOnLoginScreenState,
  IsShowingPopUpMessage,
  IsOnRegistrationScreenState,
} from '../../src/state/auth/authBloc';
import { statesEqual } from '../../src/state/genericBloc';

describe('IsOnLoginScreenState equality', () => {
  test('states differing in error flags are NOT equal', () => {
    expect(
      statesEqual(
        new IsOnLoginScreenState({ emailError: true }),
        new IsOnLoginScreenState({ emailError: false }),
      ),
    ).toBe(false);
  });

  test('states differing in temporaryEmail are NOT equal', () => {
    expect(
      statesEqual(
        new IsOnLoginScreenState({ temporaryEmail: 'a@b.com' }),
        new IsOnLoginScreenState({ temporaryEmail: 'c@d.com' }),
      ),
    ).toBe(false);
  });

  test('states with identical fields ARE equal', () => {
    expect(
      statesEqual(
        new IsOnLoginScreenState({
          temporaryEmail: 'a@b.com',
          emailError: true,
        }),
        new IsOnLoginScreenState({
          temporaryEmail: 'a@b.com',
          emailError: true,
        }),
      ),
    ).toBe(true);
  });
});

describe('IsOnRegistrationScreenState equality', () => {
  test('states differing in a field are NOT equal', () => {
    expect(
      statesEqual(
        new IsOnRegistrationScreenState({ email: 'a@b.com' }),
        new IsOnRegistrationScreenState({ email: 'c@d.com' }),
      ),
    ).toBe(false);
  });
});

describe('IsShowingPopUpMessage equality', () => {
  test('states differing in message are NOT equal', () => {
    expect(
      statesEqual(
        new IsShowingPopUpMessage('T', 'one'),
        new IsShowingPopUpMessage('T', 'two'),
      ),
    ).toBe(false);
  });
});

describe('IsInMaintenanceMode equality', () => {
  // emit skips a state equal to the current one. Without isUnreachable in props, a maintenance →
  // unreachable change would be swallowed and the wrong copy would stay on screen.
  test('states differing in isUnreachable are NOT equal', () => {
    expect(
      statesEqual(
        new IsInMaintenanceMode(true),
        new IsInMaintenanceMode(false),
      ),
    ).toBe(false);
  });

  test('states with identical fields ARE equal', () => {
    expect(
      statesEqual(new IsInMaintenanceMode(true), new IsInMaintenanceMode(true)),
    ).toBe(true);
  });

  test('the default differs from the unreachable variant', () => {
    expect(
      statesEqual(new IsInMaintenanceMode(), new IsInMaintenanceMode(true)),
    ).toBe(false);
  });
});
