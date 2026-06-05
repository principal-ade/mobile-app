/**
 * Topics API service — thin fetch wrappers over the web-ade topic routes.
 *
 * v1 scope is read + bookmark (bookmark/removeBookmark already live in `BookmarksApiService`).
 * Owner mutations (PATCH title/description, add/remove trails, suggestions,
 * comments) are intentionally out of scope until the mobile detail screen
 * grows beyond a viewer.
 *
 * Shape mirrors `TrailsApiService` — same error class pattern, same auth
 * header helper, same envelope-typed return.
 */

import { apiConfig } from '../utils/config';
import type { GetTopicResponse } from '../types/Topic';

const API_BASE = `${apiConfig.baseUrl}/topics`;

interface ErrorBody {
  error?: string;
  code?: string;
}

export class TopicsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string | null,
  ) {
    super(message);
    this.name = 'TopicsApiError';
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
  throw new TopicsApiError(
    body.error || fallback,
    response.status,
    body.code ?? null,
  );
}

function authHeaders(githubToken: string): HeadersInit {
  return { Authorization: `Bearer ${githubToken}` };
}

/**
 * Resolve `/topic/{id}` — public-by-link read. When called with a token,
 * the server also returns `bookmarked` so the header toggle can render in
 * its correct state without a second fetch.
 */
export async function getTopicById(
  id: string,
  githubToken?: string,
): Promise<GetTopicResponse> {
  const response = await fetch(
    `${API_BASE}/by-id/${encodeURIComponent(id)}`,
    { headers: githubToken ? authHeaders(githubToken) : undefined },
  );
  if (!response.ok) {
    await throwFromResponse(
      response,
      `Failed to fetch topic: ${response.status}`,
    );
  }
  return (await response.json()) as GetTopicResponse;
}
