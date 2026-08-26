// Provisions an ADMIN account: creates the Supabase auth user (if it doesn't
// already exist) and the matching Profile row that app/admin/layout.tsx checks
// for `role === 'ADMIN'`.
//
// Usage:  npm run create-admin -- you@example.com  ["Display Name"]
//
// The account is created with the shared temporary password and
// mustChangePassword set, so the first sign-in is forced through
// /login/set-password. email_confirm is set because nothing is ever emailed —
// Supabase's built-in SMTP rate-limits at a handful of sends per hour, which
// is what made the original magic-link flow unusable.
//
// Safe to re-run: an existing account is reset back to the temporary password
// and re-flagged, which doubles as the lockout recovery path.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createClient } from '@supabase/supabase-js';
import { TEMP_PASSWORD } from '../lib/auth-constants';

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
    // Re-running resets an existing account back to the temporary password,
    // which doubles as the "I'm locked out" recovery path.
    const { error } = await supabase.auth.admin.updateUserById(authUser.id, { password: TEMP_PASSWORD });
    if (error) throw error;
    console.log(`Auth user already exists (${authUser.id}) — reset to the temporary password.`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: TEMP_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    authUser = data.user;
    console.log(`Created Supabase auth user ${authUser.id}`);
  }

  const profile = await prisma.profile.upsert({
    where: { id: authUser.id },
    update: { email, role: 'ADMIN', mustChangePassword: true, ...(displayName ? { displayName } : {}) },
    create: { id: authUser.id, email, role: 'ADMIN', mustChangePassword: true, displayName: displayName ?? null },
  });

  console.log(`\nAdmin ready:`);
  console.log(`  email     ${profile.email}`);
  console.log(`  password  ${TEMP_PASSWORD}   (temporary — must be changed at first sign-in)`);
  console.log(`  role      ${profile.role}`);
  console.log(`  id        ${profile.id}`);
  console.log(`\nSign in at ${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/login`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
