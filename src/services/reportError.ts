// Stand-in for Sentry.captureException. Every call site already passes the same exception and
// "Error Code xxxxx:" marker as the Flutter app.
// LATER(part 2): connect this function to Sentry.captureException.
// LATER(part 2): the developer log (utilities/logging.dart). The ported files leave out Flutter's
// log lines so far; part 2 adds them back, file by file.

// Logged, not warned: Sentry reports silently, and a console.warn would put React Native's debug
// warning box on screen, which the Flutter app never shows.
export function reportError(error: unknown): void {
  if (__DEV__) {
    console.log('[reportError]', String(error));
  }
}
