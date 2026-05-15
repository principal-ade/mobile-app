# Trails on Mobile — API Surface

What the mobile Trails tab needs from web-ade, what already exists, and what
has to be added or built client-side.

Reference docs:
- `web-ade/docs/file-city-trail-sharing.md` — full backend contract
- `web-ade/src/lib/trails/types.ts` — `SharedTrailIndexEntry`, error codes
- `mobile-app/src/types/Trail.ts` — payload shapes ported from `@industry-theme/file-city-panel`

## 1. The mental model — existing vs. new

The shipped backend is **repo-centric**:

- A trail is published with `(owner, repo)` and indexed under that repo.
- "Sharing" is a `/trail/{id}` link — the standalone page resolves through
  `GET /api/trails/by-id/{id}`.
- Anyone who can pass the **repo-access check** (`GET /repos/{owner}/{repo}`
  via GitHub) can read the trail. Public repo → readable while signed-out.
- The receiver-side roster is `visitors` on the payload itself
  (`{ named: string[], anonymousCount: number }`), populated by
  `POST /api/trails/by-id/{id}/visits`.

This doc proposes adding a **per-user inbox** alongside the existing model.
Trails stay repo-resources for storage and read auth; the inbox is a thin
indirection layer — sender designates GitHub login recipients, server appends
an entry to each recipient's inbox index, mobile reads from the inbox. The
underlying trail and its repo-access check are unchanged.

## 2. Routes that already exist (web-ade)

All routes accept `Authorization: Bearer <github_token>` OR the
`github_token` cookie. Anonymous reads are allowed on public repos.

### Trail-level

| Method | Path | Mobile use? | Notes |
|---|---|---|---|
| `GET` | `/api/trails/by-id/{id}` | **Yes — primary fetch** | Returns `{ owner, repo, entry, payload }`. Resolves `/trail/{id}` deep links. |
| `GET` | `/api/trails/{owner}/{repo}` | Yes — repo browse | Lists `SharedTrailIndexEntry[]` for the repo. |
| `GET` | `/api/trails/{owner}/{repo}/{id}` | Optional | Same shape as by-id minus owner/repo (we already know them). Use by-id from mobile to keep one code path. |
| `POST` | `/api/trails` | **No** (v1) | Authoring — mobile is consumer-only. Belongs to the electron bridge. |
| `DELETE` | `/api/trails/{owner}/{repo}/{id}` | Maybe — "remove my trail" | Restricted to `createdBy.githubId`. |

### Per-trail subroutes (`/api/trails/by-id/{id}/...`)

| Method | Path | Mobile use? | Notes |
|---|---|---|---|
| `POST` | `.../visits` | **Yes** | Records the viewer in `visitors.named` (if signed in) or bumps `anonymousCount` (cookie-dedup'd; mobile is unlikely to send the cookie, so anon visits will overcount unless we plumb it). |
| `POST` | `.../sign-offs` | **Yes** | Body: `{ comment?: string }`. Author is server-supplied. Server rejects double-sign with 409. |
| `DELETE` | `.../sign-offs/{signOffId}` | Yes | Allowed for signer OR trail owner. Author's own publish-stamp is irremovable. |
| `POST` | `.../notes` | **Yes** | Body: `TrailNoteDraft` (snippet or markdown anchor). |
| `PATCH` | `.../notes/{noteId}` | Yes | Body: `{ body: string }`. Author-only. |
| `DELETE` | `.../notes/{noteId}` | Yes | Author OR trail owner. |

## 3. Response envelopes mobile will consume

```ts
// GET /api/trails/by-id/{id}
{
  owner: string;
  repo: string;
  entry: SharedTrailIndexEntry;   // BaseTrailIndexEntry + { createdBy, githubRepoId }
  payload: TrailPayload;           // visitors inline, signOffs inline, notes inline
}

// GET /api/trails/{owner}/{repo}
{ entries: SharedTrailIndexEntry[] }   // sorted by updatedAt desc

// POST .../visits
{ visitors: { named: string[]; anonymousCount: number } }

// POST .../sign-offs → 201
{ signOff: TrailSignOff }

// POST .../notes → 201
{ note: TrailNote }

// PATCH .../notes/{noteId}
{ note: TrailNote }

// DELETE * → 204 (no body)
```

Error shape (any route):
```ts
{ error: string; code: ShareErrorCode }
```

Codes worth handling explicitly on mobile:
- `NO_REPO_ACCESS` — show "you don't have access to this repo" rather than a generic error
- `NOT_FOUND` — trail was deleted or pointer is stale
- `NOT_AUTHENTICATED` — token expired; route through reauth flow
- `INVALID_REQUEST` (409 on sign-off) — already signed; treat as success, not error

## 4. New: inbox subsystem

A per-user inbox so senders can deliver a trail to specific GitHub logins,
and recipients have a server-backed list to drive the mobile Trails tab.

### 4a. Storage layout

Two new S3 prefixes alongside the existing `trails/` tree:

```
trails/_inbox/{githubId}/index.json         ← per-recipient inbox (ETag-locked)
trails/_inbox/{githubId}/by-trail/{id}.json ← per-entry object for fast point reads
```

Keying by **numeric `githubId`** (not login) so the inbox survives username
changes — same approach the existing `SharedTrailIndexEntry.createdBy`
already takes.

Inbox index shape:

```ts
interface InboxIndex {
  version: 1;
  updatedAt: string;
  entries: InboxIndexEntry[];   // sorted by sentAt desc
}

interface InboxIndexEntry {
  /** Trail id — foreign key into the existing `/api/trails/by-id/{id}`. */
  trailId: string;
  /** Sender identity at send-time. */
  sender: { githubId: number; githubLogin: string };
  /** Optional free-text note from the sender. */
  comment?: string;
  /** ISO 8601 — server-stamped on send. Refreshed on resend. */
  sentAt: string;
  /** ISO 8601 — server-stamped when the recipient marks read. */
  readAt: string | null;
  /**
   * Snapshot of the trail's `SharedTrailIndexEntry` at send-time. Lets the
   * mobile list render without a fan-out fetch per row. Refreshed lazily
   * when the recipient opens the trail (server re-reads the live entry and
   * patches the snapshot if `updatedAt` advanced).
   */
  snapshot: SharedTrailIndexEntry;
  /** Resolved owner/repo for the trail — duplicated from the by-id pointer. */
  owner: string;
  repo: string;
}
```

Soft cap: 500 entries per inbox. Past that, oldest-by-`sentAt` are pruned
on append. The cap is generous because deletion is the user's call, not the
server's.

### 4b. New routes

All routes live under `/api/trails/` to stay co-located with the existing
trail surface.

#### `POST /api/trails/by-id/{id}/send`

Sender designates recipients for an existing trail.

**Auth:** GitHub token required. Sender must pass the **repo-access check**
for the trail's `(owner, repo)` — same gate as reading the trail. (You can
only share something you can read.)

