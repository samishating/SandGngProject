/**
 * The temporary password every new account is created with. The person is
 * forced to replace it the first time they sign in — see `mustChangePassword`
 * on Profile and the guard in app/admin/layout.tsx / app/dashboard/layout.tsx.
 *
 * This is a shared, guessable secret by design: it is spoken over the phone
 * when an account is handed over. That only stays acceptable because the
 * forced-change redirect gives it a lifetime of one sign-in — an account that
 * is created and then not claimed for a week is a real window, so create
 * accounts when the person is ready to use them, not in advance.
 *
 * Override per-environment with TEMP_ACCOUNT_PASSWORD if a less guessable
 * handover secret is wanted.
 */
export const TEMP_PASSWORD = process.env.TEMP_ACCOUNT_PASSWORD || 'login123';

/** Supabase's own floor is 6; this is the minimum for a *chosen* password. */
export const MIN_PASSWORD_LENGTH = 8;
