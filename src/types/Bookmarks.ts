/**
 * Bookmarks types — per-user bookmarked topics and trails.
 *
 * Mirrors `web-ade/src/lib/bookmarks/types.ts`. The Bookmarked tab is a thin
 * indirection on top of the existing topics and trails surfaces: the by-id
 * record stays put; a per-user bookmark index points at the ids and carries a
 * snapshot so the list renders without fanning out.
 *
 * Keep this in lock-step with the web copy — drift makes the round-trip
 * harder to debug. See `mobile-app/docs/BOOKMARKED_TOPICS_TRAILS_API.md` for
 * the full contract.
 */

import type { SharedTrailIndexEntry } from './Inbox';

// ============================================================================
// Snapshots
// ============================================================================

/**
 * Slim summary of a topic captured at bookmark-time so the list renders without
 * a per-row fetch. Mirrors `TopicByUserEntry` on the server — the same row
 * shape the "my topics" manifest uses.
 */
export interface TopicByUserEntry {
  id: string;
  title: string;
  /** First ~140 chars of `description`, plaintext, for card previews. */
  descriptionPreview: string;
  trailCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Index entries
// ============================================================================

export interface BookmarkedTopicEntry {
  /** Foreign key into `topics/_by-id/{id}.json`. */
  topicId: string;
  /** ISO 8601 — server-stamped on bookmark; refreshed on re-bookmark. */
  bookmarkedAt: string;
  /**
   * Captured at bookmark-time. Refreshed lazily on detail open, never on list
   * read.
   */
  snapshot: TopicByUserEntry;
  /**
   * Server-set on GET responses only — never persisted. `true` when the
   * underlying topic 404s at read time; mobile should render the row with
   * a "no longer available" affordance.
   */
  gone?: true;
}

export interface BookmarkedTrailEntry {
  /** Foreign key into `trails/_by-id/{id}.json`. */
  trailId: string;
  /** ISO 8601 — server-stamped on bookmark; refreshed on re-bookmark. */
  bookmarkedAt: string;
  /** Resolved owner/repo for the trail — duplicated from the by-id pointer. */
  owner: string;
  repo: string;
  /**
   * Captured at bookmark-time. Refreshed lazily on detail open, never on list
   * read.
   */
  snapshot: SharedTrailIndexEntry;
  /** Server-set on GET responses only — see `BookmarkedTopicEntry.gone`. */
  gone?: true;
}

// ============================================================================
// Response envelopes — match the web-ade route returns exactly
// ============================================================================

export interface ListBookmarkedTopicsResponse {
  entries: BookmarkedTopicEntry[];
}

export interface ListBookmarkedTrailsResponse {
  entries: BookmarkedTrailEntry[];
}

export interface BookmarkTopicResponse {
  entry: BookmarkedTopicEntry;
  /** Advisory codes; omitted when empty. See `BookmarkWarningCodes`. */
  warnings?: string[];
}

export interface BookmarkTrailResponse {
  entry: BookmarkedTrailEntry;
  warnings?: string[];
}

// ============================================================================
// Error and warning codes
// ============================================================================

export const BookmarkErrorCodes = {
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  NOT_FOUND: 'NOT_FOUND',
  NO_REPO_ACCESS: 'NO_REPO_ACCESS',
} as const;

export type BookmarkErrorCode = (typeof BookmarkErrorCodes)[keyof typeof BookmarkErrorCodes];

/**
 * Advisory codes attached to a 200 response via `warnings: string[]`. Never
 * raised as errors. `BOOKMARK_LIMIT_REACHED` means the 500-entry cap was hit
 * and the oldest entry was pruned to make room — the bookmark itself succeeded.
 */
export const BookmarkWarningCodes = {
  BOOKMARK_LIMIT_REACHED: 'BOOKMARK_LIMIT_REACHED',
} as const;

export type BookmarkWarningCode =
  (typeof BookmarkWarningCodes)[keyof typeof BookmarkWarningCodes];
