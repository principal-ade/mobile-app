/**
 * Trails API service — thin fetch wrappers over the web-ade trail routes.
 *
 * Mirrors `CollectionsService.ts` in shape. Two surfaces:
 *
 * 1. Trail-level reads and the send route — these consume the existing
 *    repo-centric `/api/trails/...` store, gated by GitHub repo access.
 * 2. Per-user inbox — read/unread/delete the recipient-side index
 *    populated by `POST /api/trails/by-id/{id}/send`.
 *
 * Trail-level reads, the send route, visits, and note CRUD live here.
 * Sign-offs are still deferred.
 * See `mobile-app/docs/TRAILS_API.md` for the full surface map.
 */

import { apiConfig } from '../utils/config';
import type {
  GetInboxResponse,
  InboxIndexEntry,
  MarkReadResponse,
  ReadAllResponse,
  SendTrailRequest,
  SendTrailResponse,
  SharedTrailIndexEntry,
  UnreadCountResponse,
} from '../types/Inbox';
import type { TrailNote, TrailNoteDraft, TrailPayload } from '../types/Trail';

const API_BASE = `${apiConfig.baseUrl}/trails`;

// ============================================================================
// Response envelopes
// ============================================================================

export interface TrailFetchResponse {
  owner: string;
  repo: string;
  entry: SharedTrailIndexEntry;
  payload: TrailPayload;
  /**
   * Whether the authenticated caller has this trail bookmarked. Always `false`
   * for anonymous callers. Drives the bookmark toggle's initial state in the
   * trail-detail header without a second request.
   */
  bookmarked: boolean;
}

export interface ListTrailsResponse {
  entries: SharedTrailIndexEntry[];
}

// ============================================================================
// Error handling
// ============================================================================

interface ErrorBody {
  error?: string;
  code?: string;
}

export class TrailsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string | null,
  ) {
    super(message);
    this.name = 'TrailsApiError';
  }
}

async function throwFromResponse(response: Response, fallback: string): Promise<never> {
  let body: ErrorBody = {};
  try {
    body = (await response.json()) as ErrorBody;
  } catch {
    // Server returned a non-JSON error (unlikely from these routes but
    // possible from middleware) — fall back to the canned message.
  }
  throw new TrailsApiError(
    body.error || fallback,
    response.status,
    body.code ?? null,
  );
}

function authHeaders(githubToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${githubToken}`,
  };
}

function jsonHeaders(githubToken: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${githubToken}`,
  };
}

// ============================================================================
// Trail-level reads
// ============================================================================

/**
 * Resolve `/trail/{id}` — primary fetch for received trails. Returns the
 * envelope the standalone web page consumes, so mobile and web share one
 * code path against the same shape.
 */
export async function getTrailById(
  id: string,
  githubToken?: string,
): Promise<TrailFetchResponse> {
  const response = await fetch(`${API_BASE}/by-id/${encodeURIComponent(id)}`, {
    headers: githubToken ? authHeaders(githubToken) : undefined,
  });
  if (!response.ok) {
    await throwFromResponse(response, `Failed to fetch trail: ${response.status}`);
  }
  return (await response.json()) as TrailFetchResponse;
}

