/**
 * Resolve GitHub logins to human display names in the UI.
 *
 * Our stored records only carry logins, so these hooks turn a login into the
 * person's `name` (falling back to the login while a fetch is pending or if
 * none exists). Resolution is deduped + cached in DisplayNameService, so
 * rendering a 50-row list of mixed senders costs at most one fetch per unique
 * login. The signed-in user's own name comes straight from auth — no fetch.
 *
 * - `useDisplayName(login)` — one login, returns the display string.
 * - `useDisplayNames(logins)` — a list; returns a `getName(login)` getter so
 *   callers with a variable number of names (e.g. recipient lists) resolve
 *   them all under a stable set of hooks.
 */

import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useOptionalAuthContext } from '../context/AuthContext';
import {
  peekDisplayName,
  resolveDisplayName,
} from '../services/DisplayNameService';

export function useDisplayNames(
  logins: Array<string | null | undefined>,
): (login: string) => string {
  const auth = useOptionalAuthContext();
  const token = auth?.token ?? null;
  const self = auth?.user ?? null;
  const selfKey = self?.login ? self.login.toLowerCase() : null;

  // Deduped, sorted key over the requested logins (excluding self, which we
  // answer from auth). A plain string so the effect re-runs only when the
  // actual set changes, not on every render's fresh array identity.
  const uniqueKey = useMemo(() => {
    const set = new Set<string>();
    for (const l of logins) {
      if (!l || !l.trim()) continue;
      const k = l.trim().toLowerCase();
      if (k === selfKey) continue;
      set.add(k);
    }
    return Array.from(set).sort().join('\n');
  }, [logins, selfKey]);

  const [, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!token || !uniqueKey) return;
    const pending = uniqueKey
      .split('\n')
      .filter((l) => peekDisplayName(l) === undefined);
    if (pending.length === 0) return;
    let active = true;
    void Promise.all(pending.map((l) => resolveDisplayName(l, token))).then(
      () => {
        // Re-render so the getter below re-reads the now-populated cache.
        if (active) bump();
      },
    );
    return () => {
      active = false;
    };
  }, [token, uniqueKey]);

  return useCallback(
    (login: string) => {
      if (!login) return login;
      if (selfKey && login.toLowerCase() === selfKey) {
        return self?.name && self.name.trim() ? self.name : login;
      }
      const resolved = peekDisplayName(login);
      return resolved && resolved.length > 0 ? resolved : login;
    },
    [selfKey, self?.name],
  );
}

export function useDisplayName(login?: string | null): string {
  const getName = useDisplayNames(useMemo(() => [login], [login]));
  return login ? getName(login) : '';
}
