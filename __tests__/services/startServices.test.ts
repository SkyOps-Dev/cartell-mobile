// start_services.dart setupBackgroundAuth: a session check every 15 s, not forced.

import { AuthRequestManager } from '../../src/services/requests/authRequests';
import { Result } from '../../src/services/result';
import {
  setupBackgroundAuth,
  stopBackgroundAuthForTesting,
} from '../../src/services/startServices';

afterEach(() => {
  stopBackgroundAuthForTesting();
  jest.useRealTimers();
});

test('runs auth({ shouldForceAuth: false }) every 15 s', () => {
  jest.useFakeTimers();
  const auth = jest
    .spyOn(AuthRequestManager.prototype, 'auth')
    .mockResolvedValue(Result.success());
  setupBackgroundAuth();
  jest.advanceTimersByTime(14999);
  expect(auth).not.toHaveBeenCalled();
  jest.advanceTimersByTime(1);
  expect(auth).toHaveBeenCalledTimes(1);
  expect(auth).toHaveBeenCalledWith({ shouldForceAuth: false });
  jest.advanceTimersByTime(30000);
  expect(auth).toHaveBeenCalledTimes(3);
});
