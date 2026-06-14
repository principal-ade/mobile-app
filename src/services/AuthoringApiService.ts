/**
 * Authoring API service — thin fetch wrappers over the web-ade
 * `/api/authoring/*` routes (Stage 4).
 *
 * Mirrors `TrailsApiService.ts` in shape: same `authHeaders`/`jsonHeaders`, same
 * `throwFromResponse` → a typed `AuthoringApiError` carrying `status` + `code`.
 *
 * The full contract lives in `mobile-app/docs/AUTHORING_API.md`. The flow:
 * `startAuthoringRun` → `202` with a `runId` → poll `getAuthoringRun` until a
 * terminal state. On success the resulting trail is also delivered to the
 * caller's inbox (existing `getInbox` machinery), and rendered via the existing
 * `getTrailById` → `TrailDetailScreen` path.
 *
 * Auth: the user's GitHub Bearer token doubles as the authoring identity — the
 * server uses it to gate repo read-access, check out the repo, and publish, so a
 * run can only target a repo the signed-in user can read.
 */

import { apiConfig } from '../utils/config';
import type { AuthoringRun, AuthoringRunRequest } from '../types/Authoring';

const API_BASE = `${apiConfig.baseUrl}/authoring`;

// ============================================================================
// Error handling
// ============================================================================

interface ErrorBody {
  error?: string;
  code?: string;
}

export class AuthoringApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string | null,
  ) {
    super(message);
    this.name = 'AuthoringApiError';
  }
}

async function throwFromResponse(response: Response, fallback: string): Promise<never> {
  let body: ErrorBody = {};
  try {
    body = (await response.json()) as ErrorBody;
  } catch {
    // Server returned a non-JSON error (e.g. from middleware) — fall back to
    // the canned message.
  }
  throw new AuthoringApiError(
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
// Runs
// ============================================================================

/**
 * Start an authoring run. Returns the `202`-accepted run record (status
 * `queued`); the real work happens server-side — poll {@link getAuthoringRun}
 * for completion. Fails fast with `403 NO_REPO_ACCESS` if the signed-in user
 * can't read the target repo, or `400 INVALID_REQUEST` for a blank question.
 */
export async function startAuthoringRun(
  githubToken: string,
  body: AuthoringRunRequest,
): Promise<AuthoringRun> {
  const response = await fetch(`${API_BASE}/runs`, {
    method: 'POST',
    headers: jsonHeaders(githubToken),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    await throwFromResponse(response, `Failed to start run: ${response.status}`);
  }
  return (await response.json()) as AuthoringRun;
}

/**
 * Poll a single run. Owned by its creator (gated on the token identity);
 * `404` for unknown runs or runs the caller didn't create.
 */
export async function getAuthoringRun(
  githubToken: string,
  runId: string,
): Promise<AuthoringRun> {
  const response = await fetch(
    `${API_BASE}/runs/${encodeURIComponent(runId)}`,
    {
      headers: authHeaders(githubToken),
    },
  );
  if (!response.ok) {
    await throwFromResponse(response, `Failed to fetch run: ${response.status}`);
  }
  return (await response.json()) as AuthoringRun;
}
