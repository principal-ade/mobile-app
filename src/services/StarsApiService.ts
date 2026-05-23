/**
 * Stars API service — thin fetch wrappers over the web-ade starred routes.
 *
 * Mirrors `TrailsApiService.ts` in shape. Three pairs of routes:
 *
 *   getStarredTopics / starTopic / unstarTopic
 *   getStarredTrails / starTrail / unstarTrail
 *
 * Star/unstar are idempotent. `starTrail` requires repo access (the server
 * gates against the trail's `(owner, repo)`); `unstarTrail` does not, so
 * losing access never strands an entry in the user's index.
 *
 * Snapshot freshness is handled server-side: snapshots in the list response
 * are exactly as stored, refreshed lazily by the detail-fetch path when the
 * user opens an item. Mobile doesn't need to do anything special.
 *
 * See `mobile-app/docs/STARRED_TOPICS_TRAILS_API.md` for the full surface.
 */

import { apiConfig } from '../utils/config';
import type {
  ListStarredTopicsResponse,
  ListStarredTrailsResponse,
  StarTopicResponse,
  StarTrailResponse,
  StarredTopicEntry,
  StarredTrailEntry,
} from '../types/Stars';

const TOPICS_BASE = `${apiConfig.baseUrl}/topics`;
const TRAILS_BASE = `${apiConfig.baseUrl}/trails`;

// ============================================================================
// Error handling
// ============================================================================

interface ErrorBody {
  error?: string;
  code?: string;
}

export class StarsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string | null,
  ) {
    super(message);
    this.name = 'StarsApiError';
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
  throw new StarsApiError(
    body.error || fallback,
    response.status,
    body.code ?? null,
  );
}

function authHeaders(githubToken: string): HeadersInit {
  return { Authorization: `Bearer ${githubToken}` };
}

// ============================================================================
// Starred topics
// ============================================================================

export async function getStarredTopics(
  githubToken: string,
): Promise<StarredTopicEntry[]> {
  const response = await fetch(`${TOPICS_BASE}/starred`, {
    headers: authHeaders(githubToken),
  });
  if (!response.ok) {
    await throwFromResponse(
      response,
      `Failed to list starred topics: ${response.status}`,
    );
  }
  const body = (await response.json()) as ListStarredTopicsResponse;
  return body.entries;
}

export async function starTopic(
  topicId: string,
  githubToken: string,
): Promise<StarTopicResponse> {
  const response = await fetch(
    `${TOPICS_BASE}/by-id/${encodeURIComponent(topicId)}/star`,
    { method: 'POST', headers: authHeaders(githubToken) },
  );
  if (!response.ok) {
    await throwFromResponse(
      response,
      `Failed to star topic: ${response.status}`,
    );
  }
  return (await response.json()) as StarTopicResponse;
}

export async function unstarTopic(
  topicId: string,
  githubToken: string,
): Promise<void> {
  const response = await fetch(
    `${TOPICS_BASE}/by-id/${encodeURIComponent(topicId)}/star`,
    { method: 'DELETE', headers: authHeaders(githubToken) },
  );
  if (!response.ok && response.status !== 204) {
    await throwFromResponse(
      response,
      `Failed to unstar topic: ${response.status}`,
    );
  }
}

// ============================================================================
// Starred trails
// ============================================================================

export async function getStarredTrails(
  githubToken: string,
): Promise<StarredTrailEntry[]> {
  const response = await fetch(`${TRAILS_BASE}/starred`, {
    headers: authHeaders(githubToken),
  });
  if (!response.ok) {
    await throwFromResponse(
      response,
      `Failed to list starred trails: ${response.status}`,
    );
  }
  const body = (await response.json()) as ListStarredTrailsResponse;
  return body.entries;
}

export async function starTrail(
  trailId: string,
  githubToken: string,
): Promise<StarTrailResponse> {
  const response = await fetch(
    `${TRAILS_BASE}/by-id/${encodeURIComponent(trailId)}/star`,
    { method: 'POST', headers: authHeaders(githubToken) },
  );
  if (!response.ok) {
    await throwFromResponse(
      response,
      `Failed to star trail: ${response.status}`,
    );
  }
  return (await response.json()) as StarTrailResponse;
}

export async function unstarTrail(
  trailId: string,
  githubToken: string,
): Promise<void> {
  const response = await fetch(
    `${TRAILS_BASE}/by-id/${encodeURIComponent(trailId)}/star`,
    { method: 'DELETE', headers: authHeaders(githubToken) },
  );
  if (!response.ok && response.status !== 204) {
    await throwFromResponse(
      response,
      `Failed to unstar trail: ${response.status}`,
    );
  }
}
