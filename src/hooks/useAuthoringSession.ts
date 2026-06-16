/**
 * useAuthoringSession — drives the two-phase ask flow.
 *
 * Phase 1 (prepare): `startAuthoringSession` then poll `getAuthoringSession`
 * through queued → importing → preparing → ready. The substrate (Freestyle Git
 * import + VM boot + clone) is built BEFORE the user asks, so the UI can show
 * "Initializing" / "Preparing" and only reveal the question field on `ready`. An
 * import failure lands the session in `failed` here — the user never gets to ask.
 *
 * Phase 2 (ask): `askAuthoringSession` then resume polling through authoring →
 * succeeded|failed. On success `session.trailId` is set (also delivered to the
 * inbox). Leaving mid-ask is safe — the run continues server-side and arrives
 * via the inbox.
 *
 * Client phases (coarser than the server status, which is exposed as `status`
 * for the Initializing-vs-Preparing copy split):
 *   idle       — nothing started
 *   preparing  — POST /sessions + polling queued→importing→preparing
 *   ready      — VM up, question field can be revealed
 *   authoring  — question submitted; polling authoring
 *   succeeded  — terminal; `session.trailId` is set
 *   failed     — terminal; `error` holds a friendly message
 *   timeout    — gave up the ask poll; the trail still arrives via the inbox
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AuthoringApiError,
  askAuthoringSession,
  getAuthoringSession,
  startAuthoringSession,
} from '../services/AuthoringApiService';
import {
  isTerminalSessionStatus,
  type AuthoringErrorCode,
  type AuthoringSession,
  type AuthoringSessionRequest,
  type AuthoringSessionStatus,
} from '../types/Authoring';

export type SessionPhase =
  | 'idle'
  | 'preparing'
  | 'ready'
  | 'authoring'
  | 'succeeded'
  | 'failed'
  | 'timeout';

/** Poll cadence — work takes tens of seconds, so 3s steady is plenty. */
const POLL_INTERVAL_MS = 3000;
/**
 * Give up the prepare poll after ~8 min. Import + VM boot + clone-with-retry can
 * be slow (and the github→freestyle import populates asynchronously). Past this
 * something's wedged — surface a retry rather than spinning forever.
 */
const PREPARE_GIVE_UP_MS = 8 * 60 * 1000;
/**
 * Give up the ask poll after ~5 min; the inbox still delivers. Real authoring
 * runs measure ~2–4 min, so 5 min resolves most in-session while bounding the
 * "working…" state.
 */
const ASK_GIVE_UP_MS = 5 * 60 * 1000;

/** Map a failure to a friendly, user-facing line. */
function friendlyError(
  code: AuthoringErrorCode | string | null,
  fallback: string,
): string {
  switch (code) {
    case 'AGENT_NO_EMIT':
      return "Couldn't build a trail for that question — try rephrasing.";
    case 'VALIDATION_FAILED':
      return "The trail the agent produced didn't line up with the code — try rephrasing.";
    case 'REPO_RESOLVE_FAILED':
      return "Couldn't resolve that repository or branch.";
    case 'PUBLISH_FAILED':
      return 'The trail was authored but failed to publish. Please try again.';
    case 'UNAVAILABLE':
      return 'Trail authoring is temporarily unavailable — please try again shortly.';
    case 'TIMEOUT':
      return "Taking longer than expected — we'll drop it in your inbox when it's ready.";
    case 'NO_REPO_ACCESS':
      return "You don't have access to that repository.";
    case 'NOT_AUTHENTICATED':
      return 'Please sign in again to ask a question.';
    case 'INVALID_REQUEST':
      return 'Please enter a question first.';
    default:
      return fallback;
  }
}

export interface UseAuthoringSessionResult {
  phase: SessionPhase;
  /** Raw server status (e.g. importing vs preparing) for fine-grained copy. */
  status: AuthoringSessionStatus | null;
  /** The latest session record (null until the 202 lands). */
  session: AuthoringSession | null;
  /** Friendly message when `phase === 'failed'`, else null. */
  error: string | null;
  /** True while preparing the substrate (no question field yet). */
  isPreparing: boolean;
  /** True once the substrate is ready and a question can be asked. */
  isReady: boolean;
  /** True while authoring a submitted question. */
  isAuthoring: boolean;
  /** Begin preparing a session for the given repo. No-op if already underway. */
  prepare: (request: AuthoringSessionRequest) => void;
  /** Submit the question once `ready`. No-op otherwise. */
  ask: (question: string) => void;
  /** Reset back to idle (clears state and stops polling). */
  reset: () => void;
}

