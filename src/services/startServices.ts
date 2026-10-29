// Port of frontend/lib/utilities/start_services.dart: the services registered once at launch,
// before the first screen (main.dart innerMain → registerServices).

import { AuthRequestManager } from './requests/authRequests';

let backgroundAuth: ReturnType<typeof setInterval> | null = null;

export function registerServices(): void {
  // PORT-GAP: registerPersistors() and registerParsers(), the shared in-memory cache. Read by
  // the side menu (navbar.dart, through a stand-in for now) and the Hubs list.
  setupBackgroundAuth();
}

/**
 * Every 15 s for as long as the app runs, a session check (auth(), not forced). Its server probe
 * is what notices maintenance or a lost connection, and the server coming back.
 */
export function setupBackgroundAuth(): void {
  // PORT-GAP: log "Starting Timer", and each tick's run number and result.
  const manager = new AuthRequestManager();
  backgroundAuth = setInterval(() => {
    manager.auth({ shouldForceAuth: false });
  }, 15000);
}

/** For tests only. */
export function stopBackgroundAuthForTesting(): void {
  if (backgroundAuth !== null) {
    clearInterval(backgroundAuth);
    backgroundAuth = null;
  }
}
