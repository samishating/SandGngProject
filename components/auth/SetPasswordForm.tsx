'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MIN_PASSWORD_LENGTH, TEMP_PASSWORD } from '@/lib/auth-constants';

type Status = 'idle' | 'submitting' | 'error';

export default function SetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  function localProblem(): string | null {
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    // Otherwise the forced change is a no-op and the shared handover password
    // stays live on the account.
    if (password === TEMP_PASSWORD) {
      return 'Choose something other than the temporary password.';
    }
    if (password !== confirm) {
      return "Those two passwords don't match.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = localProblem();
    if (problem) {
      setStatus('error');
      setMessage(problem);
      return;
    }

    setStatus('submitting');
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }

    // Supabase now has the new password; clearing mustChangePassword is a
    // separate server call, because Profile is ours and the browser must not
    // be trusted to flip its own gate.
    const res = await fetch('/api/auth/password-changed', { method: 'POST' });
    if (!res.ok) {
      setStatus('error');
      setMessage('Password updated, but the account flag did not clear. Reload and try again.');
      return;
    }

    // The server decides where this account belongs — landing everyone on the
    // marketing site after setting a password would leave them to find their
    // own way back in.
    const { destination } = (await res.json()) as { destination?: string };
    router.replace(destination ?? '/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p className="card-body">Choose a password before you continue.</p>
      <label className="visually-hidden" htmlFor="newPassword">
        New password
      </label>
      <input
        className="input"
        id="newPassword"
        type="password"
        required
        placeholder="New password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        autoComplete="new-password"
      />
      <label className="visually-hidden" htmlFor="confirmPassword">
        Confirm new password
      </label>
      <input
        className="input"
        id="confirmPassword"
        type="password"
        required
        placeholder="Confirm new password"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        autoComplete="new-password"
      />
      <button className="btn btn-primary" type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Saving…' : 'Save password'}
      </button>
      {status === 'error' && <p className="card-body">{message}</p>}
    </form>
  );
}
