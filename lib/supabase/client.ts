import { createBrowserClient } from '@supabase/ssr';

/** Browser-side Supabase client — anon key only, used from client components (e.g. the login form). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
