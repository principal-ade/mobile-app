# Starred Topics & Trails — API Surface

What the mobile Starred tab needs from web-ade. Nothing on the server starring
side exists yet — this doc is a build spec, not a description of shipped
behavior.

Reference:
- `web-ade/src/lib/trails/` — shipped trails surface (storage, routes, types)
- `web-ade/src/lib/topics/` — shipped topics surface (storage, routes, types)
- `docs/TRAILS_API.md` — sibling doc; the inbox subsystem in §4 is the
  template this one mirrors.

## 1. Mental model

The Starred tab is **per-user, two-list**: starred topics and starred trails.
"Starred" is a thin recipient-side indirection — same shape as the trails
inbox in `TRAILS_API.md` §4:

- The underlying topic / trail stays where it lives (`topics/_by-id/{id}.json`,
  `trails/_by-id/{id}.json`). Read auth is unchanged — repo-access check for
  trails, public-by-link for topics.
- A per-user star index points at those IDs and carries a snapshot so the
  list renders without fanning out.
- Star / unstar is idempotent.

## 2. What exists today

### Topics

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/topics` | Create. Returns `{ id, url, topic }`. |
| `GET` | `/api/topics/by-id/{id}` | Fetch. Public-by-link. |
| `PATCH` | `/api/topics/by-id/{id}` | Owner-only edit. |
| `DELETE` | `/api/topics/by-id/{id}` | Owner-only delete. |

There's already a per-user index for **authored** topics
(`topics/_by-user/{githubId}.json` → `TopicByUserIndex`) — re-use the
`TopicByUserEntry` shape for the starred snapshot. Don't conflate the
indexes: "topics I created" and "topics I starred" are different lists.

### Trails

The repo-centric routes in `docs/TRAILS_API.md` §2. The inbox subsystem in §4
is the closest existing analogue; starred storage parallels it but is keyed
on `(user, trailId)` directly with no sender/comment fields.

### Starring

Nothing. No routes, no storage, no types. The mobile-side
`StarredTopicsTrailsScreen` currently shows empty states unconditionally.

## 3. Proposed storage

Two new S3 prefixes per user, keyed on numeric `githubId` (survives username
changes — same rationale as the inbox):

```
topics/_starred/{githubId}/index.json         ← per-user starred-topics index
trails/_starred/{githubId}/index.json         ← per-user starred-trails index
```

Single index files; no per-entry sidecars. Star payloads are small (snapshot
only) and we always read the whole list when the tab opens.

```ts
interface StarredTopicsIndex {
  version: 1;
  updatedAt: string;                 // ISO 8601
  entries: StarredTopicEntry[];      // sorted by starredAt desc
}

interface StarredTopicEntry {
  topicId: string;                   // FK into topics/_by-id/{id}.json
  starredAt: string;                 // ISO 8601, server-stamped
  snapshot: TopicByUserEntry;        // title, descriptionPreview, trailCount, …
  /**
   * Server-set on GET responses only — never stored. `true` when the
   * underlying `topics/_by-id/{topicId}.json` 404s at read time, so the
   * client can render a "no longer available" row.
   */
  gone?: true;
}

interface StarredTrailsIndex {
  version: 1;
  updatedAt: string;
  entries: StarredTrailEntry[];      // sorted by starredAt desc
}

