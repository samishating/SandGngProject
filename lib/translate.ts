/**
 * Machine translation for admin-entered copy — plan names, descriptions and
 * badges — so adding an offer doesn't mean writing it out four more times.
 *
 * Output is a draft. It lands in the editor's fields for review rather than
 * being saved, because marketing copy is exactly the kind of text machine
 * translation gets subtly wrong, and a plan card is the last place you want a
 * clumsy sentence.
 *
 * DeepL is used when DEEPL_API_KEY is set — noticeably better, and its free
 * tier is generous. Otherwise MyMemory, which needs no key at all so this
 * works out of the box. Same reasoning as the FX providers: no key means
 * nothing to rotate and nothing to break unattended.
 */

export type TranslatableField = 'name' | 'description' | 'badge';

export interface TranslationRequest {
  /** Source text, in the default locale. */
  text: string;
  field: TranslatableField;
  /** Target locale, e.g. "fr". */
  target: string;
}

export interface TranslationResult extends TranslationRequest {
  translated: string | null;
  error?: string;
}

const DEEPL_FREE = 'https://api-free.deepl.com/v2/translate';
const DEEPL_PRO = 'https://api.deepl.com/v2/translate';

function deeplEndpoint(key: string): string {
  // DeepL marks free-tier keys with a ":fx" suffix and rejects them on the
  // pro host, so the key itself decides where the request goes.
  return key.endsWith(':fx') ? DEEPL_FREE : DEEPL_PRO;
}

async function translateWithDeepl(text: string, source: string, target: string, key: string): Promise<string> {
  const res = await fetch(deeplEndpoint(key), {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      text,
      source_lang: source.toUpperCase(),
      target_lang: target.toUpperCase(),
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`DeepL responded ${res.status}`);
  const body = (await res.json()) as { translations?: Array<{ text?: string }> };
  const out = body.translations?.[0]?.text;
  if (!out) throw new Error('DeepL returned nothing');
  return out;
}

async function translateWithMyMemory(text: string, source: string, target: string): Promise<string> {
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', `${source}|${target}`);
  // Raises the anonymous daily character cap when set; harmless when not.
  if (process.env.NOTIFY_EMAIL) url.searchParams.set('de', process.env.NOTIFY_EMAIL);

  const res = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`MyMemory responded ${res.status}`);
  const body = (await res.json()) as { responseData?: { translatedText?: string }; responseStatus?: number | string };
  const out = body.responseData?.translatedText;
  if (!out || Number(body.responseStatus) !== 200) {
    throw new Error(typeof out === 'string' && out.startsWith('MYMEMORY WARNING') ? 'Daily translation limit reached' : 'MyMemory returned nothing');
  }
  return out;
}

async function translateOne(text: string, source: string, target: string): Promise<string> {
  const key = process.env.DEEPL_API_KEY;
  if (key) {
    try {
      return await translateWithDeepl(text, source, target, key);
    } catch {
      // Fall through — a configured key that's out of quota shouldn't take the
      // feature down when a keyless provider is available.
    }
  }
  return translateWithMyMemory(text, source, target);
}

/**
 * Translates a batch. One failure doesn't sink the rest — each result carries
 * its own error, so the editor can fill in what worked and say what didn't.
 *
 * Runs sequentially on purpose: the keyless provider is rate-limited per IP,
 * and firing a dozen parallel requests is the quickest way to get throttled.
 */
export async function translateBatch(requests: TranslationRequest[], source: string): Promise<TranslationResult[]> {
  const results: TranslationResult[] = [];

  for (const request of requests) {
    const text = request.text.trim();
    if (!text) {
      results.push({ ...request, translated: null, error: 'nothing to translate' });
      continue;
    }
    try {
      results.push({ ...request, translated: await translateOne(text, source, request.target) });
    } catch (error) {
      results.push({ ...request, translated: null, error: (error as Error).message });
    }
  }

  return results;
}