export async function listTrailsForRepo(
  owner: string,
  repo: string,
  githubToken?: string,
): Promise<SharedTrailIndexEntry[]> {
  const url = `${API_BASE}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const response = await fetch(url, {
    headers: githubToken ? authHeaders(githubToken) : undefined,
  });
  if (!response.ok) {
    await throwFromResponse(response, `Failed to list trails: ${response.status}`);
  }
  const body = (await response.json()) as ListTrailsResponse;
  return body.entries;
}

// ============================================================================
// Sending
// ============================================================================

/**
 * Send an existing trail to one or more GitHub-login recipients. Partial
 * delivery is non-fatal — unknown/invalid logins are returned in `failed[]`.
 */
export async function sendTrail(
  trailId: string,
  githubToken: string,
  body: SendTrailRequest,
): Promise<SendTrailResponse> {
  const response = await fetch(
    `${API_BASE}/by-id/${encodeURIComponent(trailId)}/send`,
    {
      method: 'POST',
      headers: jsonHeaders(githubToken),
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    await throwFromResponse(response, `Failed to send trail: ${response.status}`);
  }
  return (await response.json()) as SendTrailResponse;
}

// ============================================================================
// Inbox
// ============================================================================

export interface GetInboxOptions {
  /** Skip entries with `readAt !== null`. */
  unreadOnly?: boolean;
  /** ISO 8601 — entries with `sentAt > since`. */
  since?: string;
  /** 1..100, default 50. */
  limit?: number;
  /** Opaque continuation token from a previous response. */
  cursor?: string;
}

export async function getInbox(
  githubToken: string,
  opts: GetInboxOptions = {},
): Promise<GetInboxResponse> {
  const params = new URLSearchParams();
  if (opts.unreadOnly) params.set('unreadOnly', 'true');
  if (opts.since) params.set('since', opts.since);
  if (opts.limit !== undefined) params.set('limit', String(opts.limit));
  if (opts.cursor) params.set('cursor', opts.cursor);
  const query = params.toString();
  const url = `${API_BASE}/inbox${query ? `?${query}` : ''}`;

  const response = await fetch(url, { headers: authHeaders(githubToken) });
  if (!response.ok) {
    await throwFromResponse(response, `Failed to fetch inbox: ${response.status}`);
  }
  return (await response.json()) as GetInboxResponse;
}

export async function getInboxUnreadCount(githubToken: string): Promise<number> {
  const response = await fetch(`${API_BASE}/inbox/unread-count`, {
    headers: authHeaders(githubToken),
  });
  if (!response.ok) {
    await throwFromResponse(
      response,
      `Failed to fetch inbox unread count: ${response.status}`,
    );
  }
  const body = (await response.json()) as UnreadCountResponse;
  return body.count;
}

export async function markInboxRead(
  trailId: string,
  githubToken: string,
): Promise<MarkReadResponse> {
  const response = await fetch(
    `${API_BASE}/inbox/${encodeURIComponent(trailId)}/read`,
    {
      method: 'POST',
      headers: authHeaders(githubToken),
    },
  );
  if (!response.ok) {
    await throwFromResponse(
      response,
      `Failed to mark inbox entry read: ${response.status}`,
    );
  }
  return (await response.json()) as MarkReadResponse;
}

export async function markInboxReadAll(
  githubToken: string,
): Promise<ReadAllResponse> {
  const response = await fetch(`${API_BASE}/inbox/read-all`, {
    method: 'POST',
    headers: authHeaders(githubToken),
  });
  if (!response.ok) {
    await throwFromResponse(
      response,
      `Failed to mark inbox read-all: ${response.status}`,
    );
  }
  return (await response.json()) as ReadAllResponse;
}

export async function deleteInboxEntry(
  trailId: string,
  githubToken: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/inbox/${encodeURIComponent(trailId)}`,
    {
      method: 'DELETE',
      headers: authHeaders(githubToken),
    },
  );
  if (!response.ok && response.status !== 204) {
    await throwFromResponse(
      response,
      `Failed to delete inbox entry: ${response.status}`,
    );
  }
}

// ============================================================================
// Recently visited
// ============================================================================

/**
 * One trail in the signed-in user's "recently visited" manifest. Populated
 * by `recordTrailVisit` on every open. Shape mirrors
 * `TrailRecentlyVisitedEntry` in web-ade — kept local so we don't drag the
 * full lib/trails/types surface across the wire.
 */
