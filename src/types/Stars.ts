/**
 * Stars types — per-user starred topics and trails.
 *
 * Mirrors `web-ade/src/lib/stars/types.ts`. The Starred tab is a thin
 * indirection on top of the existing topics and trails surfaces: the by-id
 * record stays put; a per-user star index points at the ids and carries a
 * snapshot so the list renders without fanning out.
 *
 * Keep this in lock-step with the web copy — drift makes the round-trip
 * harder to debug. See `mobile-app/docs/STARRED_TOPICS_TRAILS_API.md` for
 * the full contract.
 */

import type { SharedTrailIndexEntry } from './Inbox';

// ============================================================================
// Snapshots
// ============================================================================

/**
 * Slim summary of a topic captured at star-time so the list renders without
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

export interface StarredTopicEntry {
  /** Foreign key into `topics/_by-id/{id}.json`. */
  topicId: string;
  /** ISO 8601 — server-stamped on star; refreshed on re-star. */
  starredAt: string;
  /**
   * Captured at star-time. Refreshed lazily on detail open, never on list
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

export interface StarredTrailEntry {
  /** Foreign key into `trails/_by-id/{id}.json`. */
  trailId: string;
  /** ISO 8601 — server-stamped on star; refreshed on re-star. */
  starredAt: string;
  /** Resolved owner/repo for the trail — duplicated from the by-id pointer. */
  owner: string;
  repo: string;
  /**
   * Captured at star-time. Refreshed lazily on detail open, never on list
   * read.
   */
  snapshot: SharedTrailIndexEntry;
  /** Server-set on GET responses only — see `StarredTopicEntry.gone`. */
  gone?: true;
}

// ============================================================================
// Response envelopes — match the web-ade route returns exactly
// ============================================================================

export interface ListStarredTopicsResponse {
  entries: StarredTopicEntry[];
}

export interface ListStarredTrailsResponse {
  entries: StarredTrailEntry[];
}

export interface StarTopicResponse {
  entry: StarredTopicEntry;
  /** Advisory codes; omitted when empty. See `StarWarningCodes`. */
  warnings?: string[];
}

export interface StarTrailResponse {
  entry: StarredTrailEntry;
  warnings?: string[];
}

// ============================================================================
// Error and warning codes
// ============================================================================

export const StarErrorCodes = {
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  NOT_FOUND: 'NOT_FOUND',
  NO_REPO_ACCESS: 'NO_REPO_ACCESS',
} as const;

export type StarErrorCode = (typeof StarErrorCodes)[keyof typeof StarErrorCodes];

/**
 * Advisory codes attached to a 200 response via `warnings: string[]`. Never
 * raised as errors. `STAR_LIMIT_REACHED` means the 500-entry cap was hit
 * and the oldest entry was pruned to make room — the star itself succeeded.
 */
export const StarWarningCodes = {
  STAR_LIMIT_REACHED: 'STAR_LIMIT_REACHED',
} as const;

export type StarWarningCode =
  (typeof StarWarningCodes)[keyof typeof StarWarningCodes];
