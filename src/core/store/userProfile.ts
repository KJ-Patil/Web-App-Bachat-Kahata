/**
 * Cloud-backed user profile (display name + avatar).
 *
 * The local `user_session` key is only a cache: signing out deliberately wipes
 * it (see `clearLocalCache` in dataStore) so nothing personal is left behind on
 * a shared device. The durable copy therefore lives in the user's own Firestore
 * document, `users/{uid}`, which firestore.rules restricts to that same signed-in
 * user. Signing back in rehydrates the session from it.
 *
 * This module deliberately does NOT go through dataStore: dataStore's keys are
 * PIN-encrypted and only readable after the lock screen, whereas the profile has
 * to be resolved *before* the lock screen in order to greet the user.
 *
 * The uid is always taken from `auth.currentUser` and never from a caller, a URL
 * or localStorage, so a client-side tamper cannot aim a read or write at another
 * account (the security rules would reject it anyway — this is the second lock).
 */

import { doc, getDoc, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { auth, db } from "@/config/firebase";
import { sanitizeAvatarUrl, sanitizeDisplayName } from "@/core/utils/avatar";

export interface UserProfile {
  name: string;
  /** `null` means "explicitly removed" — distinct from "never set". */
  avatarUrl: string | null;
}

/** What gets cached in localStorage under `user_session`. */
export interface SessionProfile extends UserProfile {
  email: string | null;
}

/**
 * Persist the profile to `users/{uid}`. Merges, so it never clobbers the other
 * fields on that document (uid/email/createdAt written at registration).
 * Returns false if there is no signed-in user or the write failed — callers keep
 * their local copy either way, so a cloud failure degrades instead of losing the
 * edit.
 */
export async function saveUserProfile(profile: UserProfile): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  try {
    await setDoc(
      doc(db, "users", user.uid),
      {
        name: sanitizeDisplayName(profile.name),
        // Store null rather than omitting the field: "photo removed" must be
        // durable, otherwise the provider photo would be re-seeded at next login.
        avatarUrl: sanitizeAvatarUrl(profile.avatarUrl),
        profileUpdatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch {
    // Never surface the raw Firestore error — it can carry document paths.
    return false;
  }
}

/**
 * Read the saved profile for the signed-in user. Returns null when there is no
 * user, no document, or the read failed (offline) — callers then fall back to
 * the identity provider's values. Fields are re-validated on the way in: the
 * document is user-writable, so it is treated as untrusted input.
 */
export async function fetchUserProfile(): Promise<Partial<UserProfile> | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) return null;

    const data = snap.data();
    const result: Partial<UserProfile> = {};

    const name = sanitizeDisplayName(data.name);
    if (name) result.name = name;

    // Preserve the three-way distinction: a stored null means the user removed
    // their photo and must not be overridden by the provider's photo.
    if ("avatarUrl" in data) result.avatarUrl = sanitizeAvatarUrl(data.avatarUrl);

    return result;
  } catch {
    return null;
  }
}

/**
 * Build the session to cache locally after a successful sign-in: the saved
 * profile wins, then whatever the identity provider knows, then `fallbackName`
 * (e.g. the email local-part). Always resolves — a failed profile read must
 * never block login.
 */
export async function resolveSessionProfile(
  user: User,
  fallbackName: string
): Promise<SessionProfile> {
  const saved = await fetchUserProfile();

  return {
    email: user.email,
    name:
      saved?.name ||
      sanitizeDisplayName(user.displayName) ||
      sanitizeDisplayName(fallbackName) ||
      "Guest",
    avatarUrl:
      // `undefined` = never saved, so fall back to the provider photo.
      // `null` = deliberately removed, so keep it null.
      saved?.avatarUrl !== undefined
        ? saved.avatarUrl
        : sanitizeAvatarUrl(user.photoURL),
  };
}
