'use client';

import { useEffect, useState } from 'react';

export interface LinkBuilderPlan {
  key: string;
  name: string;
  isRecurring: boolean;
  intervals: string[];
}

interface Props {
  plans: LinkBuilderPlan[];
  tags: Array<{ tag: string; isActive: boolean }>;
  locales: string[];
  defaultLocale: string;
}

const INTERVAL_LABELS: Record<string, string> = {
  one_time: 'Per session',
  month: 'Monthly',
  year: 'Yearly',
};

/**
 * Builds a referral link per plan for the signed-in agent.
 *
 * The origin comes from the browser rather than a configured site URL, so the
 * links are always for whichever host the agent is actually looking at — no
 * env var to keep in sync, and no risk of handing customers a localhost link.
 */
export default function LinkBuilder({ plans, tags, locales, defaultLocale }: Props) {
  const activeTags = tags.filter(t => t.isActive);
  const [tag, setTag] = useState(activeTags[0]?.tag ?? '');
  const [locale, setLocale] = useState(defaultLocale);
  const [copied, setCopied] = useState('');

  // Empty during the server render, filled on mount. Reading window during
  // render would break hydration, so this waits for the effect.
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);

  function linkFor(planKey: string, interval: string | null) {
    const params = new URLSearchParams();
    if (interval) params.set('interval', interval);
    params.set('ref', tag);
    return `${origin}/${locale}/checkout?plan=${planKey}&${params.toString()}`;
  }

  async function copy(value: string, id: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      // Clipboard needs a secure context and permission; the input is
      // selectable either way, so failing quietly is fine.
      setCopied('');
    }
  }

  if (activeTags.length === 0) {
    return <p className="card-body">You have no active referral tag yet — ask your admin to set one up.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {activeTags.length > 1 && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="card-kicker">Your tag</span>
            <select className="input" value={tag} onChange={e => setTag(e.target.value)}>
              {activeTags.map(t => (
                <option key={t.tag} value={t.tag}>
                  {t.tag}
                </option>
              ))}
            </select>
          </label>
        )}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="card-kicker">Language</span>
          <select className="input" value={locale} onChange={e => setLocale(e.target.value)}>
            {locales.map(l => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Plan</th>
            <th>Billing</th>
            <th>Your link</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {plans.flatMap(plan =>
            plan.intervals.map(interval => {
              const id = `${plan.key}-${interval}`;
              const url = linkFor(plan.key, plan.isRecurring ? interval : null);
              return (
                <tr key={id}>
                  <td>{plan.name}</td>
                  <td>{INTERVAL_LABELS[interval] ?? interval}</td>
                  <td>
                    <input
                      className="input"
                      readOnly
                      value={url}
                      onFocus={e => e.currentTarget.select()}
                      style={{ width: '100%', minWidth: 240, fontSize: 13 }}
                      aria-label={`Referral link for ${plan.name}, ${INTERVAL_LABELS[interval] ?? interval}`}
                    />
                  </td>
                  <td>
                    <button className="btn btn-secondary" type="button" onClick={() => copy(url, id)}>
                      {copied === id ? 'Copied' : 'Copy'}
                    </button>
                  </td>
                </tr>
              );
            }),
          )}
        </tbody>
      </table>
      <p className="card-body" style={{ fontSize: 14, opacity: 0.8 }}>
        An order counts for you when it&apos;s placed from one of these links. Nothing is remembered afterwards, so if
        someone comes back later and orders on their own, it won&apos;t be credited to you — send them the link again.
      </p>
    </div>
  );
}