**Request body:**
```ts
{
  recipients: string[];   // GitHub logins, deduped, max 50
  comment?: string;       // optional sender note, max 500 chars
}
```

**Behavior:**
1. Resolve trail by id → `(owner, repo)` via existing `_by-id/{id}.json` pointer.
2. Repo-access check for sender; 403 → `NO_REPO_ACCESS`.
3. For each recipient login: resolve to `(githubId, githubLogin)` via
   `GET /users/{login}`. Cache (login → id) for 24h to absorb retries.
4. For each resolved recipient, append an `InboxIndexEntry` to
   `trails/_inbox/{githubId}/index.json` under ETag retry. Idempotency:
   re-sending the same `(trailId, sender, recipient)` triple refreshes
   `sentAt` and `snapshot`, and clears `readAt` (treat as new). The
   per-entry `by-trail/{trailId}.json` object is written in the same pass.
5. Sender's own login in `recipients` is allowed (useful for self-shares).

**Response (200):**
```ts
{
  delivered: Array<{ login: string; githubId: number }>;
  failed: Array<{ login: string; reason: 'unknown_user' | 'invalid_login' }>;
}
```

Partial delivery is non-fatal — failed logins are reported, not raised.

#### `GET /api/trails/inbox`

List the authenticated user's inbox.

**Auth:** GitHub token required. The caller's `githubId` is the lookup key.

**Query params:**
- `unreadOnly` — `true` to skip entries with `readAt !== null`. Default `false`.
- `since` — ISO 8601; entries with `sentAt > since` only. For incremental polling.
- `limit` — `1..100`, default `50`.
- `cursor` — opaque continuation token from previous response.

**Response (200):**
```ts
{
  entries: InboxIndexEntry[];   // sorted by sentAt desc
  unreadCount: number;          // total unread across the inbox, ignores filters
  cursor?: string;              // present when more pages remain
}
```

