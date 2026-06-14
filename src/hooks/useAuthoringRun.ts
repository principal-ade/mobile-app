/**
 * useAuthoringRun — drives the ask-a-question → get-a-trail state machine.
 *
 * Calls `startAuthoringRun`, then polls `getAuthoringRun` every 3s until the run
 * reaches a terminal state (`succeeded`/`failed`) or we give up after ~3 min
 * (the run keeps going server-side and arrives via the inbox — see
 * `AUTHORING_API.md` §6). Polling is the *in-session progress* path; the inbox
 * is the durable come-back-later path.
 *
 * Phases:
 *   idle      — nothing started
 *   creating  — POST /runs in flight (waiting for the 202)
 *   running   — run accepted; polling queued→running
 *   succeeded — terminal; `run.trailId` is set
 *   failed    — terminal; `error` holds a friendly message
 *   timeout   — we stopped polling after ~3 min; check the inbox
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AuthoringApiError,
  getAuthoringRun,
  startAuthoringRun,
} from '../services/AuthoringApiService';
import {
  isTerminalStatus,
  type AuthoringErrorCode,
  type AuthoringRun,
  type AuthoringRunRequest,
} from '../types/Authoring';

export type AuthoringPhase =
  | 'idle'
  | 'creating'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'timeout';

/** Poll cadence — authoring is tens of seconds, so 3s steady is plenty. */
const POLL_INTERVAL_MS = 3000;
/**
 * Give up the in-session poll after ~5 min; the inbox still delivers. Real runs
 * (VM boot + clone-with-retry + agent exploration) measure ~2–4 min, so 5 min
 * lets most resolve in-session while still bounding the "working…" state.
 */
const POLL_GIVE_UP_MS = 5 * 60 * 1000;

/** Map a failure to a friendly, user-facing line. */
function friendlyError(code: AuthoringErrorCode | string | null, fallback: string): string {
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

export interface UseAuthoringRunResult {
  phase: AuthoringPhase;
  /** The latest run record (null until the 202 lands). */
  run: AuthoringRun | null;
  /** Friendly error message when `phase === 'failed'`, else null. */
  error: string | null;
  /** Convenience: true while creating or running. */
  isBusy: boolean;
  /** Start a run for the given request. No-op while already busy. */
  start: (request: AuthoringRunRequest) => void;
  /** Reset back to idle (clears run/error and stops polling). */
  reset: () => void;
}

export function useAuthoringRun(githubToken: string | null): UseAuthoringRunResult {
  const [phase, setPhase] = useState<AuthoringPhase>('idle');
  const [run, setRun] = useState<AuthoringRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const giveUpRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Stop polling on unmount; the run continues server-side regardless.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimers();
    };
  }, [clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    setPhase('idle');
    setRun(null);
    setError(null);
  }, [clearTimers]);

  const start = useCallback(
    (request: AuthoringRunRequest) => {
      if (!githubToken) {
        setError(friendlyError('NOT_AUTHENTICATED', 'Please sign in to ask a question.'));
        setPhase('failed');
        return;
      }
      // Ignore re-entrant starts while a run is already in flight.
      if (intervalRef.current || phase === 'creating') return;

      clearTimers();
      setError(null);
      setRun(null);
      setPhase('creating');

      const poll = async (runId: string) => {
        try {
          const next = await getAuthoringRun(githubToken, runId);
          if (!mountedRef.current) return;
          setRun(next);
          if (isTerminalStatus(next.status)) {
            clearTimers();
            if (next.status === 'succeeded') {
              setPhase('succeeded');
            } else {
              setPhase('failed');
              setError(
                friendlyError(
                  next.error?.code ?? null,
                  next.error?.message ?? 'The run failed. Please try again.',
                ),
              );
            }
          }
        } catch (err) {
          // Transient poll errors are non-fatal — keep polling; the give-up
          // timer is the backstop. Only surface if it's a hard auth/not-found.
          if (err instanceof AuthoringApiError && (err.status === 401 || err.status === 404)) {
            if (!mountedRef.current) return;
            clearTimers();
            setPhase('failed');
            setError(friendlyError(err.code, err.message));
          }
        }
      };

      const beginPolling = (runId: string) => {
        intervalRef.current = setInterval(() => {
          void poll(runId);
        }, POLL_INTERVAL_MS);
        giveUpRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          clearTimers();
          setPhase('timeout');
        }, POLL_GIVE_UP_MS);
      };

      (async () => {
        try {
          const created = await startAuthoringRun(githubToken, request);
          if (!mountedRef.current) return;
          setRun(created);
          if (isTerminalStatus(created.status)) {
            // Unusual, but a fast/cached run could already be done.
            if (created.status === 'succeeded') {
              setPhase('succeeded');
            } else {
              setPhase('failed');
              setError(
                friendlyError(
                  created.error?.code ?? null,
                  created.error?.message ?? 'The run failed. Please try again.',
                ),
              );
            }
            return;
          }
          setPhase('running');
          beginPolling(created.runId);
        } catch (err) {
          if (!mountedRef.current) return;
          const message =
            err instanceof AuthoringApiError
              ? friendlyError(err.code, err.message)
              : err instanceof Error
                ? err.message
                : 'Failed to start the run.';
          setPhase('failed');
          setError(message);
        }
      })();
    },
    [githubToken, phase, clearTimers],
  );

  return {
    phase,
    run,
    error,
    isBusy: phase === 'creating' || phase === 'running',
    start,
    reset,
  };
}
