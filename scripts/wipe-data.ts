// Clears out test data — orders and commission history — while leaving
// everything the site needs to run.
//
//   npm run wipe-data                          # dry run, shows what would go
//   npm run wipe-data -- --yes                 # delete orders + commission history
//   npm run wipe-data -- --yes --rules         # ...and commission rules
//   npm run wipe-data -- --yes --tags          # ...and referral tags
//   npm run wipe-data -- --yes --salespeople   # ...and salesperson accounts
//   npm run wipe-data -- --yes --admins        # ...and admin accounts too
//
// Never touched: plans, plan prices, exchange rates. Those are configuration
// the marketing pages render from, not something a test run produced — wiping
// them would take the pricing page down until it was re-seeded.
//
// Referral tags, commission rules and accounts are all opt-in, because each is
// part of a salesperson's setup rather than test output. Deleting a tag
// silently breaks every link that person has already handed out, and deleting
// the last admin locks everyone out of /admin — recoverable only by re-running
// create-admin from a machine holding the service-role key.
//
// The default is deliberately narrow: it removes what a test run generated and
// nothing that was configured by hand.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createClient } from '@supabase/supabase-js';

const args = new Set(process.argv.slice(2));
const confirmed = args.has('--yes');
const dropTags = args.has('--tags');
const dropRules = args.has('--rules');
const dropSalespeople = args.has('--salespeople');
const dropAdmins = args.has('--admins');

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DIRECT_URL || process.env.DATABASE_URL!) });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function accountScope(): 'ADMIN' | 'SALESPERSON' | 'BOTH' | null {
  if (dropAdmins && dropSalespeople) return 'BOTH';
  if (dropAdmins) return 'ADMIN';
  if (dropSalespeople) return 'SALESPERSON';
  return null;
}

async function main() {
  const scope = accountScope();

  const tagCount = await prisma.referralTag.count();
  const ruleCount = await prisma.commissionRule.count();

  console.log('Will delete:');
  console.log(`  sales              ${await prisma.sale.count()}`);
  console.log(`  commission events  ${await prisma.commissionEvent.count()}`);
  console.log(`  commission rules   ${dropRules ? ruleCount : '0 (pass --rules)'}`);
  console.log(`  referral tags      ${dropTags ? tagCount : '0 (pass --tags)'}`);
  console.log(`  accounts           ${scope ? scope.toLowerCase() : 'none (pass --salespeople and/or --admins)'}`);
  console.log('Will keep:');
  console.log(`  plans              ${await prisma.plan.count()}`);
  console.log(`  plan prices        ${await prisma.planPrice.count()}`);
  console.log(`  exchange rates     ${await prisma.exchangeRate.count()}`);
  if (!dropTags) console.log(`  referral tags      ${tagCount}`);
  if (!dropRules) console.log(`  commission rules   ${ruleCount}`);
  console.log('');

  if (!confirmed) {
    console.log('Dry run — nothing deleted. Re-run with --yes to go ahead.');
    return;
  }

  // Children before parents — these are real foreign keys. Events and sales
  // always go; rules and tags only when asked, since both are configuration a
  // person set up rather than something a test run produced.
  const events = await prisma.commissionEvent.deleteMany({});
  const sales = await prisma.sale.deleteMany({});
  let ruleCountDeleted = dropRules ? (await prisma.commissionRule.deleteMany({})).count : 0;
  let tagCountDeleted = dropTags ? (await prisma.referralTag.deleteMany({})).count : 0;

  let profileCount = 0;
  let authDeleted = 0;
  if (scope) {
    const doomed = await prisma.profile.findMany({
      where: scope === 'BOTH' ? {} : { role: scope },
      select: { id: true, email: true },
    });
    const doomedIds = doomed.map(p => p.id);

    // A Profile can't go while its tags and rules still point at it, whatever
    // the flags said — those foreign keys are real. Scoped to the accounts
    // actually being removed, so everyone else keeps theirs.
    tagCountDeleted += (await prisma.referralTag.deleteMany({ where: { salespersonId: { in: doomedIds } } })).count;
    ruleCountDeleted += (await prisma.commissionRule.deleteMany({ where: { salespersonId: { in: doomedIds } } })).count;

    profileCount = (await prisma.profile.deleteMany({ where: { id: { in: doomedIds } } })).count;

    // The Supabase auth user is separate from the Profile row; leaving it
    // behind blocks re-creating that person later on a duplicate-email error.
    for (const p of doomed) {
      const { error } = await supabase.auth.admin.deleteUser(p.id);
      if (error) console.warn(`  could not delete auth user ${p.email}: ${error.message}`);
      else authDeleted++;
    }
  }

  console.log('Deleted:');
  console.log(`  commission events  ${events.count}`);
  console.log(`  sales              ${sales.count}`);
  console.log(`  commission rules   ${ruleCountDeleted}`);
  console.log(`  referral tags      ${tagCountDeleted}`);
  console.log(`  profiles           ${profileCount}`);
  console.log(`  auth users         ${authDeleted}`);

  const left = await prisma.profile.findMany({ select: { email: true, role: true } });
  console.log('\nAccounts still present:', left.length ? left.map(p => `${p.email} (${p.role})`).join(', ') : 'none');
  if (!left.some(p => p.role === 'ADMIN')) {
    console.log('No admin left — run `npm run create-admin -- <email>` before trying to sign in.');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