Snapshot freshness: when an entry is returned, server compares its
`snapshot.updatedAt` against the live trail entry's `updatedAt`. If the
live entry advanced, the response uses the live entry (the index is
patched lazily so we don't write on every list). If the live trail is
gone (deleted), the entry is dropped from the response and from the
index in the same lazy pass.

#### `GET /api/trails/inbox/unread-count`

Tab-badge helper. Returns just the unread total — same number as
`GET /api/trails/inbox` would compute, without the body.

**Response (200):** `{ count: number }`.

#### `POST /api/trails/inbox/{trailId}/read`

Mark a single inbox entry read.

**Auth:** GitHub token required.

**Request body:** none.

**Behavior:** Sets `readAt = new Date().toISOString()` on the entry.
Idempotent — repeated calls are no-ops. 404 if `trailId` isn't in the
caller's inbox.

**Response (200):** `{ readAt: string }`.

#### `POST /api/trails/inbox/read-all`

Mark every entry in the inbox read in one shot. Used when the user opens
the Trails tab and we want to clear the badge wholesale.

**Auth:** GitHub token required.

**Response (200):** `{ marked: number }`.

#### `DELETE /api/trails/inbox/{trailId}`

Remove an entry from the caller's inbox. Does **not** delete the trail —
just the inbox row. The trail remains readable via `/api/trails/by-id/{id}`
as long as the recipient has repo access.

**Response (204):** no body.

### 4c. Error codes added

Extends `ShareErrorCodes`:

- `UNKNOWN_RECIPIENT` — login didn't resolve to a GitHub user (per-recipient,
  surfaced in `failed[]`, not as a top-level error).
- `TOO_MANY_RECIPIENTS` — `recipients.length > 50`.
- `RECIPIENTS_REQUIRED` — empty / missing `recipients` array.
- `COMMENT_TOO_LONG` — sender comment over 500 chars.
- `INBOX_NOT_FOUND` — used on read/delete/mark-read for a `trailId` not in
  the caller's inbox.

### 4d. Auth + access edge cases

