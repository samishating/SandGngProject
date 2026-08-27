// POST /api/admin/translate — machine-translates plan copy into the other
// locales. Admin-only, and rate-limited by the upstream provider rather than
// by us, which is why it isn't exposed any wider: it spends someone else's
// quota, and an open endpoint would burn it in minutes.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { routing } from '@/i18n/routing';
import { translateBatch, type TranslatableField, type TranslationRequest } from '@/lib/translate';

const FIELDS: TranslatableField[] = ['name', 'description', 'badge'];
const MAX_CHARS = 800;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  return profile?.role === 'ADMIN';
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const source = (body.source as Record<string, unknown>) ?? {};

  // Only the locales this site actually has, and never the default — that one
  // is the source.
  const targets = routing.locales.filter(l => l !== routing.defaultLocale);

  const requests: TranslationRequest[] = [];
  for (const field of FIELDS) {
    const raw = source[field];
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const text = raw.trim().slice(0, MAX_CHARS);
    for (const target of targets) {
      requests.push({ text, field, target });
    }
  }

  if (requests.length === 0) {
    return NextResponse.json({ error: 'Fill in the English name or description first' }, { status: 400 });
  }

  const results = await translateBatch(requests, routing.defaultLocale);

  // Reshaped into the same { locale: { field: value } } form the editor keeps
  // translations in, so it can drop straight into state.
  const translations: Record<string, Record<string, string>> = {};
  const failures: string[] = [];

  for (const result of results) {
    if (result.translated) {
      translations[result.target] ??= {};
      translations[result.target]![result.field] = result.translated;
    } else if (result.error && result.error !== 'nothing to translate') {
      failures.push(`${result.target}/${result.field}: ${result.error}`);
    }
  }

  return NextResponse.json({ translations, failures });
}
