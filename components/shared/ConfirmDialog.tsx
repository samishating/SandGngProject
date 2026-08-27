'use client';

import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  title: string;
  /** The explanation. Spell out what will actually happen, not "are you sure". */
  children: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Paints the confirm button as destructive. */
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation modal, replacing window.confirm.
 *
 * Built on <dialog> with showModal(), which brings focus trapping, Escape to
 * dismiss, inertness of the page behind and correct screen-reader semantics
 * for free — all things a div-with-a-backdrop has to reimplement badly.
 */
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      // Fires for Escape as well as close(); routing both through onCancel
      // keeps the parent's state in step with what's on screen.
      onCancel={e => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
      onClose={() => {
        if (open && !busy) onCancel();
      }}
    >
      <div className="confirm-dialog-inner">
        <h2 className="dialog-title">{title}</h2>
        <div className="dialog-body">{children}</div>
        <div className="dialog-actions">
          <button className="btn btn-ghost" type="button" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            className={`btn ${destructive ? 'btn-danger' : 'btn-primary'}`}
            type="button"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