- **Recipient loses repo access after delivery.** The inbox entry stays
  visible (it's in their inbox), but opening the trail will 403 with
  `NO_REPO_ACCESS` from the existing by-id route. Mobile renders the row
  with a "you no longer have access" state and lets the user delete it.
- **Trail gets deleted after delivery.** The lazy-patch step in
  `GET /api/trails/inbox` drops the row from the response and from the
  index. Mobile never sees the orphan.
- **Sender tries to send a trail they can't read.** Blocked at the
  repo-access gate before any recipient is touched.
- **Anonymous senders.** Not allowed. `POST .../send` requires auth.

### 4e. What this means for `visits`

The visits roster still exists, populated by the existing
`POST .../visits` route. Inbox delivery does **not** register a visit —
delivering ≠ visiting. The recipient opening the trail still calls
`/visits` to land in `visitors.named`. Treat the two as orthogonal.

### 4f. Push notifications

Out of scope for v1 of this doc — adding push will hang off the existing
notification stack (`mobile-app/docs/LIVE_ACTIVITY.md`) and the inbox
endpoint as its source-of-truth. Mobile can poll `unread-count` on
foreground / pull-to-refresh in the meantime.

### 4g. Anonymous-visit dedup on mobile (existing concern, recap)

The backend dedups anonymous visits via the HttpOnly `trail-anon-id`
cookie. Mobile `fetch` doesn't carry web cookies. The mitigation is
unchanged from before: ship signed-in only for v1 — punt anonymous
mobile visits. The inbox subsystem is *only* for signed-in users anyway,
so this is fully decoupled.

## 5. Proposed mobile service surface

A new `src/services/TrailsApiService.ts`, mirroring `CollectionsService.ts`
in shape:

```ts
// Trail-level reads (existing backend)
export function getTrailById(id: string, token?: string): Promise<TrailFetchResponse>;
export function listTrailsForRepo(owner: string, repo: string, token?: string): Promise<SharedTrailIndexEntry[]>;

// Trail-level mutations (existing backend, token required)
export function recordTrailVisit(id: string, token: string): Promise<TrailVisitors>;
export function signOffTrail(id: string, token: string, comment?: string): Promise<TrailSignOff>;
export function removeSignOff(id: string, signOffId: string, token: string): Promise<void>;
export function createNote(id: string, token: string, draft: TrailNoteDraft): Promise<TrailNote>;
export function updateNote(id: string, noteId: string, token: string, body: string): Promise<TrailNote>;
export function deleteNote(id: string, noteId: string, token: string): Promise<void>;

// Inbox (new backend, token required)
export function getInbox(
  token: string,
  opts?: { unreadOnly?: boolean; since?: string; limit?: number; cursor?: string },
): Promise<{ entries: InboxIndexEntry[]; unreadCount: number; cursor?: string }>;
export function getInboxUnreadCount(token: string): Promise<number>;
export function markInboxRead(trailId: string, token: string): Promise<{ readAt: string }>;
export function markInboxReadAll(token: string): Promise<{ marked: number }>;
export function deleteInboxEntry(trailId: string, token: string): Promise<void>;

// Sending (new backend, token required) — primarily an author host concern,
// but exposing on mobile too keeps the surface symmetric for future "forward
// this trail" UI.
export function sendTrail(
  id: string,
  token: string,
  body: { recipients: string[]; comment?: string },
): Promise<{ delivered: Array<{ login: string; githubId: number }>; failed: Array<{ login: string; reason: string }> }>;
```

No client-side persistence is needed for the list itself — the inbox is the
source of truth. The only local state we'll likely keep is the last
`since` cursor for incremental polling, and that's an implementation detail
of `useInbox()` rather than a service-layer concern.

## 6. Decisions to confirm before implementation

1. **Soft cap on inbox size.** 500 entries proposed; if the user receives
   more than that, oldest get pruned. Acceptable?
2. **`POST .../send` from mobile, or author-host only?** v1 mobile is
   consume-only on trails, but exposing `sendTrail()` enables a future
   "forward to a teammate" UI from a received trail. Cheap to ship now.
3. **Refreshing snapshots on send.** If the same `(trailId, sender, recipient)`
   triple is re-sent, current spec refreshes `sentAt` AND clears `readAt`
   (resurfaces as new). Alternative: keep `readAt` and only bump `sentAt`.
   Resurfacing matches "I'm pinging you again" semantics — going with that
   unless we want quieter behavior.
4. **Push notifications.** Out of scope for the doc; the inbox endpoint is
   the source-of-truth when we wire them later.
5. **Deep-link surface.** `principal-ai://trail/{id}` → TrailDetail screen
   in the Trails stack. Small follow-up to the routing config.
6. **Trail detail screen shape.** Reuse `TrailBriefCard` as the landing
   surface with Start jumping into a future TrailRouteScreen, or render
   the full marker route inline?

None of these block the empty-state v1 — they shape the v2 PR.

## 7. Status summary

| Capability | Server | Mobile client |
|---|---|---|
| Fetch trail by id | ✅ shipped | ✅ wired (`getTrailById`) |
| List trails for a repo | ✅ shipped | ✅ wired (`listTrailsForRepo`) |
| Record visit | ✅ shipped | ❌ not wired |
| Sign-off CRUD | ✅ shipped | ❌ not wired |
| Note CRUD | ✅ shipped | ❌ not wired |
| Inbox storage layout | ✅ shipped | n/a |
| `POST .../send` | ✅ shipped | ✅ wired (`sendTrail`) |
| `GET /inbox` (+ unread-count) | ✅ shipped | ✅ wired (`getInbox`, `getInboxUnreadCount`) |
| `POST /inbox/{id}/read` (+ read-all) | ✅ shipped | ✅ wired on tap (`markInboxRead`, `markInboxReadAll`) |
| `DELETE /inbox/{id}` | ✅ shipped | ✅ wired (`deleteInboxEntry`) — no UI yet |
| Deep link `/trail/{id}` → app | n/a | ❌ not wired |
| Tab unread badge | derived from `unread-count` | ❌ not wired |

## 8. Implementation order

A rough slicing for the work, lighter slices first so the mobile tab has
something to talk to as soon as possible:

1. **Web-ade slice 1 — inbox storage + read paths. ✅ shipped.**
   `trails/_inbox/{githubId}/` layout (ETag-locked `index.json` + per-entry
   `by-trail/{id}.json`), `GET /api/trails/inbox` with `unreadOnly` /
   `since` / `limit` / `cursor` + lazy snapshot refresh + auto-drop of
   entries whose trail is gone, `GET /api/trails/inbox/unread-count`.
2. **Web-ade slice 2 — `POST /api/trails/by-id/{id}/send`. ✅ shipped.**
   Repo-access gated, partial delivery (`failed[]` with `unknown_user` /
   `invalid_login`), idempotent on `(trailId, sender, recipient)` —
   resends refresh `sentAt` + snapshot and clear `readAt`. 24h-cached
   login → id resolver via `GET /users/{login}`. Producer (electron
   host) integration still pending.
3. **Web-ade slice 3 — read-state writes. ✅ shipped.**
   `POST /inbox/{trailId}/read` (idempotent), `POST /inbox/read-all`
   (best-effort per-entry fan-out via `Promise.allSettled`),
   `DELETE /inbox/{trailId}` (removes the inbox row only, leaves the
   underlying trail alone).
4. **Mobile slice 1 — `TrailsApiService` + inbox-driven Trails tab list. ✅ shipped.**
   Bearer-token fetch wrappers around every server route; `TrailsTabScreen`
   now renders an inbox-driven FlatList with pull-to-refresh, an unread
   dot per row, sender + comment + relative `sentAt`, and an empty/
   unauthenticated state fallback. Row tap optimistically marks-read.
   Trail-level mutations (visit/sign-off/note) are deliberately deferred
   to slice 2 — the service layer doesn't expose them yet.
5. **Mobile slice 2 — Trail detail screen + visit/sign-off/note wiring.**
6. **Mobile slice 3 — deep link `principal-ai://trail/{id}` → detail screen.**
7. **Mobile slice 4 — push or pull-to-refresh polling of `unread-count`.**