export interface TrailRecentlyVisitedEntry {
  id: string;
  title: string;
  owner: string;
  repo: string;
  /** The trail's own updatedAt at visit time. */
  updatedAt: string;
  /** ISO 8601 — when this user last opened the trail. */
  lastVisitedAt: string;
  visitCount: number;
  /** Creator's GitHub login, optional (visits route doesn't always know). */
  createdByLogin?: string;
}

interface ListRecentlyVisitedResponse {
  entries: TrailRecentlyVisitedEntry[];
}

/**
 * Per-user "recently visited" listing. The route is intentionally
 * unauthenticated server-side (each trail self-gates on read), so the
 * token is forwarded only when present for parity with other reads.
 */
export async function getRecentlyVisited(
  githubId: number,
  githubToken?: string,
): Promise<TrailRecentlyVisitedEntry[]> {
  const url = `${API_BASE}/recently-visited/by-user/${encodeURIComponent(
    String(githubId),
  )}`;
  const response = await fetch(url, {
    headers: githubToken ? authHeaders(githubToken) : undefined,
  });
  if (!response.ok) {
    await throwFromResponse(
      response,
      `Failed to list recently-visited trails: ${response.status}`,
    );
  }
  const body = (await response.json()) as ListRecentlyVisitedResponse;
  return body.entries;
}

/**
 * Record a trail open for the signed-in user — fire-and-forget on the
 * detail screen. The server idempotently upserts the entry in the
 * per-user manifest so the next `getRecentlyVisited` reflects this visit.
 */
export async function recordTrailVisit(
  trailId: string,
  githubToken: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/by-id/${encodeURIComponent(trailId)}/visits`,
    {
      method: 'POST',
      headers: authHeaders(githubToken),
    },
  );
  if (!response.ok) {
    await throwFromResponse(
      response,
      `Failed to record visit: ${response.status}`,
    );
  }
}

// ============================================================================
// Notes — create / edit / delete
// ============================================================================

/**
 * Create a note on a trail. The server stamps `author` from the
 * authenticated user (ignoring any `author` in the draft) and fills
 * id/createdAt/updatedAt, returning the persisted `TrailNote`.
 */
export async function createNote(
  trailId: string,
  githubToken: string,
  draft: TrailNoteDraft,
): Promise<TrailNote> {
  const response = await fetch(
    `${API_BASE}/by-id/${encodeURIComponent(trailId)}/notes`,
    {
      method: 'POST',
      headers: jsonHeaders(githubToken),
      body: JSON.stringify(draft),
    },
  );
  if (!response.ok) {
    await throwFromResponse(response, `Failed to create note: ${response.status}`);
  }
  const body = (await response.json()) as { note: TrailNote };
  return body.note;
}

/** Edit a note's body. Author-only on the server. */
export async function updateNote(
  trailId: string,
  noteId: string,
  githubToken: string,
  noteBody: string,
): Promise<TrailNote> {
  const response = await fetch(
    `${API_BASE}/by-id/${encodeURIComponent(trailId)}/notes/${encodeURIComponent(noteId)}`,
    {
      method: 'PATCH',
      headers: jsonHeaders(githubToken),
      body: JSON.stringify({ body: noteBody }),
    },
  );
  if (!response.ok) {
    await throwFromResponse(response, `Failed to update note: ${response.status}`);
  }
  const body = (await response.json()) as { note: TrailNote };
  return body.note;
}

/** Delete a note. Allowed for the note's author or the trail owner. */
export async function deleteNote(
  trailId: string,
  noteId: string,
  githubToken: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/by-id/${encodeURIComponent(trailId)}/notes/${encodeURIComponent(noteId)}`,
    {
      method: 'DELETE',
      headers: authHeaders(githubToken),
    },
  );
  if (!response.ok && response.status !== 204) {
    await throwFromResponse(response, `Failed to delete note: ${response.status}`);
  }
}

// Re-export the entry type so callers can `import type { InboxIndexEntry }`
// from this module without reaching into /types — matches the
// CollectionsService pattern.
export type { InboxIndexEntry };
