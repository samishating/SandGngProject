// Admin CRUD for plans — the offers shown on the pricing page.
//
//   POST   create a plan (optionally with its opening prices)
//   PATCH  edit name / description / badge / order / featured / active / translations
//   DELETE retire a plan, or remove it outright if nothing references it
//
// Plans are deliberately editable at runtime: adding an offer or reworking its
// wording shouldn't need a deploy.
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { routing } from '@/i18n/routing';

const KEY_RE = /^[a-z0-9][a-z0-9-]{1,40}$/;
const INTERVALS = ['one_time', 'month', 'year'] as const;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  return profile?.role === 'ADMIN';
}

/** The marketing pages render plans server-side, so cached HTML must go. */
function revalidateMarketing() {
  revalidatePath('/[locale]/pricing', 'page');
  revalidatePath('/[locale]', 'page');
  revalidatePath('/[locale]/checkout', 'page');
}

function cleanText(value: unknown, max = 600): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

/**
 * Keeps only known locales and known fields, and drops entries that are blank
 * everywhere — otherwise the blob slowly fills with empty objects that the
 * fallback has to step over on every render.
 */
function cleanTranslations(value: unknown): Record<string, Record<string, string>> | null {
  if (!value || typeof value !== 'object') return null;
  const out: Record<string, Record<string, string>> = {};
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) continue; // base columns hold this one
    const raw = (value as Record<string, unknown>)[locale];
    if (!raw || typeof raw !== 'object') continue;
    const entry: Record<string, string> = {};
    for (const field of ['name', 'description', 'badge'] as const) {
      const text = cleanText((raw as Record<string, unknown>)[field]);
      if (text) entry[field] = text;
    }
    if (Object.keys(entry).length > 0) out[locale] = entry;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const key = typeof body.key === 'string' ? body.key.trim().toLowerCase() : '';
  const name = cleanText(body.name, 120);
  const isRecurring = Boolean(body.isRecurring);

  if (!KEY_RE.test(key)) {
    return NextResponse.json({ error: 'Key must be 2-41 lowercase letters, numbers or hyphens' }, { status: 400 });
  }
  if (!name) return NextResponse.json({ error: 'A name is required' }, { status: 400 });

  if (await prisma.plan.findUnique({ where: { key } })) {
    return NextResponse.json({ error: 'A plan with that key already exists' }, { status: 409 });
  }

  // New plans go to the end unless told otherwise, rather than silently
  // landing first and reshuffling the page.
  const last = await prisma.plan.findFirst({ orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
  const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Math.trunc(Number(body.sortOrder)) : (last?.sortOrder ?? 0) + 10;

  const plan = await prisma.plan.create({
    data: {
      key,
      name,
      isRecurring,
      description: cleanText(body.description),
      badge: cleanText(body.badge, 40),
      sortOrder,
      // Created switched off: a plan with no price would render a card with a
      // blank where the money goes. The admin turns it on once priced.
      isActive: false,
    },
  });

  // Opening prices, in whole dollars.
  const prices = Array.isArray(body.prices) ? body.prices : [];
  for (const entry of prices) {
    const interval = typeof entry?.interval === 'string' ? entry.interval : '';
    const dollars = Number(entry?.amountUsd);
    if (!INTERVALS.includes(interval as (typeof INTERVALS)[number])) continue;
    if (!Number.isFinite(dollars) || dollars <= 0 || dollars > 100_000) continue;
    await prisma.planPrice.create({
      data: { planId: plan.id, interval, amountUsd: Math.round(dollars * 100) },
    });
  }

  revalidateMarketing();
  return NextResponse.json({ plan });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const existing = await prisma.plan.findUnique({ where: { id }, include: { prices: true } });
  if (!existing) return NextResponse.json({ error: 'No such plan' }, { status: 404 });

  const data: Record<string, unknown> = {};
  if ('name' in body) {
    const name = cleanText(body.name, 120);
    if (!name) return NextResponse.json({ error: 'A name is required' }, { status: 400 });
    data.name = name;
  }
  if ('description' in body) data.description = cleanText(body.description);
  if ('badge' in body) data.badge = cleanText(body.badge, 40);
  if ('translations' in body) data.translations = cleanTranslations(body.translations);
  if ('sortOrder' in body && Number.isFinite(Number(body.sortOrder))) data.sortOrder = Math.trunc(Number(body.sortOrder));
  if ('isRecurring' in body) data.isRecurring = Boolean(body.isRecurring);

  if ('isActive' in body) {
    const next = Boolean(body.isActive);
    // Publishing an unpriced plan would put a card with no price on the page.
    if (next && existing.prices.length === 0) {
      return NextResponse.json({ error: 'Set a price before making this plan live' }, { status: 400 });
    }
    data.isActive = next;
  }

  if ('isFeatured' in body && Boolean(body.isFeatured)) {
    // Only one plan carries the highlight, so promoting one demotes the rest
    // instead of leaving two cards competing for the same emphasis.
    await prisma.plan.updateMany({ where: { id: { not: id } }, data: { isFeatured: false } });
    data.isFeatured = true;
  } else if ('isFeatured' in body) {
    data.isFeatured = false;
  }

  const plan = await prisma.plan.update({ where: { id }, data });
  revalidateMarketing();
  return NextResponse.json({ plan });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) return NextResponse.json({ error: 'No such plan' }, { status: 404 });

  const [sales, rules] = await Promise.all([
    prisma.sale.count({ where: { planId: id } }),
    prisma.commissionRule.count({ where: { planId: id } }),
  ]);

  // Same reasoning as commission rules: a plan with sales behind it is part of
  // the record. Retiring it takes it off the page without orphaning history.
  if (sales > 0 || rules > 0) {
    await prisma.plan.update({ where: { id }, data: { isActive: false, isFeatured: false } });
    revalidateMarketing();
    return NextResponse.json({ outcome: 'retired', sales, rules });
  }

  await prisma.planPrice.deleteMany({ where: { planId: id } });
  await prisma.plan.delete({ where: { id } });
  revalidateMarketing();
  return NextResponse.json({ outcome: 'deleted', sales, rules });
}
