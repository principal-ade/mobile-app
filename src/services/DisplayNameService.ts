/**
 * Display-name resolution for GitHub logins.
 *
 * The trail / inbox / outbox / topic records we store carry only a GitHub
 * `login` + numeric id for the people involved — never the human display
 * `name`. This resolves a login to that name (GitHub's `user.name`, falling
 * back to the login) via `GET /users/{login}`, deduped and cached so any
 * given login is fetched at most once per TTL across the whole app.
 *
 * Two cache tiers: an in-memory map (the source of truth for a session, read
 * synchronously by `peekDisplayName`) and an AsyncStorage mirror that lets a
 * resolved name survive app restarts without another round-trip.
 *
 * Consumers should go through the `useDisplayName(s)` hooks rather than call
 * this directly.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchUserProfile } from './GithubService';

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const STORAGE_PREFIX = 'ghDisplayName:';

// login(lowercased) → resolved name, or null = "resolved, but no display name"
// (or the lookup failed). `undefined`/absent = not yet resolved this session.
const memory = new Map<string, string | null>();
// login(lowercased) → in-flight resolution, so concurrent callers (e.g. every
// row in a list mounting at once) share a single network request.
const inFlight = new Map<string, Promise<string | null>>();

const keyOf = (login: string) => login.trim().toLowerCase();

interface StoredEntry {
  name: string | null;
  fetchedAt: number;
}

/**
 * Synchronous peek at the in-memory cache. `undefined` means "unknown — not
 * resolved yet this session"; `null` means "resolved, no display name".
 */
export function peekDisplayName(login: string): string | null | undefined {
  return memory.get(keyOf(login));
}

/**
 * Seed a name we already hold (e.g. from a record that happens to carry one)
 * so it never triggers a fetch. Won't clobber an existing entry.
 */
export function primeDisplayName(login: string, name: string | null): void {
  const k = keyOf(login);
  if (!memory.has(k)) memory.set(k, name && name.trim() ? name : null);
}

/**
 * Resolve a login to its display name (or null). Idempotent and cached:
 * memory → AsyncStorage → network, with in-flight dedup. Never throws — a
 * 404 (renamed/deleted login), rate limit, or offline resolves to null so
 * callers can fall back to the raw login.
 */
export async function resolveDisplayName(
  login: string,
  token: string,
): Promise<string | null> {
  const k = keyOf(login);
  if (memory.has(k)) return memory.get(k) ?? null;
  const existing = inFlight.get(k);
  if (existing) return existing;

  const promise = (async (): Promise<string | null> => {
    // Persisted hit first — survives restarts, skips the network.
    try {
      const raw = await AsyncStorage.getItem(STORAGE_PREFIX + k);
      if (raw) {
        const stored = JSON.parse(raw) as StoredEntry;
        if (Date.now() - stored.fetchedAt < TTL_MS) {
          memory.set(k, stored.name);
          return stored.name;
        }
      }
    } catch {
      // Corrupt/unavailable storage — fall through to a live fetch.
    }

    try {
      const profile = await fetchUserProfile(token, login);
      const name = profile.name && profile.name.trim() ? profile.name : null;
      memory.set(k, name);
      const entry: StoredEntry = { name, fetchedAt: Date.now() };
      void AsyncStorage.setItem(STORAGE_PREFIX + k, JSON.stringify(entry)).catch(
        () => {},
      );
      return name;
    } catch {
      // Cache the miss in memory only (not persisted) so a later session can
      // retry — e.g. after a transient rate-limit or offline window.
      memory.set(k, null);
      return null;
    } finally {
      inFlight.delete(k);
    }
  })();

  inFlight.set(k, promise);
  return promise;
}
