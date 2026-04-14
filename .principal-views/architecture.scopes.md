# Instrumentation Scopes

## Overview

This document describes the OTEL instrumentation scopes for the Principal AI Mobile App using a **two-layer architecture**:

1. **Feature Scopes** - User-facing features and workflows (UI/Screen level)
2. **Infrastructure Scopes** - Shared services and cross-cutting concerns (Internal systems)

This dual-layer approach provides both **feature-level observability** (user journeys) and **system-level observability** (infrastructure health).

## Architecture

### Feature Scopes (UI/Screen Level)

Feature scopes track user-facing features and workflows. Each scope corresponds to a major screen or user experience flow.

| Scope | Color | Description |
|-------|-------|-------------|
| `activity-feed` | Cyan (#06b6d4) | Activity feed feature - repo fetching, commit viewing, user interactions |
| `profile-view` | Purple (#8b5cf6) | User profile feature - profile loading, repos, contributions |
| `repo-view` | Green (#22c55e) | Repository detail feature - readme, metadata, file city navigation |
| `swipe-feed` | Amber (#f59e0b) | Swipe feed feature - card interactions, pass/save actions |
| `search` | Indigo (#6366f1) | Search feature - user/repo search, suggestions, result selection |
| `starred-repos` | Rose (#f43f5e) | Starred repositories feature - viewing and managing starred repos |
| `feed-preferences` | Teal (#14b8a6) | Feed customization feature - watched users/repos, onboarding |
| `saved-cards` | Pink (#ec4899) | Saved cards feature - viewing and managing saved feed cards |

### Infrastructure Scopes (Internal Systems)

Infrastructure scopes track shared services and internal systems that support multiple features.

| Scope | Color | Description |
|-------|-------|-------------|
| `auth` | Red (#ef4444) | Authentication system - OAuth, tokens, session management |
| `github-api` | Slate (#64748b) | GitHub API client - all GitHub API calls and responses |
| `principal-api` | Blue (#3b82f6) | Principal backend API - tRPC and REST calls to web-ade |
| `storage` | Purple (#a855f7) | Storage layer - local persistence, secure storage, caching |
| `navigation` | Lime (#84cc16) | Navigation system - routing, deep links, tab switching |
| `file-city-renderer` | Orange (#f97316) | File city rendering - visualization generation and caching |

## Example: Feature + Infrastructure Interaction

When a user views a profile, events span both layers:

```
[profile-view] profile-view.load.started
  ├─> [github-api] github-api.user.fetch.started
  ├─> [storage] storage.cache.miss
  ├─> [github-api] github-api.user.fetch.success
  ├─> [storage] storage.cache.write
  └─> [profile-view] profile-view.load.success
```

**Benefits:**
- Feature scopes show **what the user experienced**
- Infrastructure scopes show **how the system performed**
- Combined traces reveal both user impact and root cause

## Scope Details

### Feature Scopes

#### activity-feed

**Event Prefix:** `activity-feed.*`

**Coverage:**
- Feed initialization and data loading (`activity-feed.init.*`)
- Repository batch fetching (`activity-feed.fetch.*`)
- User interactions: card swipes, commit swipes, author taps (`activity-feed.card.*`, `activity-feed.commit.*`)
- File City visualization loading (`activity-feed.filecity.*`)
- App state changes and refresh triggers (`activity-feed.refresh.*`)

#### profile-view

**Event Prefix:** `profile-view.*`

**Coverage:**
- User profile data loading (`profile-view.user.*`)
- Repository lists (pinned, contributed, forked) (`profile-view.repos.*`)
- Contribution stats and calendar (`profile-view.contributions.*`)
- Profile navigation events (`profile-view.navigate.*`)

#### repo-view

**Event Prefix:** `repo-view.*`

**Coverage:**
- Repository detail loading (`repo-view.load.*`)
- README content fetching and rendering (`repo-view.readme.*`)
- Repository metadata retrieval (`repo-view.metadata.*`)
- Repository synchronization operations (`repo-view.sync.*`)

#### swipe-feed

**Event Prefix:** `swipe-feed.*`

**Coverage:**
- Feed loading and initialization (`swipe-feed.load.*`)
- Card presentation and viewing (`swipe-feed.card.*`)
- User actions: pass, save, undo (`swipe-feed.pass.*`, `swipe-feed.save.*`)
- Feed state management (`swipe-feed.stack.*`)

#### search

**Event Prefix:** `search.*`

**Coverage:**
- Search queries (users, repos, organizations) (`search.query.*`)
- Search suggestions and autocomplete (`search.suggest.*`)
- Result selection and navigation (`search.result.*`)
- Search history tracking (`search.history.*`)

#### starred-repos

**Event Prefix:** `starred-repos.*`

**Coverage:**
- Fetching starred repos from GitHub (`starred-repos.fetch.*`)
- Starred repo filtering and sorting (`starred-repos.filter.*`)
- Star/unstar operations (`starred-repos.star.*`)

#### feed-preferences

**Event Prefix:** `feed-preferences.*`

**Coverage:**
- Watched users/repos management (`feed-preferences.watch.*`)
- Feed onboarding flow (`feed-preferences.onboarding.*`)
- Preference persistence and sync (`feed-preferences.sync.*`)

#### saved-cards

**Event Prefix:** `saved-cards.*`

**Coverage:**
- Saved cards retrieval (`saved-cards.load.*`)
- Card management (delete, organize) (`saved-cards.manage.*`)
- Card navigation (`saved-cards.navigate.*`)

### Infrastructure Scopes

#### auth

**Event Prefix:** `auth.*`

**Coverage:**
- OAuth flow initiation and completion (`auth.oauth.*`)
- Token exchange and refresh (`auth.token.*`)
- Secure token storage operations (`auth.storage.*`)
- Multi-account switching (`auth.account.*`)
- Session lifecycle (`auth.session.*`)

**Used By:** All features requiring authentication

#### github-api

**Event Prefix:** `github-api.*`

**Coverage:**
- HTTP request/response tracking (`github-api.request.*`)
- Rate limiting and quota management (`github-api.rate-limit.*`)
- Error handling and retries (`github-api.error.*`)
- Response caching (`github-api.cache.*`)

**Used By:** profile-view, repo-view, activity-feed, search, starred-repos

#### principal-api

**Event Prefix:** `principal-api.*`

**Coverage:**
- tRPC procedure calls (`principal-api.trpc.*`)
- REST endpoint calls (`principal-api.rest.*`)
- Request/response tracking (`principal-api.request.*`)
- Error handling (`principal-api.error.*`)

**Used By:** swipe-feed, saved-cards, feed-preferences

#### storage

**Event Prefix:** `storage.*`

**Coverage:**
- Local storage operations (`storage.local.*`)
- Secure storage (tokens, credentials) (`storage.secure.*`)
- Cache hit/miss tracking (`storage.cache.*`)
- Data migration (`storage.migration.*`)

**Used By:** All features

#### navigation

**Event Prefix:** `navigation.*`

**Coverage:**
- Tab navigation changes (`navigation.tab.*`)
- Screen stack changes (`navigation.screen.*`)
- Deep link handling (`navigation.deeplink.*`)
- Navigation errors and fallbacks (`navigation.error.*`)

**Used By:** All features

#### file-city-renderer

**Event Prefix:** `file-city-renderer.*`

**Coverage:**
- Image fetching from backend (`file-city-renderer.fetch.*`)
- Image caching and prefetching (`file-city-renderer.cache.*`)
- Render performance tracking (`file-city-renderer.render.*`)
- Error handling (`file-city-renderer.error.*`)

**Used By:** activity-feed, repo-view

## Design Decisions

### Why two layers of scopes?

**Feature scopes** answer: "How are users experiencing the app?"
- Track user journeys end-to-end
- Measure feature-specific success metrics
- Identify feature-level bottlenecks

**Infrastructure scopes** answer: "How is the system performing?"
- Track shared service health
- Measure API performance
- Identify infrastructure bottlenecks

### Why not just use event name prefixes?

While event names already include feature context (`activity-feed.init.started`), scopes provide:

1. **Filtering** - Query all events from a scope without regex
2. **Versioning** - Version instrumentation independently per scope
3. **Ownership** - Clear responsibility for each telemetry area
4. **Sampling** - Sample different scopes at different rates

### Scope Selection Guidelines

**Use Feature Scopes for:**
- User-initiated actions (taps, swipes, searches)
- Screen lifecycle events (mount, unmount, focus)
- Feature-specific workflows (onboarding, customization)

**Use Infrastructure Scopes for:**
- API calls (GitHub, Principal backend)
- Storage operations (read, write, cache)
- System events (auth, navigation)
- Shared utilities (rendering, parsing)

### Scope Naming Convention

- **Feature scopes:** kebab-case feature name (`activity-feed`, `profile-view`)
- **Infrastructure scopes:** kebab-case system name (`github-api`, `auth`)
- **Event names:** `<scope-prefix>.<domain>.<action>` (`auth.token.refreshed`)

## Validation

All scopes must be documented in this canvas. The validator checks:
- All scopes in `library.yaml` have corresponding nodes
- Nodes have `type: "otel-scope"`
- Nodes have `otel.scope` matching the scope name
- Nodes have a `description` field

Run validation:
```bash
npx @principal-ai/principal-view-cli validate
```
