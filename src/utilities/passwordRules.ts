// The app's own password rules, checked as the user types. Registration
// (registration_screen.dart) and Change Password (edit_password.dart) each carry an identical copy
// of this function in Flutter; here they share it. The server's rules are stricter.

/** Every rule the password breaks, one per line (each ending in "\n"); empty when it passes. */
export function validatePassword(password: string): string {
  let error = '';
  if (password.length === 0) {
    error += 'Password field cannot be empty\n';
    return error;
  }
  if (!/[A-Z]/.test(password)) {
    error += 'Password must contain at least one uppercase letter\n';
  }
  if (!/[0-9]/.test(password)) {
    error += 'Password must contain at least one number\n';
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    error += 'Password must contain at least one special character\n';
  }
  if (password.length < 8) {
    error += 'Password must be at least 8 characters long\n';
  }
  return error;
}
