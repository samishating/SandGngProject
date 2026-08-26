// Provisions an ADMIN account: creates the Supabase auth user (if it doesn't
// already exist) and the matching Profile row that app/admin/layout.tsx checks
// for `role === 'ADMIN'`.
//
// Usage:  npm run create-admin -- you@example.com  ["Display Name"]
//
// No password is ever set. Sign-in is the magic link at /login, so the account
// is created with email_confirm: true — that marks the address as verified so
// the first OTP works immediately, without depending on a confirmation email
// being delivered first.
//
// Safe to re-run: an existing auth user is reused, and an existing Profile is
// promoted to ADMIN rather than duplicated.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createClient } from '@supabase/supabase-js';

// Wrapped in a function so the validated result is plainly `string` at every
// later use, including inside the async helpers below.
function requireEmailArg(raw: string | undefined): string {
  const value = raw?.trim().toLowerCase();
  if (!value || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
    console.error('Usage: npm run create-admin -- you@example.com ["Display Name"]');
    process.exit(1);
  }
  return value;
}

const email = requireEmailArg(process.argv[2]);
const displayName = process.argv[3]?.trim();

for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DIRECT_URL'] as const) {
  if (!process.env[key]) {
    console.error(`Missing env var ${key} — check .env`);
    process.exit(1);
  }
}

const adapter = new PrismaPg(process.env.DIRECT_URL || process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// The admin API has getUserById but no getUserByEmail, so finding an existing
// account means paging through the list. Bounded at 50 pages so a bad response
// can't spin forever.
async function findAuthUserByEmail(target: string) {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find(u => u.email?.toLowerCase() === target);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  let authUser = await findAuthUserByEmail(email);

  if (authUser) {
    console.log(`Auth user already exists (${authUser.id}) — reusing it.`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({ email, email_confirm: true });
    if (error) throw error;
    authUser = data.user;
    console.log(`Created Supabase auth user ${authUser.id}`);
  }

  const profile = await prisma.profile.upsert({
    where: { id: authUser.id },
    update: { email, role: 'ADMIN', ...(displayName ? { displayName } : {}) },
    create: { id: authUser.id, email, role: 'ADMIN', displayName: displayName ?? null },
  });

  console.log(`\nAdmin ready:`);
  console.log(`  email  ${profile.email}`);
  console.log(`  role   ${profile.role}`);
  console.log(`  id     ${profile.id}`);
  console.log(`\nSign in at ${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/login`);
  console.log('and request a sign-in link for that address, then open /admin.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
