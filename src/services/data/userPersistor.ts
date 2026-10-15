// A stand-in for DataPersistor<User> (frontend/lib/services/data/data_persistor.dart; spec 05),
// holding only what the side menu reads. setUser() puts each user it fetches here, as Flutter's
// userParser (a PersistedJsonParser) adds every parsed User to the persistor, and the NavBar reads
// the first one, as navbar.dart does.
// LATER(part 6): replace this with the shared in-memory cache, DataPersistor<User> (registered in
// registerPersistors), which every User read and write goes through; the shared cache was put off
// by the developer's boss (2026-10-14). Until then nothing else may read users from here.
//
// Same rules as the persistor, so the side menu behaves the same:
// - keyed by id, in insertion order (Dart's default LinkedHashMap);
// - a user with an id already held updates the held object's fields in place (updateFields), so
//   the first entry stays first;
// - never cleared, not even by log out (quirk Q50: after logging out and into another account in
//   the same app session, the side menu still shows the first account).

import type { User } from '../../models/user';

const persistedData = new Map<number, User>();

/** DataPersistor.add: hold `user`, or update the held one with the same id. Returns the held one. */
export function persistUser(user: User): User {
  const held = persistedData.get(user.id);
  if (held === undefined) {
    persistedData.set(user.id, user);
    return user;
  }
  Object.assign(held, user);
  return held;
}

/** `persistedData[persistedData.keys.first]`, or undefined when nothing is held. */
export function firstPersistedUser(): User | undefined {
  return persistedData.values().next().value;
}

/** Tests only: start empty. */
export function resetUserPersistorForTests(): void {
  persistedData.clear();
}