interface StarredTrailEntry {
  trailId: string;                   // FK into trails/_by-id/{id}.json
  starredAt: string;
  owner: string;                     // duplicated from by-id pointer
  repo: string;
  snapshot: SharedTrailIndexEntry;
  /** Server-set on GET responses only — see `StarredTopicEntry.gone`. */
  gone?: true;
}
```

Mutations use ETag-locked read-modify-write (same pattern as inbox / topic
record). Soft cap **500 entries per list** — past that, oldest-by-`starredAt`
is pruned on append.

<a id="snapshot-freshness"></a>
### Snapshot freshness

Snapshot is captured at star-time. It is **only** refreshed when the user
opens the item from the starred list — the detail-fetch path re-reads the
live record, and if `updatedAt` advanced, patches the snapshot in the
index on the way through. `GET /starred` itself never fans out and never
refreshes snapshots; rows may be slightly stale (e.g. an old title) until
tapped. This is the cheap path on purpose.

If the underlying topic/trail is deleted, the star entry stays until the
user removes it — list rows render with a "no longer available" affordance
driven by `gone: true` on each entry (server sets the flag on `GET /starred`
when the by-id key 404s; see the entry type in [§3 Proposed storage](#3-proposed-storage)).

## 4. Proposed routes

All routes require `Authorization: Bearer <github_token>` or the
`github_token` cookie. Caller's `githubId` is always the index key — never
trust a `userId` param.

### Topics

#### `POST /api/topics/by-id/{id}/star`
Star the topic for the authenticated user.

- 404 → `NOT_FOUND` if the topic doesn't exist.
- Idempotent. Re-starring refreshes `starredAt` and `snapshot`; no error.
- **Response (200):** `{ entry: StarredTopicEntry; warnings?: string[] }` —
  `warnings` is omitted when empty; see [§4 Warnings](#warnings).

#### `DELETE /api/topics/by-id/{id}/star`
Unstar. Idempotent (404 on the topic itself is still a 200 — the goal is
"not in my starred list," and removing a phantom is fine).

- **Response (204):** no body

#### `GET /api/topics/starred`
List the caller's starred topics.

- **Response (200):** `{ entries: StarredTopicEntry[] }` — sorted by
  `starredAt` desc. Snapshots are returned as stored; they are **not**
  refreshed on this read (see [§3 Snapshot freshness](#snapshot-freshness)).
  Entries whose underlying record 404s at read time are returned with
  `gone: true`.

### Trails

Mirror the topic routes under the existing trails surface.

#### `POST /api/trails/by-id/{id}/star`
- Repo-access check on the trail's `(owner, repo)` — you can only star
  something you can read. 403 → `NO_REPO_ACCESS`.
- 404 → `NOT_FOUND`.
- Idempotent.
- **Response (200):** `{ entry: StarredTrailEntry; warnings?: string[] }` —
  see [§4 Warnings](#warnings).

#### `DELETE /api/trails/by-id/{id}/star`
- No repo-access check — unstarring after losing access must still work.
- Idempotent.
- **Response (204):** no body

#### `GET /api/trails/starred`
- **Response (200):** `{ entries: StarredTrailEntry[] }` — sorted by
  `starredAt` desc. Snapshots are returned as stored; not refreshed on this
  read (see [§3 Snapshot freshness](#snapshot-freshness)). Entries whose
  underlying record 404s at read time are returned with `gone: true`.

### Error codes (additions)

```
NOT_AUTHENTICATED   // existing
NOT_FOUND           // existing
NO_REPO_ACCESS      // existing (trails only)
```

No new error codes. Hitting the 500-entry cap is reported via the
warnings channel below, not raised.

<a id="warnings"></a>
### Warnings

Star routes return a `warnings?: string[]` field on the 200 response when
something advisory happened during the mutation. Field is omitted when
empty. Defined warning codes:

```
STAR_LIMIT_REACHED  // 500-entry cap hit on append; oldest entry pruned
```

Warnings never block the operation. Mobile may surface them (e.g. a one-
time toast on `STAR_LIMIT_REACHED`) or ignore them entirely.

### `starred` field on by-id GETs

To let the trail / topic detail screen render the star toggle's initial
state without a second request, the existing detail routes are extended:

- `GET /api/topics/by-id/{id}` — response gains `starred: boolean`.
- `GET /api/trails/by-id/{id}` — response gains `starred: boolean`.

Rules:

- For an **authenticated caller**, the server reads the caller's starred
  index and sets `starred` to whether `id` appears in it. One small S3
  GET per detail fetch.
- For an **anonymous caller** (allowed on public-repo trails and on all
  topics), `starred` is always `false` — no per-user read.
- The field reflects index membership only; `gone` semantics do not apply
  here (the by-id read already 404s if the target is missing).

## 5. Mobile integration

### New service module

`src/services/StarsApiService.ts` mirroring `TrailsApiService.ts`:

```ts
export async function getStarredTopics(token: string): Promise<{ entries: StarredTopicEntry[] }>
export async function starTopic(topicId: string, token: string): Promise<StarredTopicEntry>
export async function unstarTopic(topicId: string, token: string): Promise<void>

export async function getStarredTrails(token: string): Promise<{ entries: StarredTrailEntry[] }>
export async function starTrail(trailId: string, token: string): Promise<StarredTrailEntry>
export async function unstarTrail(trailId: string, token: string): Promise<void>
```

### New types

`src/types/Stars.ts`:
- `StarredTopicEntry`, `StarredTrailEntry`, `StarredTopicsIndex`,
  `StarredTrailsIndex` — mirror server types.

### Screen wiring

`src/screens/StarredTopicsTrailsScreen.tsx` currently shows static empty
states. Replace each segment's empty branch with the existing pattern from
`TrailsTabScreen` (load on focus, pull-to-refresh, error banner, empty
state when `entries.length === 0`). Reuse `InboxRow` styling as the row
template — both starred lists are visually the same shape (avatar, title,
secondary line, timestamp).

### Star toggle entry points

- **Trail detail (`TrailDetailScreen`)** — add a star button in the
  header. Optimistic toggle; revert + toast on failure.
- **Topic detail** — no mobile topic screen exists yet. When one is added,
  same pattern.
- **List rows** — defer. Don't add inline star toggles to inbox or recent
  rows in v1; long-press / swipe can come later.

### Local cache

In-memory only for v1. Use the same `loadedOnce` / `refreshing` state shape
as `TrailsTabScreen` so the user can't tell the difference between tabs.
Don't persist to AsyncStorage — the list is small and the network call is
cheap.

## 6. Build order

1. **web-ade:** types + storage helpers (`lib/stars/`); ETag-locked
   read-modify-write for the index. Unit tests around concurrent star /
   unstar and the 500-entry prune.
2. **web-ade:** the six star routes above, plus the `starred: boolean`
   field on `GET /api/topics/by-id/{id}` and `GET /api/trails/by-id/{id}`.
   Integration tests cover idempotency, repo-access gate (trails only),
   404-on-deleted-target, and `starred` correctness for authed-with-star /
   authed-without-star / anonymous callers.
3. **mobile:** `StarsApiService` + types. Wire the Starred tab segments to
   real data — empty state stays as the zero-entry fallback.
4. **mobile:** star toggle in `TrailDetailScreen` header.
5. **mobile:** topic detail screen + star toggle (separate scope; not
   blocked by 1–4).

Steps 1–2 are server-only; steps 3–5 unblock incrementally as each route
lands.

## 7. Open questions

- **Cross-device sync feel.** No realtime push; the list refreshes on tab
  focus and pull-to-refresh. Good enough for v1.
- **Privacy of starred lists.** Caller-only for now; no `/api/users/{login}/
  starred-topics` route. Add later if we want public starred lists on
  profiles.
- **Topic snapshot drift.** The snapshot includes `trailCount`. If trails
  are added to a topic after starring, the count gets stale until the user
  opens the topic. Acceptable — the live page always re-fetches.
- **Author vs. starrer.** A user who created a topic implicitly "follows"
  it via the `_by-user` index. Don't auto-star — leave that to an explicit
  user action so the two lists stay semantically distinct.
