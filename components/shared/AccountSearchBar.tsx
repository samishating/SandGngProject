'use client';

/**
 * The finder's search box. A plain GET form, so a search is a real URL an
 * agent can bookmark, reload or paste to a colleague — and it works before
 * hydration, which matters on the phone-in-hand case this is built for.
 */
export default function AccountSearchBar({ action, defaultValue }: { action: string; defaultValue?: string }) {
  return (
    <form method="get" action={action} className="account-search">
      <label className="visually-hidden" htmlFor="accountQuery">
        Search by name, phone number, email or order code
      </label>
      <input
        className="input account-search-input"
        id="accountQuery"
        name="q"
        type="search"
        defaultValue={defaultValue ?? ''}
        placeholder="Name, phone number, email or order code"
        autoComplete="off"
        // The whole page exists to be typed into, so take the caret on load.
        autoFocus
      />
      <button className="btn btn-primary account-search-button" type="submit">
        Search
      </button>
    </form>
  );
}
