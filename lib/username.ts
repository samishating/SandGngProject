/**
 * Sign-in handles. Supabase Auth only knows about email addresses, so a
 * username is a Hearthline-side alias resolved to one before sign-in.
 */

/** Lowercase; letters, digits, dot, underscore, hyphen; 3–30 characters. */
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9._-]{1,28})[a-z0-9]$/;

export function isEmail(value: string): boolean {
  return value.includes('@');
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
  // An "@" would make it ambiguous with an email at sign-in time.
  return !value.includes('@') && USERNAME_RE.test(value);
}

/**
 * Suggests a handle from an email's local part — what someone would type
 * anyway. Returns null when nothing usable survives, rather than a mangled
 * guess; the caller then leaves the username unset.
 */
export function suggestUsernameFromEmail(email: string): string | null {
  const local = email.split('@')[0] ?? '';
  const cleaned = local
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 30);
  return isValidUsername(cleaned) ? cleaned : null;
}
