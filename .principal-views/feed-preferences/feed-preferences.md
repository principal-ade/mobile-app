# Feed Preferences Context

React Context for managing feed preferences (followed users and repositories) with reactive updates that trigger Activity screen refreshes.

## Overview

The FeedPreferencesContext provides centralized state management for feed customization preferences. It handles loading from storage, persisting changes, and notifying consuming screens when preferences change via a version counter mechanism.

## Key Features

- **Centralized state**: Single source of truth for followed users and repos
- **Automatic persistence**: Changes are saved to SecureStore automatically
- **Version-based reactivity**: Consumers can watch for changes and refetch
- **Bootstrap from storage**: Loads saved preferences on app start
- **Default fallback**: Uses featured repos if no preferences exist

## Architecture

### Data Flow

```
                    FeedPreferencesProvider
                            |
                            v
                    Bootstrap from storage
                            |
                            v
                    Set initial state + version=0
                            |
        +-------------------+-------------------+
        |                   |                   |
        v                   v                   v
  AddUserScreen     AddRepoScreen     FeedCustomization
        |                   |                   |
        v                   v                   v
    addUser()          addRepo()      removeUser/Repo()
        |                   |                   |
        +-------------------+-------------------+
                            |
                            v
                    Update state + version++
                            |
                            +---> Persist to storage (async)
                            |
                            v
                    Consumers detect version change
                            |
            +---------------+---------------+
            |                               |
            v                               v
    ActivityTabScreen              useActivityFeed
            |                               |
            v                               v
    fetchActivity(true)            refetch feed data
```

### File Structure

| File | Purpose |
|------|---------|
| `src/context/FeedPreferencesContext.tsx` | Context provider, state, and mutations |
| `src/utils/feedStorage.ts` | Storage layer (SecureStore + localStorage fallback) |
| `src/screens/FeedCustomizationScreen.tsx` | UI for managing preferences |
| `src/screens/AddUserScreen.tsx` | UI for adding users |
| `src/screens/AddRepoScreen.tsx` | UI for adding repos |
| `src/screens/ActivityTabScreen.tsx` | Consumer that refetches on version change |
| `src/hooks/useActivityFeed.ts` | Consumer that refetches on version change |

## Context API

### State

```typescript
interface FeedPreferencesState {
  followedUsers: FollowedUser[];
  followedRepos: FollowedRepo[];
  version: number;  // Increments on every mutation
}
```

### Methods

| Method | Description |
|--------|-------------|
| `addUser(user)` | Add a user to followed list |
| `removeUser(login)` | Remove a user by login |
| `addRepo(repo)` | Add a repo to followed list |
| `removeRepo(owner, repo)` | Remove a repo |
| `setUsers(users)` | Replace entire users list |
| `setRepos(repos)` | Replace entire repos list |
| `resetToDefaults()` | Clear users, reset repos to featured |

### Hook Usage

```typescript
const {
  followedUsers,
  followedRepos,
  version,
  isLoading,
  addUser,
  removeUser,
  addRepo,
  removeRepo,
  resetToDefaults,
} = useFeedPreferences();
```

## Version Counter Mechanism

The `version` counter is the key mechanism for reactive updates:

1. **Every mutation increments version**: When `addUser`, `removeUser`, `addRepo`, `removeRepo`, or `resetToDefaults` is called, version increases by 1.

2. **Consumers watch version**: Screens use `useEffect` with `version` in the dependency array to detect changes.

3. **Refetch on change**: When version changes, consumers know to refetch their data.

### ActivityTabScreen Example

```typescript
const { version } = useFeedPreferences();
const versionAtLastFetch = useRef(version);

useEffect(() => {
  if (hasFetched.current && versionAtLastFetch.current !== version) {
    fetchActivity(true);
    versionAtLastFetch.current = version;
  }
}, [version, fetchActivity]);
```

### useActivityFeed Example

```typescript
const { followedRepos, version, isLoading } = useFeedPreferences();

const resolvedRepos = useMemo(() => {
  if (followedRepos.length > 0) {
    return followedRepos.map((r) => `${r.owner}/${r.repo}`);
  }
  return FEATURED_REPOS;
}, [followedRepos]);

// Refetch when version changes
useEffect(() => {
  if (resolvedRepos) {
    fetchData();
  }
}, [resolvedRepos, fetchData, version]);
```

## Storage

### Keys

| Key | Content |
|-----|---------|
| `feed_followed_users` | `FollowedUser[]` as JSON |
| `feed_followed_repos` | `FollowedRepo[]` as JSON |

### Storage Strategy

1. **Primary**: `expo-secure-store` (encrypted, device-level)
2. **Fallback**: `localStorage` (web/development)

### Types

```typescript
interface FollowedUser {
  login: string;
  followedAt?: string;
  avatarUrl?: string;
}

interface FollowedRepo {
  owner: string;
  repo: string;
  followedAt?: string;
  isFeatured?: boolean;
}
```

## API Synchronization

The context only handles local state. API synchronization happens in the screens:

| Screen | API Calls |
|--------|-----------|
| `AddUserScreen` | `followUser()` after `addUser()` |
| `AddRepoScreen` | `followRepo()` after `addRepo()` |
| `FeedCustomizationScreen` | `unfollowUser()` / `unfollowRepo()` after remove |

This pattern provides:
- Optimistic updates (UI responds instantly)
- Graceful degradation (works offline)
- Clear separation of concerns

## Telemetry Events

See `feed-preferences.otel.canvas` for the full event flow diagram.

### Bootstrap Events

| Event | When |
|-------|------|
| `feed-preferences.bootstrap.started` | Provider mounts |
| `feed-preferences.bootstrap.load-storage` | Loading from storage |
| `feed-preferences.bootstrap.success` | Bootstrap complete |
| `feed-preferences.bootstrap.error` | Storage load failed |

### Mutation Events

| Event | When |
|-------|------|
| `feed-preferences.user.add` | User added |
| `feed-preferences.user.remove` | User removed |
| `feed-preferences.repo.add` | Repo added |
| `feed-preferences.repo.remove` | Repo removed |
| `feed-preferences.reset` | Reset to defaults |

### Persistence Events

| Event | When |
|-------|------|
| `feed-preferences.persist` | Data persisted to storage |
| `feed-preferences.persist.error` | Persistence failed |

### Version Events

| Event | When |
|-------|------|
| `feed-preferences.version.changed` | Version incremented |
| `feed-preferences.consumer.refetch` | Consumer triggered refetch |

### API Sync Events

| Event | When |
|-------|------|
| `feed-preferences.api-sync.user` | User follow/unfollow API call |
| `feed-preferences.api-sync.repo` | Repo follow/unfollow API call |

## Design Decisions

**Why a version counter instead of deep comparison?**
- Simple and efficient O(1) comparison
- No need to compare arrays on every render
- Clear causality (version only changes on mutations)

**Why persist asynchronously (fire-and-forget)?**
- UI updates immediately (better UX)
- Storage errors logged but don't block UI
- Matches optimistic update pattern

**Why not put API sync in the context?**
- Keeps context focused on local state
- Screens can decide when/if to sync
- Easier to handle auth token access
- Clear separation of concerns

**Why use SecureStore?**
- Encrypted storage for user preferences
- Consistent with auth token storage
- Falls back gracefully to localStorage

**Why default repos on bootstrap error?**
- App remains functional even if storage fails
- Featured repos provide a useful default experience
- User can customize later
