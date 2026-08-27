'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

interface Props {
  id: string;
  name: string;
  saleCount: number;
  tagCount: number;
}

/**
 * Removes a salesperson.
 *
 * The two outcomes are genuinely different — deleted for good, or deactivated
 * with their history kept — so the dialog says which one is about to happen
 * and what survives it, rather than asking "are you sure?" about an action
 * whose meaning depends on data the admin can't see from the row.
 */
export default function RemoveSalesperson({ id, name, saleCount, tagCount }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<string | null>(null);

  const willDelete = saleCount === 0;

  async function handleConfirm() {
    setBusy(true);
    setError('');

    const res = await fetch(`/api/admin/salespeople?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    setBusy(false);

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Could not remove that account.');
      return;
    }

    const body = (await res.json()) as { outcome: string; warning?: string };
    setOpen(false);
    setDone(
      body.warning ??
        (body.outcome === 'deleted'
          ? `${name} deleted.`
          : `${name} deactivated — sales history kept, sign-in disabled.`),
    );
    router.refresh();
  }

  return (
    <>
      <button className="btn btn-ghost btn-sm" type="button" onClick={() => setOpen(true)}>
        Remove
      </button>

      {done && (
        <span className="card-body" style={{ fontSize: 13 }}>
          {done}
        </span>
      )}

      <ConfirmDialog
        open={open}
        title={willDelete ? `Delete ${name}?` : `Remove ${name}?`}
        confirmLabel={willDelete ? 'Delete account' : 'Remove access'}
        destructive
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={() => {
          setOpen(false);
          setError('');
        }}
      >
        {willDelete ? (
          <>
            <p style={{ marginTop: 0 }}>
              They have no sales on record, so nothing depends on this account. It will be removed for good.
            </p>
            <ul className="confirm-list">
              <li>Their profile and sign-in are deleted</li>
              <li>
                {tagCount === 0
                  ? 'They have no referral links'
                  : `Their ${tagCount} referral link${tagCount === 1 ? ' stops' : 's stop'} working`}
              </li>
              <li>Their email and username become free to reuse</li>
            </ul>
          </>
        ) : (
          <>
            <p style={{ marginTop: 0 }}>
              They have <strong>{saleCount}</strong> order{saleCount === 1 ? '' : 's'} on record, so the account is kept
              rather than deleted — deleting it would leave commission nobody can account for.
            </p>
            <ul className="confirm-list">
              <li>They can no longer sign in, and any open session ends now</li>
              <li>
                {tagCount === 0
                  ? 'They have no referral links'
                  : `Their ${tagCount} referral link${tagCount === 1 ? ' stops' : 's stop'} crediting them`}
              </li>
              <li>Their commission rules are closed off</li>
              <li>
                <strong>Past sales and commission stay in the books</strong>
              </li>
            </ul>
          </>
        )}
        {error && (
          <p className="confirm-error" role="alert">
            {error}
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
