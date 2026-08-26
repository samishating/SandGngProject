import { recentMonths } from '@/lib/billing-period';

/**
 * Pay-period selector. A plain GET form so the chosen month is in the URL —
 * bookmarkable, shareable, and it survives a reload when someone is reconciling
 * a payslip against the screen.
 */
export default function MonthPicker({ action, selected }: { action: string; selected: string }) {
  const months = recentMonths(18);

  return (
    <form method="get" action={action} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <label className="visually-hidden" htmlFor="monthPicker">
        Pay period
      </label>
      <select className="input" id="monthPicker" name="month" defaultValue={selected} style={{ width: 'auto' }}>
        {months.map(m => (
          <option key={m.key} value={m.key}>
            {m.label}
          </option>
        ))}
      </select>
      {/* Submits without JS; the select alone wouldn't. */}
      <button className="btn btn-secondary" type="submit">
        Show
      </button>
    </form>
  );
}
