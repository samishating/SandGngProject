'use client';

import { useRouter } from 'next/navigation';

export default function TagToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();

  async function toggle() {
    await fetch('/api/admin/referral-tags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    router.refresh();
  }

  return (
    <button className="btn btn-ghost" type="button" onClick={toggle}>
      {isActive ? 'Deactivate' : 'Activate'}
    </button>
  );
}
