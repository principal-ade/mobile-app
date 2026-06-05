/**
 * Bookmarks API service — thin fetch wrappers over the web-ade bookmarked routes.
 *
 * Mirrors `TrailsApiService.ts` in shape. Three pairs of routes:
 *
 *   getBookmarkedTopics / bookmarkTopic / removeBookmarkTopic
 *   getBookmarkedTrails / bookmarkTrail / removeBookmarkTrail
 *
 * Bookmark/removeBookmark are idempotent. `bookmarkTrail` requires repo access (the server
 * gates against the trail's `(owner, repo)`); `removeBookmarkTrail` does not, so
 * losing access never strands an entry in the user's index.
 *
 * Snapshot freshness is handled server-side: snapshots in the list response
 * are exactly as stored, refreshed lazily by the detail-fetch path when the
 * user opens an item. Mobile doesn't need to do anything special.
 *
 * See `mobile-app/docs/BOOKMARKED_TOPICS_TRAILS_API.md` for the full surface.
 */

import { apiConfig } from '../utils/config';
import type {
  ListBookmarkedTopicsResponse,
  ListBookmarkedTrailsResponse,
  BookmarkTopicResponse,
  BookmarkTrailResponse,
  BookmarkedTopicEntry,
  BookmarkedTrailEntry,
} from '../types/Bookmarks';

const TOPICS_BASE = `${apiConfig.baseUrl}/topics`;
const TRAILS_BASE = `${apiConfig.baseUrl}/trails`;

// ============================================================================
// Error handling
// ============================================================================

interface ErrorBody {
  error?: string;
  code?: string;
}

export class BookmarksApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string | null,
  ) {
    super(message);
    this.name = 'BookmarksApiError';
  }
}

async function throwFromResponse(
  response: Response,
  fallback: string,
): Promise<never> {
  let body: ErrorBody = {};
  try {
    body = (await response.json()) as ErrorBody;
  } catch {
    // Non-JSON error — fall back to the canned message.
  }
  throw new BookmarksApiError(
    body.error || fallback,
    response.status,
    body.code ?? null,
  );
}

function authHeaders(githubToken: string): HeadersInit {
  return { Authorization: `Bearer ${githubToken}` };
}

// ============================================================================
// Bookmarked topics
// ============================================================================

export async function getBookmarkedTopics(
  githubToken: string,
): Promise<BookmarkedTopicEntry[]> {
  const response = await fetch(`${TOPICS_BASE}/bookmarks`, {
    headers: authHeaders(githubToken),
  });
  if (!response.ok) {
    await throwFromResponse(
      response,
      `Failed to list bookmarked topics: ${response.status}`,
    );
  }
  const body = (await response.json()) as ListBookmarkedTopicsResponse;
  return body.entries;
}

export async function bookmarkTopic(
  topicId: string,
  githubToken: string,
): Promise<BookmarkTopicResponse> {
  const response = await fetch(
    `${TOPICS_BASE}/by-id/${encodeURIComponent(topicId)}/bookmark`,
    { method: 'POST', headers: authHeaders(githubToken) },
  );
  if (!response.ok) {
    await throwFromResponse(
      response,
      `Failed to bookmark topic: ${response.status}`,
    );
  }
  return (await response.json()) as BookmarkTopicResponse;
}

export async function removeBookmarkTopic(
  topicId: string,
  githubToken: string,
): Promise<void> {
  const response = await fetch(
    `${TOPICS_BASE}/by-id/${encodeURIComponent(topicId)}/bookmark`,
    { method: 'DELETE', headers: authHeaders(githubToken) },
  );
  if (!response.ok && response.status !== 204) {
    await throwFromResponse(
      response,
      `Failed to removeBookmark topic: ${response.status}`,
    );
  }
}

// ============================================================================
// Bookmarked trails
// ============================================================================

export async function getBookmarkedTrails(
  githubToken: string,
): Promise<BookmarkedTrailEntry[]> {
  const response = await fetch(`${TRAILS_BASE}/bookmarks`, {
    headers: authHeaders(githubToken),
  });
  if (!response.ok) {
    await throwFromResponse(
      response,
      `Failed to list bookmarked trails: ${response.status}`,
    );
  }
  const body = (await response.json()) as ListBookmarkedTrailsResponse;
  return body.entries;
}

export async function bookmarkTrail(
  trailId: string,
  githubToken: string,
): Promise<BookmarkTrailResponse> {
  const response = await fetch(
    `${TRAILS_BASE}/by-id/${encodeURIComponent(trailId)}/bookmark`,
    { method: 'POST', headers: authHeaders(githubToken) },
  );
  if (!response.ok) {
    await throwFromResponse(
      response,
      `Failed to bookmark trail: ${response.status}`,
    );
  }
  return (await response.json()) as BookmarkTrailResponse;
}

export async function removeBookmarkTrail(
  trailId: string,
  githubToken: string,
): Promise<void> {
  const response = await fetch(
    `${TRAILS_BASE}/by-id/${encodeURIComponent(trailId)}/bookmark`,
    { method: 'DELETE', headers: authHeaders(githubToken) },
  );
  if (!response.ok && response.status !== 204) {
    await throwFromResponse(
      response,
      `Failed to removeBookmark trail: ${response.status}`,
    );
  }
}
