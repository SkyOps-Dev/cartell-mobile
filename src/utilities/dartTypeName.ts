// What Dart's `e.runtimeType` prints for an error the app catches, where a screen shows it to the
// user (the Account Settings switch toasts: "Error encountered of type: <name>. …").
//
// The app's own exceptions carry their Dart class name. A request that never got an answer is a
// TypeError ("Network request failed") from fetch; package:http raises a ClientException there.

export function dartTypeName(error: unknown): string {
  if (
    error instanceof TypeError &&
    error.message === 'Network request failed'
  ) {
    return 'ClientException';
  }
  if (error instanceof Error) {
    return error.name;
  }
  return typeof error;
}
