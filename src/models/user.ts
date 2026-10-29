// Port of frontend/lib/models/user.dart (spec 05 §3): parsing only.
// PORT-GAP: the shared in-memory cache (DataPersistor) that keeps one User object per id.
// Until it is built, the side menu reads users from a stand-in (services/data/userPersistor.ts)
// that setUser fills.

export type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNo: string | null;
  shouldSendEmails: boolean;
};

export function parseUser(json: Record<string, unknown>): User {
  return {
    id: json.id as number,
    email: json.email as string,
    firstName: json.first_name as string,
    lastName: json.last_name as string,
    phoneNo: (json.phone_no as string | null | undefined) ?? null,
    shouldSendEmails: json.should_send_emails as boolean,
  };
}
