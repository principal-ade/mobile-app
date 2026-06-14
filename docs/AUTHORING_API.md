# Hosted Trail Authoring on Mobile — API Surface

**Topic:** `topic-1781154092475-a1ls0neji` ("Hosted trail authoring: ask-a-question → get-a-trail")

What the mobile app needs from web-ade to let a user **ask a natural-language
question about a repo and get back a published trail** — no local checkout, no
desktop agent. This is the mobile-facing contract for the cloud authoring
pipeline; it lets us build the client *now*, before web-ade's authoring route
lands, against an agreed shape.

Reference docs:
- `web-ade/web-ade/docs/hosted-trail-authoring.md` — the full server-side
  pipeline (opencode-in-Freestyle runner, the `emit_trail` contract, staged plan).
- `mobile-app/docs/TRAILS_API.md` — the existing trail read/inbox surface this
  flow reuses for **delivery and rendering**.
- `web-ade/web-ade/src/lib/trails/types.ts` — `ShareErrorCodes`, index entries.

> **Status: LIVE (as-built 2026-06-13).** The `/api/authoring/*` routes below are
> **built and verified end-to-end** in web-ade (Stage 4, commit `e55e6de`): an
> authenticated `POST` → `202` → background VM authoring → published trail
> delivered to the caller's inbox, with `GET` polling `queued→running→succeeded`.
> The shapes below are the real server contract — code the client directly
> against them. The mock in §8 is now optional (use it only for offline UI work).
> A few as-built notes are flagged inline with **[as-built]**.

---

## 1. The mental model — what's new vs. what's reused

The shipped Trails backend is **repo-centric and read-only from mobile's side**:
you fetch a trail someone already authored (`GET /api/trails/by-id/{id}`) and
render it. Authoring happened elsewhere (a desktop agent).

This flow adds the **authoring half**: mobile submits a *question*, the server
runs an agent in a sandbox that authors a `TrailPayload`, publishes it through
the **existing** `POST /api/trails` path, and delivers the result back.

```
ASK (new)                         GET-A-TRAIL (reuses TRAILS_API.md)
─────────────────────────         ─────────────────────────────────
POST /api/authoring/runs   ──▶  server authors + publishes a trail
   { owner, repo, question }              │
        │ 202 { runId }                   ▼
        ▼                         delivered to the user's INBOX
GET .../runs/{runId}  (poll)  ◀── (existing send→inbox machinery)
   status: queued→running→            │
   succeeded { trailId }              ▼
        │                       GET /api/trails/by-id/{trailId}
        └──────────────────▶    → TrailDetailScreen (unchanged)
```

Two things to internalize:
- **Authoring is slow and async** (VM boot + agent exploration — seconds to a
  couple of minutes). The client never blocks on a single request; it starts a
  run and then watches for completion.
- **Delivery reuses the inbox.** On success the runner drops the finished trail
  into the requesting user's own inbox, so the existing `getInbox` /
  `getInboxUnreadCount` machinery (and push, see §6) surfaces it with **zero new
  delivery plumbing**. The run-status endpoint is for the *in-session progress
  UI*; the inbox is the durable "come back later" path.

---

## 2. Auth — same Bearer token, now as the authoring identity

Every call sends `Authorization: Bearer <github_token>`, exactly as
`TrailsApiService` does today:

```ts
const { token } = useAuth();          // tokens.githubAccessToken
startAuthoringRun(token, { owner, repo, question });
```

Decision from the topic (`Open decisions` → resolved): the pipeline authors and
publishes **as the requesting user**, reusing the GitHub token the user is
already signed in with. Mobile just sends its Bearer token; the server uses that
same identity to (a) gate repo read-access, (b) check out the repo, and (c)
publish — so `createdBy` on the resulting trail is the user, and private repos
work iff the user can read them. The token never leaves the server's trusted
layer; it is **not** handed to the sandbox.

Consequence for the client: a run can only target a repo the signed-in user can
read. An unreadable/unknown repo fails fast with `403 NO_REPO_ACCESS` at run
creation (same code as the trails routes) — surface it before showing a
"working…" state.

---

## 3. New routes (web-ade — to build in Stage 4)

Base: `${apiConfig.baseUrl}/authoring` → `http://localhost:3000/api/authoring`
in dev, `https://app.principal-ade.com/api/authoring` in prod (same
`apiConfig.baseUrl` the other services use). All accept
`Authorization: Bearer <token>`; error bodies are `{ error, code }` like the
trails routes.

### `POST /api/authoring/runs` — start a run

