import { randomInt } from 'node:crypto';
import { prisma } from '@/lib/prisma';

/**
 * Short order codes that a customer can read out over the phone.
 *
 * The alphabet leaves out 0/O, 1/I/L and U. The first two groups are the
 * pairs people confuse when reading a code aloud or writing it down; U is
 * dropped because with the digits still present it is the one remaining
 * character that lets a short random string spell something unfortunate.
 *
 * 30 characters over 6 positions is ~729 million combinations, so collisions
 * are rare — but "rare" is not "never", which is why generation retries
 * against the unique index rather than trusting the odds.
 */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const LENGTH = 6;
const MAX_ATTEMPTS = 10;

/** randomInt is drawn from the CSPRNG, so codes aren't guessable from one another. */
function randomCode(): string {
  let out = '';
  for (let i = 0; i < LENGTH; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

/**
 * Returns a code not currently in use.
 *
 * The pre-check is an optimisation, not the guarantee — two concurrent
 * checkouts could both see the same code as free. The unique index on
 * Sale.reference is what actually enforces it, so callers should still be
 * prepared for a P2002 on insert; createSaleReference is retried by
 * withUniqueReference below for exactly that reason.
 */
export async function generateOrderReference(): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = randomCode();
    const clash = await prisma.sale.findUnique({ where: { reference: candidate }, select: { id: true } });
    if (!clash) return candidate;
  }
  throw new Error(`Could not find an unused order reference after ${MAX_ATTEMPTS} attempts`);
}

/**
 * Runs `create` with a fresh reference, retrying if the unique index rejects
 * it. Handles the race the pre-check above cannot.
 */
export async function withUniqueReference<T>(create: (reference: string) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const reference = await generateOrderReference();
    try {
      return await create(reference);
    } catch (error) {
      const code = (error as { code?: string }).code;
      const target = (error as { meta?: { target?: string[] | string } }).meta?.target;
      const hitReference = Array.isArray(target) ? target.includes('reference') : target === 'reference';
      // Only swallow a collision on this exact column — any other unique
      // violation is a real bug and must not be retried into silence.
      if (code === 'P2002' && hitReference) continue;
      throw error;
    }
  }
  throw new Error(`Could not insert with a unique order reference after ${MAX_ATTEMPTS} attempts`);
}

/** Normalises what someone types into a search box back to stored form. */
export function normalizeReference(input: string): string {
  return input.trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
}
