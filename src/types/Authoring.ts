/**
 * Hosted trail authoring — the "ask a question → get a trail" flow.
 *
 * Mirrors the server contract in `mobile-app/docs/AUTHORING_API.md` (§4) and
 * the web-ade `/api/authoring/*` routes (Stage 4). The user asks a
 * natural-language question about a repo; the server runs an agent in a sandbox
 * that authors a `TrailPayload`, publishes it through the existing
 * `POST /api/trails` path, and delivers the result to the caller's inbox.
 *
 * Authoring is slow and async (VM boot + agent exploration — tens of seconds to
 * a couple of minutes), so the client starts a run and then watches for
 * completion via {@link AuthoringRun.status} polling and/or the inbox.
 */

export type AuthoringRunStatus = 'queued' | 'running' | 'succeeded' | 'failed';

/**
 * Terminal failure codes the server attaches to a `failed` run. Map these to
 * friendly copy in the UI — see `AUTHORING_API.md` §7.
 */
export type AuthoringErrorCode =
  | 'REPO_RESOLVE_FAILED'
  | 'AGENT_NO_EMIT'
  | 'VALIDATION_FAILED'
  | 'PUBLISH_FAILED'
  | 'TIMEOUT'
  // The execution substrate was unreachable / errored (infra failure, not a
  // problem with the question or repo) — the remedy is to retry later.
  | 'UNAVAILABLE';

export interface AuthoringRunRequest {
  owner: string;
  repo: string;
  /** Optional; defaults to the repo's default branch (HEAD) when omitted. */
  ref?: string;
  question: string;
  /**
   * Optional provider/model override (e.g. `openrouter/openai/gpt-oss-120b`).
   * Accepted but not echoed in the response — the server defaults to a free,
   * tool-calling model when omitted.
   */
  model?: string;
}

export interface AuthoringRun {
  runId: string;
  status: AuthoringRunStatus;
  owner: string;
  repo: string;
  ref?: string;
  question: string;
  /** Set when `status === 'succeeded'`. */
  trailId: string | null;
  /** `"/trail/{id}"` when `status === 'succeeded'`. */
  trailUrl: string | null;
  /** Populated when `status === 'failed'`. */
  error: { message: string; code: AuthoringErrorCode } | null;
  createdAt: string;
  updatedAt: string;
}

/** A run in a terminal state — succeeded or failed. */
export function isTerminalStatus(status: AuthoringRunStatus): boolean {
  return status === 'succeeded' || status === 'failed';
}

// ============================================================================
// Repo lists — `GET /api/authoring/repos`
// ============================================================================

/**
 * A repo verified to import cleanly for authoring (the picker's suggested
 * picks). Mirrors `web-ade` `CuratedRepo`. See `AUTHORING_API.md`.
 */
export interface CuratedRepo {
  owner: string;
  repo: string;
  /** Optional ref; default branch when omitted. */
  ref?: string;
  defaultBranch?: string;
  description?: string;
  sizeKb?: number;
  verifiedAt?: string;
}

/**
 * A public repo that has failed to import for authoring. The picker flags these
 * in search results and warns before a repeat attempt.
 */
export interface UnsupportedRepo {
  owner: string;
  repo: string;
  firstFailedAt: string;
  lastFailedAt: string;
  failCount: number;
  lastError: { code: AuthoringErrorCode; message: string };
}

/** Response shape of `GET /api/authoring/repos`. */
export interface AuthoringReposResponse {
  curated: CuratedRepo[];
  unsupported: UnsupportedRepo[];
  /** Server-controlled copy to show when a user picks an unsupported repo. */
  notice: string;
}
