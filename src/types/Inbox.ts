/**
 * Inbox types — recipient-side delivery layer for shared trails.
 *
 * Mirrors `web-ade/src/lib/trails/types.ts` (InboxIndexEntry, etc.). The
 * trail itself stays in the existing repo-centric `/api/trails/{owner}/{repo}`
 * store; the inbox is a thin indirection so a recipient can list trails
 * shared *with* them without scanning every repo they have access to.
 *
 * Keep this in lock-step with the web copy — drift makes the round-trip
 * harder to debug. See `mobile-app/docs/TRAILS_API.md` §4 for the full
 * contract.
 */

import type { BaseTrailIndexEntry } from './Trail';

/**
 * Web-side index entry shape, extended with sharer identity and the
 * rename-stable GitHub repo id backstop. This is what
 * `GET /api/trails/{owner}/{repo}` returns, and what gets snapshotted
 * onto each `InboxIndexEntry` at send-time.
 */
export interface SharedTrailIndexEntry extends BaseTrailIndexEntry {
  createdBy: { githubId: number; githubLogin: string };
  githubRepoId: number;
}

export interface InboxIndexEntry {
  /** Trail id — foreign key into `/api/trails/by-id/{id}`. */
  trailId: string;
  /** Sender identity at send-time. */
  sender: { githubId: number; githubLogin: string };
  /** Sender note ("why I'm sharing this"). */
  comment?: string;
  /** ISO 8601 — server-stamped on send; refreshed on resend. */
  sentAt: string;
  /** ISO 8601 — server-stamped when the recipient marks the entry read. */
  readAt: string | null;
  /**
   * Snapshot of the live trail entry at send-time. Lets the list render
   * without per-row fan-out; refreshed lazily by the server when the
   * recipient lists their inbox after the live trail has advanced.
   */
  snapshot: SharedTrailIndexEntry;
  owner: string;
  repo: string;
}

// ============================================================================
// API envelopes — match the web-ade route returns exactly
// ============================================================================

export interface GetInboxResponse {
  entries: InboxIndexEntry[];
  /** Total unread across the whole inbox — ignores filters/pagination. */
  unreadCount: number;
  /** Opaque continuation token; present only when more pages remain. */
  cursor?: string;
}

export interface UnreadCountResponse {
  count: number;
}

export interface MarkReadResponse {
  readAt: string;
}

export interface ReadAllResponse {
  marked: number;
}

export interface SendTrailRequest {
  recipients: string[];
  comment?: string;
}

export interface SendTrailResponse {
  delivered: Array<{ login: string; githubId: number }>;
  failed: Array<{
    login: string;
    reason: 'unknown_user' | 'invalid_login';
  }>;
}

// ============================================================================
// Error code mirror — keeps mobile in sync with the server's ShareErrorCodes
// ============================================================================

export const ShareErrorCodes = {
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  NO_REPO_ACCESS: 'NO_REPO_ACCESS',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNKNOWN_RECIPIENT: 'UNKNOWN_RECIPIENT',
  TOO_MANY_RECIPIENTS: 'TOO_MANY_RECIPIENTS',
  RECIPIENTS_REQUIRED: 'RECIPIENTS_REQUIRED',
  COMMENT_TOO_LONG: 'COMMENT_TOO_LONG',
  INBOX_NOT_FOUND: 'INBOX_NOT_FOUND',
} as const;

export type ShareErrorCode =
  (typeof ShareErrorCodes)[keyof typeof ShareErrorCodes];
