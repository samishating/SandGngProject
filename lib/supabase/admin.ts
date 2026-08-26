import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client — bypasses RLS entirely. Server-only, never
 * import this from a client component or anything that ships to the
 * browser. Used exclusively by the admin-invite route to create salesperson
 * accounts via supabaseAdmin.auth.admin.inviteUserByEmail().
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
