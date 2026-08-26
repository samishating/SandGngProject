import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Server-side Supabase client (anon key, RLS-scoped to the current user) for
 * use in Server Components, Server Actions, and Route Handlers. Cookie writes
 * are wrapped in try/catch because Server Components can't set cookies —
 * only middleware.ts and Route Handlers can, which is where session refresh
 * actually happens.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component — middleware.ts refreshes the
          // session on the next request instead.
        }
      },
    },
  });
}