Request:
```jsonc
{
  "owner": "principal-ade",
  "repo": "web-ade",
  "ref": "main",          // optional; defaults to the repo's default branch
  "question": "How does POST /api/trails validate payloads?",
  "model": "openrouter/openai/gpt-oss-120b"  // [as-built] optional provider/model
                                             // override; free default when omitted
}
```
**[as-built]** `model` is accepted but optional and **not echoed** in the
response (it's a server-side concern). Omit it to use the default; the picker
exists so the UI can offer model choice later. The server defaults to a free,
tool-calling model today.
Response — **202 Accepted** (the run is queued, not finished):
```jsonc
{
  "runId": "run_8f2c…",
  "status": "queued",
  "owner": "principal-ade",
  "repo": "web-ade",
  "ref": "main",
  "question": "How does POST /api/trails validate payloads?",
  "createdAt": "2026-06-12T17:00:00.000Z"
}
```
Errors **[as-built]**: `401 NOT_AUTHENTICATED`; `403 NO_REPO_ACCESS`; `400
INVALID_REQUEST` (missing/blank `question`, or invalid JSON body); `400
INVALID_OWNER_REPO` (malformed `owner`/`repo`). `429 RUN_LIMIT` (per-user
concurrency / rate cap) is **not implemented yet** — there is currently no cap;
don't rely on it. Error bodies are `{ error, code }`.

### `GET /api/authoring/runs/{runId}` — poll one run

Owned by its creator (gated on the token identity); `404` for unknown runs or
runs the caller didn't create. Response — **200**:
```jsonc
{
  "runId": "run_8f2c…",
  "status": "running",                 // queued | running | succeeded | failed
  "owner": "principal-ade",
  "repo": "web-ade",
  "ref": "main",
  "question": "…",
  "trailId": null,                     // set when succeeded
  "trailUrl": null,                    // "/trail/{id}" when succeeded
  "error": null,                       // { message, code } when failed
  "createdAt": "2026-06-12T17:00:00.000Z",
  "updatedAt": "2026-06-12T17:00:11.000Z"
}
```
Terminal states:
- `succeeded` → `trailId` + `trailUrl` populated; the trail is also in the
  user's inbox. Navigate to `TrailDetailScreen` via `trailId`.
- `failed` → `error.code` is one of: `REPO_RESOLVE_FAILED`,
  `AGENT_NO_EMIT` (agent never produced a payload), `VALIDATION_FAILED` (markers
  didn't resolve), `PUBLISH_FAILED`, `TIMEOUT`, `UNAVAILABLE` (the execution
  substrate was unreachable/errored — an infra failure; retry later rather than
  rephrasing).

### `GET /api/authoring/runs?status=&limit=&cursor=` — list caller's runs (optional, defer)

For an "in progress / recent asks" surface. Mirrors the inbox listing
(`limit` 1..100 default 50, opaque `cursor`). Not required for v1 — the inbox
already shows *completed* trails; this only adds visibility into in-flight/failed
runs. Build it when the UX needs a history list.

---

## 4. Mobile types (`src/types/Authoring.ts`)

```ts
export type AuthoringRunStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export type AuthoringErrorCode =
  | 'REPO_RESOLVE_FAILED'
  | 'AGENT_NO_EMIT'
  | 'VALIDATION_FAILED'
  | 'PUBLISH_FAILED'
  | 'TIMEOUT'
  | 'UNAVAILABLE';   // infra (Freestyle) unreachable — retry later

export interface AuthoringRunRequest {
  owner: string;
  repo: string;
  ref?: string;
  question: string;
}

export interface AuthoringRun {
  runId: string;
  status: AuthoringRunStatus;
  owner: string;
  repo: string;
  ref?: string;
  question: string;
  trailId: string | null;
  trailUrl: string | null;
  error: { message: string; code: AuthoringErrorCode } | null;
  createdAt: string;
  updatedAt: string;
}
```

---

## 5. Mobile service (`src/services/AuthoringApiService.ts`)

Mirror `TrailsApiService` exactly — same `authHeaders`/`jsonHeaders`, same
`throwFromResponse` → a typed `AuthoringApiError extends Error` carrying
`status` + `code`.

```ts
const API_BASE = `${apiConfig.baseUrl}/authoring`;

export async function startAuthoringRun(
  githubToken: string,
  body: AuthoringRunRequest,
): Promise<AuthoringRun> {
  const res = await fetch(`${API_BASE}/runs`, {
    method: 'POST',
    headers: jsonHeaders(githubToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwFromResponse(res, `Failed to start run: ${res.status}`);
  return (await res.json()) as AuthoringRun;
}

export async function getAuthoringRun(
  githubToken: string,
  runId: string,
): Promise<AuthoringRun> {
  const res = await fetch(`${API_BASE}/runs/${encodeURIComponent(runId)}`, {
    headers: authHeaders(githubToken),
  });
  if (!res.ok) await throwFromResponse(res, `Failed to fetch run: ${res.status}`);
  return (await res.json()) as AuthoringRun;
}
```

---

## 6. Delivery & completion — three ways the client can learn a run finished

Pick by surface; they're complementary, not exclusive:

1. **Poll the run (in-session progress).** While the "Ask" screen is open, poll
   `getAuthoringRun(runId)` to drive a queued→running→succeeded progress UI. A
   small hook:
   ```ts
   // useAuthoringRun(runId): poll every 3s, stop on terminal state, give up
   // after ~5 min with a "still working — we'll put it in your inbox" message.
   // (~5 min matches observed run times of ~2–4 min: VM boot + clone-with-retry
   // + agent exploration.)
   ```
   Recommended cadence: 3s steady (authoring is tens of seconds, not sub-second);
   no need for tighter. Stop immediately on `succeeded`/`failed`.

2. **Inbox (durable, already built).** On success the runner self-sends the
   trail, so it lands via the existing inbox index — `getInboxUnreadCount` bumps
   and `getInbox` returns an `InboxIndexEntry { trailId, sentAt, readAt }`. The
   user who closes the app mid-run still finds the trail waiting. **No new client
   code** beyond what the Trails tab already does.

3. **Push notification (nice-to-have).** The app already integrates Expo push
   (`docs/NOTIFICATIONS.md`). A "your trail is ready" push deep-linking to
   `/trail/{trailId}` is the best return-path UX; wire it once the inbox path
   works. Out of scope for the first cut.

**Rendering the result is 100% reuse:** `getTrailById(trailId, token)` →
`TrailDetailScreen`. Nothing new — this flow's only job is to *produce* a
`trailId` that the existing read/render path already knows how to open.

---

## 7. UX state machine (suggested)

```
idle ──submit──▶ creating ──202──▶ running ──poll: succeeded──▶ done → TrailDetail
                    │                  │
                 4xx│               poll: failed
                    ▼                  ▼
                 error(repo/auth)   error(reason) + retry
```

- **Entry point:** a question field on a repo context (e.g. the repo's File City
  / detail screen) or a dedicated "Ask" tab. Prefill `owner`/`repo` from the
  repo the user is looking at.
- **creating → running:** show the question + an indeterminate "authoring a trail
  for {owner}/{repo}…" state. The `202` returns instantly; real work is the poll.
- **done:** navigate to `TrailDetailScreen({ trailId })`; the entry is also in
  the inbox.
- **failed:** map `error.code` to a friendly line (`AGENT_NO_EMIT` →
  "couldn't build a trail for that question — try rephrasing"; `TIMEOUT` →
  "taking longer than expected — we'll drop it in your inbox when it's ready").
- **leave-and-return:** dropping the screen is safe — the run continues server
  side and arrives via the inbox. Don't tie run lifetime to screen lifetime.

---

## 8. Mock service (optional — the route is now live)

**[as-built]** The real route shipped (Stage 4, `e55e6de`), so you can code
straight against the live `/api/authoring/*` endpoints on a running web-ade
(`http://localhost:3000` in dev). Keep this mock only for **offline UI work**
(designing the progress/error states without a server). It honors the same
contract: a run that walks `queued → running → succeeded` on a timer.

```ts
// AuthoringApiService.mock.ts — swap in via a config flag
let t0 = Date.now();
export async function getAuthoringRun(_t: string, runId: string) {
  const age = Date.now() - t0;
  const status = age < 4000 ? 'queued' : age < 12000 ? 'running' : 'succeeded';
  return {
    runId, status, owner: 'facebook', repo: 'react', question: '…',
    trailId: status === 'succeeded'
      ? 'be73af7f-db20-4e3e-8e5e-bc593d897075'   // a real published trail to open
      : null,
    /* …rest of AuthoringRun… */
  } as AuthoringRun;
}
```

That `trailId` is a live trail on the local web-ade (the React smoke published
during L2 testing), so the mock drives the *real* `getTrailById` →
`TrailDetailScreen` path end-to-end. The entire Ask UX — input, progress, error,
navigation — can be finished and reviewed while the server side is built.

---

## 9. Open questions — **[as-built] status**

- **Run ID delivery vs. trail-in-inbox:** ✅ **both shipped.** `GET /runs/{id}`
  polling AND inbox self-delivery on success both work — use polling for the
  in-session progress UI, inbox for the durable come-back-later path.
- **Default `ref`:** ✅ **confirmed** — the server resolves the repo's default
  branch (HEAD) when `ref` is omitted.
- **Run retention / TTL** — ⚠️ **still open.** Run records persist in S3 with no
  TTL/reaper yet; a run can also orphan in `running` if the server restarts
  mid-authoring. Treat a run stuck in `running` past ~3 min as "check the inbox."
- **Concurrency / rate cap** — ⚠️ **not implemented.** No `429 RUN_LIMIT` yet;
  nothing stops a user from starting many runs. Don't depend on a cap; the UI
  should avoid spamming `POST /runs`.
- **Repo picker** — open (mobile UX): send `owner`/`repo` from an existing repo
  screen, or add a search step first (reuse `GitHubSearchService`).
