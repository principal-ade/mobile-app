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

/**
 * Server-derived notification state for an inbox row. Computed by web-ade
 * (`deriveInboxNotification` in `src/lib/trails/notifications.ts`) so the dot
 * and "(N new)" badge stay consistent across clients — render this, don't
 * re-derive. Absent on pre-feature responses. Mirrors web-ade.
 */
export interface InboxNotification {
  /** Whether to show the attention dot. */
  dot: boolean;
  /** Trail itself never opened (drives "whole row accented" vs just "(N new)"). */
  unread: boolean;
  /** Total notes on the trail. */
  noteCount: number;
  /** Notes added since the recipient last looked — the "(N new)" count. */
  newNoteCount: number;
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
   * Count of notes the recipient had seen the last time they opened the
   * trail (mark-read). Watermark for the "(N new)" badge: new notes are
   * `max(0, snapshot.noteCount - notesSeenCount)`. Absent on entries created
   * before notification states shipped — treat as 0.
   */
  notesSeenCount?: number;
  /**
   * Snapshot of the live trail entry at send-time. Lets the list render
   * without per-row fan-out; refreshed lazily by the server when the
   * recipient lists their inbox after the live trail has advanced.
   */
  snapshot: SharedTrailIndexEntry;
  /** Server-derived dot / new-note state; absent on pre-feature responses. */
  notification?: InboxNotification;
  owner: string;
  repo: string;
}

/** A recipient on a sent (outbox) entry, captured at send-time. */
export interface OutboxRecipient {
  githubId: number;
  githubLogin: string;
}

/**
 * Sender-side mirror of {@link InboxIndexEntry}. One row per trail the user
 * has sent; resends merge new recipients into the same row and refresh
 * `sentAt`. There is no read-state here — it's the sender's own list — so no
 * `readAt` / `notesSeenCount` / `notification`. Mirrors web-ade's
 * `OutboxIndexEntry`. See `mobile-app/docs/TRAILS_API.md`.
 */
export interface OutboxIndexEntry {
  /** Trail id — foreign key into `/api/trails/by-id/{id}`. */
  trailId: string;
  /** Everyone this trail has been sent to, deduped + merged across resends. */
  recipients: OutboxRecipient[];
  /** Sender note from the most recent send. */
  comment?: string;
  /** ISO 8601 — most recent send/resend time. */
  sentAt: string;
  /** Snapshot of the live trail entry, patched lazily by the server on read. */
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

export interface GetSentResponse {
  entries: OutboxIndexEntry[];
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
