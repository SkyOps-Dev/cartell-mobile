// Stand-ins for Sentry.captureException and Sentry.captureMessage. Every call site already passes
// the same exception and "Error Code xxxxx:" marker (or the same message and context) as the
// Flutter app.
// PORT-GAP: connect these functions to Sentry.captureException and Sentry.captureMessage.
// PORT-GAP: the developer log (utilities/logging.dart). The ported files leave out Flutter's
// log lines so far; they go back in, file by file, when logging is ported.

// Logged, not warned: Sentry reports silently, and a console.warn would put React Native's debug
// warning box on screen, which the Flutter app never shows.
export function reportError(error: unknown): void {
  if (__DEV__) {
    console.log('[reportError]', String(error));
  }
}

/** Sentry.captureMessage(message, level: info) with `contexts` set on its scope. */
export function reportMessage(
  message: string,
  contexts: Record<string, Record<string, unknown>> = {},
): void {
  if (__DEV__) {
    console.log('[reportMessage]', message, JSON.stringify(contexts));
  }
}
