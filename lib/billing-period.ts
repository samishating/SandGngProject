/**
 * Calendar-month arithmetic for pay periods and subscription terms.
 *
 * Pay periods run 1st to last day inclusive, so a month's earnings match what
 * gets paid out for that month — whether it's 28, 29, 30 or 31 days.
 *
 * Everything works in UTC. Deriving month boundaries from the server's local
 * timezone would put a sale made late on the 31st into the following month for
 * anyone east of the server, and the whole point is that a month's total is
 * the same figure no matter who asks.
 */

export interface MonthRange {
  /** First instant of the month, inclusive. */
  start: Date;
  /** First instant of the next month, exclusive — compare with `lt`, not `lte`. */
  end: Date;
  /** "2026-08", the round-trippable form used in URLs. */
  key: string;
  label: string;
}

const MONTH_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function monthRange(year: number, monthIndex: number): MonthRange {
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  // Day 1 of the next month. Date normalises month 12 to January of year+1,
  // so December needs no special case.
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
  return {
    start,
    end,
    key: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`,
    label: start.toLocaleDateString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
  };
}

/** Parses "2026-08". Falls back to the current month for anything unparseable. */
export function parseMonthKey(key: string | undefined | null): MonthRange {
  const match = key ? MONTH_KEY.exec(key) : null;
  if (!match) return currentMonth();
  return monthRange(Number(match[1]), Number(match[2]) - 1);
}

export function currentMonth(): MonthRange {
  const now = new Date();
  return monthRange(now.getUTCFullYear(), now.getUTCMonth());
}

/** Most recent `count` months, newest first — the month picker's options. */
export function recentMonths(count = 12): MonthRange[] {
  const now = new Date();
  const out: MonthRange[] = [];
  for (let i = 0; i < count; i++) {
    out.push(monthRange(now.getUTCFullYear(), now.getUTCMonth() - i));
  }
  return out;
}

/**
 * When a term starting at `from` runs out.
 *
 * Both branches clamp to the end of the target month rather than overflowing
 * into the next one. 31 January + a month is 28 February, not 3 March; 29
 * February + a year is 28 February, not 1 March. That clamping is the whole
 * reason this isn't `+30 days` or `setUTCFullYear` on its own.
 */
export function periodEndFor(from: Date, interval: string): Date | null {
  if (interval === 'one_time') return null;

  const end = new Date(from.getTime());
  const targetDay = end.getUTCDate();

  if (interval === 'year') end.setUTCFullYear(end.getUTCFullYear() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);

  // Landing on an earlier day-of-month than we asked for means the target
  // month was too short and the date rolled forward. setUTCDate(0) steps back
  // to the last day of the intended month.
  if (end.getUTCDate() < targetDay) end.setUTCDate(0);
  return end;
}

/** Whole days until `date`, negative once it's passed. */
export function daysUntil(date: Date, now = new Date()): number {
  return Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
}
