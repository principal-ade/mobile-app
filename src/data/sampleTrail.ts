/**
 * A self-contained sample trail for the logged-out onboarding flow. It's
 * the same "write-before-settle race" walkthrough used by the
 * `TrailBriefCard` stories, lifted into app data so the Welcome →
 * Learn about trails → sample flow can render a real brief WITHOUT a
 * network call or an auth token.
 *
 * Two markers carry inline slice snippets; `sampleTrailReadFile` stands
 * in for the GitHub-backed reader the live `TrailDetailScreen` injects,
 * resolving those slices from in-memory source so the snippet renders
 * offline. Everything here is fixture data — no real repo is fetched.
 */

import { trailPayloadToBriefProps } from '../components/Trails/trailBriefAdapter';
import type { TrailPayload } from '../types/Trail';

const SUMMARY_BODY = `**Login currently writes the session before the API call settles** — so a network failure mid-request leaves an orphaned session row.

Walk the three markers and decide whether the call order should be inverted.`;

/** The raw payload, shaped exactly like what `getTrailById` returns. */
export const SAMPLE_TRAIL_PAYLOAD: TrailPayload = {
  id: 'sample-trail-login-race',
  title: 'Login flow has a write-before-settle race',
  purpose: 'investigation',
  share: { id: 'sample-share' },
  request: 'Verify Direction',
  author: 'Fernando',
  summary: SUMMARY_BODY,
  createdAt: '2026-06-03T09:00:00Z',
  updatedAt: '2026-06-04T12:00:00Z',
  markers: [
    {
      id: 'm-login',
      label: 'login() entry point',
      sourcePath: 'src/auth/login.ts',
      description:
        'Public entry. Validates credentials, then delegates to `createSession` before awaiting the remote `/login` call.',
      snippet: {
        kind: 'slice',
        startLine: 1,
        endLine: 5,
        focusLine: 3,
        contextLines: 1,
      },
    },
    {
      id: 'm-create-session',
      label: 'createSession() writes before API settles',
      sourcePath: 'src/auth/session.ts',
      kind: 'subject',
      description:
        '**This is the race.** The session row is persisted *before* the API call resolves — a failure mid-flight leaves an orphan that the next login picks up.',
      snippet: {
        kind: 'slice',
        startLine: 1,
        endLine: 6,
        focusLine: 5,
        contextLines: 1,
      },
    },
    {
      id: 'm-api-client',
      label: 'API client retries swallow the failure',
      sourcePath: 'src/api/client.ts',
      description:
        'Retry middleware coerces any 5xx into a resolved promise after exhausting retries, masking the failure from `login()`.',
    },
  ],
  views: [{ kind: 'linear' }],
  notes: [
    // Summary-scoped markdown note — surfaces under the 00 Overview row.
    {
      id: 'note-summary',
      kind: 'markdown',
      scope: { kind: 'summary' },
      anchor: { kind: 'text-quote', exact: 'write-before-settle race' },
      body: 'Worth deciding whether this is a release blocker before we even touch the call order.',
      author: 'Dani Reyes',
      createdAt: '2026-06-03T10:15:00Z',
      updatedAt: '2026-06-03T10:15:00Z',
    },
    // Markdown note scoped to a marker description — no location caption.
    {
      id: 'note-login-desc',
      kind: 'markdown',
      scope: { kind: 'description', markerId: 'm-login' },
      anchor: { kind: 'text-quote', exact: 'delegates to `createSession`' },
      body: 'This delegation is the whole problem — it commits before we know the call will succeed.',
      author: 'Bob Chen',
      createdAt: '2026-06-03T11:00:00Z',
      updatedAt: '2026-06-03T11:00:00Z',
    },
    // Snippet slice note — caption renders as `src/auth/session.ts:12–18`.
    {
      id: 'note-session-slice',
      kind: 'snippet',
      scope: { markerId: 'm-create-session' },
      anchor: {
        kind: 'slice',
        ranges: [
          {
            startLine: 4,
            endLine: 5,
            startLineText: 'const row: Session = { id, userId, token };',
            endLineText: 'await persistSession(row);',
          },
        ],
      },
      body: 'Move this write **below** the awaited `/login` call so a network failure never leaves an orphan row.',
      author: 'Dani Reyes',
      createdAt: '2026-06-03T12:30:00Z',
      updatedAt: '2026-06-03T12:30:00Z',
    },
    // Free marker comment — no anchor, the kind mobile authors.
    {
      id: 'note-login-marker',
      kind: 'marker',
      scope: { markerId: 'm-login' },
      body: 'Should we add a regression test for the orphan-session path before merging?',
      author: 'Bob Chen',
      createdAt: '2026-06-03T14:30:00Z',
      updatedAt: '2026-06-03T14:30:00Z',
    },
  ],
};

/** Pre-flattened brief props the card consumes directly. */
export const SAMPLE_TRAIL_BRIEF_PROPS = trailPayloadToBriefProps(
  SAMPLE_TRAIL_PAYLOAD,
);

// In-memory source for the two snippet-bearing markers, keyed by the same
// `sourcePath` the markers carry. Mirrors what the GitHub reader would
// return for the slice ranges above.
const SAMPLE_SOURCES: Record<string, string> = {
  'src/auth/login.ts': `export async function login(email: string, password: string) {
  const creds = validate(email, password);
  const session = await createSession(creds.userId);
  const res = await api.post('/login', creds);
  return { session, res };
}`,
  'src/auth/session.ts': `export async function createSession(userId: string): Promise<Session> {
  const id = crypto.randomUUID();
  const token = await signToken(userId);
  const row: Session = { id, userId, token };
  await persistSession(row);
  return row;
}`,
};

/**
 * Offline stand-in for the trail file reader. Resolves a marker's
 * `sourcePath` to the in-memory sample source; rejects for anything else
 * so the card falls back to its no-snippet state rather than hanging.
 */
export function sampleTrailReadFile(path: string): Promise<string> {
  const contents = SAMPLE_SOURCES[path];
  return contents
    ? Promise.resolve(contents)
    : Promise.reject(new Error(`No sample source for ${path}`));
}