export function useAuthoringSession(
  githubToken: string | null,
): UseAuthoringSessionResult {
  const [phase, setPhase] = useState<SessionPhase>('idle');
  const [session, setSession] = useState<AuthoringSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const giveUpRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (giveUpRef.current) {
      clearTimeout(giveUpRef.current);
      giveUpRef.current = null;
    }
  }, []);

  // Stop polling on unmount; prepare/ask continue server-side regardless.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimers();
    };
  }, [clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    sessionIdRef.current = null;
    setPhase('idle');
    setSession(null);
    setError(null);
  }, [clearTimers]);

  const fail = useCallback(
    (code: AuthoringErrorCode | string | null, fallback: string) => {
      clearTimers();
      setPhase('failed');
      setError(friendlyError(code, fallback));
    },
    [clearTimers],
  );

  // Apply a freshly-fetched session, transitioning client phase off its status.
  // `onReady` lets the caller stop polling (prepare) vs. keep polling (ask).
  const applySession = useCallback(
    (next: AuthoringSession) => {
      if (!mountedRef.current) return;
      setSession(next);
      switch (next.status) {
        case 'ready':
          clearTimers(); // idle until the user asks — no need to keep polling
          setPhase('ready');
          break;
        case 'authoring':
          setPhase('authoring');
          break;
        case 'succeeded':
          clearTimers();
          setPhase('succeeded');
          break;
        case 'failed':
          fail(
            next.error?.code ?? null,
            next.error?.message ?? 'The session failed. Please try again.',
          );
          break;
        case 'expired':
          fail('UNAVAILABLE', 'This session expired — please start again.');
          break;
        default:
          // queued | importing | preparing
          setPhase('preparing');
      }
    },
    [clearTimers, fail],
  );

  // One poll tick against the shared GET endpoint.
  const poll = useCallback(async () => {
    const id = sessionIdRef.current;
    if (!id || !githubToken) return;
    try {
      const next = await getAuthoringSession(githubToken, id);
      applySession(next);
    } catch (err) {
      // Transient poll errors are non-fatal — the give-up timer is the backstop.
      // Only a hard auth/not-found aborts.
      if (
        err instanceof AuthoringApiError &&
        (err.status === 401 || err.status === 404)
      ) {
        fail(err.code, err.message);
      }
    }
  }, [githubToken, applySession, fail]);

  const beginPolling = useCallback(
    (giveUpMs: number, onGiveUp: () => void) => {
      clearTimers();
      intervalRef.current = setInterval(() => {
        void poll();
      }, POLL_INTERVAL_MS);
      giveUpRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        clearTimers();
        onGiveUp();
      }, giveUpMs);
    },
    [clearTimers, poll],
  );

  const prepare = useCallback(
    (request: AuthoringSessionRequest) => {
      if (!githubToken) {
        fail('NOT_AUTHENTICATED', 'Please sign in to ask a question.');
        return;
      }
      // Ignore re-entrant prepares while one is already underway.
      if (sessionIdRef.current || phase === 'preparing') return;

      clearTimers();
      setError(null);
      setSession(null);
      setPhase('preparing');

      (async () => {
        try {
          const created = await startAuthoringSession(githubToken, request);
          if (!mountedRef.current) return;
          sessionIdRef.current = created.sessionId;
          applySession(created);
          if (isTerminalSessionStatus(created.status) || created.status === 'ready') {
            return; // already resolved (unusual) — applySession handled it
          }
          beginPolling(PREPARE_GIVE_UP_MS, () =>
            fail('TIMEOUT', 'Preparing took too long — please try again.'),
          );
        } catch (err) {
          if (!mountedRef.current) return;
          const message =
            err instanceof AuthoringApiError
              ? friendlyError(err.code, err.message)
              : err instanceof Error
                ? err.message
                : 'Failed to prepare the session.';
          setPhase('failed');
          setError(message);
        }
      })();
    },
    [githubToken, phase, clearTimers, applySession, beginPolling, fail],
  );

  const ask = useCallback(
    (question: string) => {
      const id = sessionIdRef.current;
      const trimmed = question.trim();
      if (!githubToken || !id || phase !== 'ready' || !trimmed) return;

      clearTimers();
      setError(null);
      setPhase('authoring');

      (async () => {
        try {
          const updated = await askAuthoringSession(githubToken, id, trimmed);
          if (!mountedRef.current) return;
          applySession(updated);
          if (isTerminalSessionStatus(updated.status)) return;
          beginPolling(ASK_GIVE_UP_MS, () => {
            setPhase('timeout');
          });
        } catch (err) {
          if (!mountedRef.current) return;
          const message =
            err instanceof AuthoringApiError
              ? friendlyError(err.code, err.message)
              : err instanceof Error
                ? err.message
                : 'Failed to submit the question.';
          setPhase('failed');
          setError(message);
        }
      })();
    },
    [githubToken, phase, clearTimers, applySession, beginPolling],
  );

  return {
    phase,
    status: session?.status ?? null,
    session,
    error,
    isPreparing: phase === 'preparing',
    isReady: phase === 'ready',
    isAuthoring: phase === 'authoring',
    prepare,
    ask,
    reset,
  };
}
