# Mobile Activity Feed

Real-time GitHub activity feed displaying commits in a TikTok-style vertical scrolling interface with swipe gestures for save/pass actions.

## Overview

The Mobile Activity Feed is the primary home screen experience, showing either:
- **Guest Mode**: Featured repos with recent commits from a curated list
- **Authenticated Mode**: Personalized commit queue from watched users/repos

The feed uses a vertical scrolling card interface where each card represents a repository's commits within a 1-hour time window.

## Key Features

- **Vertical scrolling feed**: TikTok-style paging between cards
- **Horizontal commit carousel**: Swipe left/right through commits within a card
- **Double-tap to save**: Heart animation on double-tap
- **Auto-mark as seen**: Cards marked as seen when scrolled past (1s threshold)
- **File City visualization**: Repository structure rendered as PNG with commit highlighting
- **AI commit summaries**: Non-technical summaries generated on-demand
- **Pull-to-refresh**: Native refresh control for manual updates (guest mode)

## Architecture

### Data Flow

**Guest Mode:**
```
FeedTabScreen
        |
        v
fetchActivityFeed() (ActivityFeedService)
        |
        v
[Parallel Fetch] Featured Repos × /github/repo/{owner}/{repo}/commits
        |
        v
Filter last 24h + fetch commit stats
        |
        v
RepoActivitySummary[] → Convert to CommitActivityCard[]
        |
        v
SwipeFeedScreen (initialCards prop)
        |
        v
FlatList (vertical, pagingEnabled) → MobileRepoCard
        |
        v
Horizontal FlatList → Commit details + File City PNG
```

**Authenticated Mode:**
```
FeedTabScreen
        |
        v
getWatches() → Check if user has follows
        |
        v
SwipeFeedScreen
        |
        v
getCommitQueue(token, 50) → CommitActivityCard[]
        |
        v
FlatList (vertical, pagingEnabled) → MobileRepoCard
        |
        v
[On scroll past] → passCard(token, itemId, seenShas)
[On double-tap] → saveCard(token, card)
        |
        v
Horizontal FlatList → Commit details + File City PNG
        |
        v
[On card visible] → getCommitsSummary() → AI summary (SSE)
```

### Actual File Structure

| File | Purpose |
|------|---------|
| `src/screens/FeedTabScreen.tsx` | Feed tab wrapper (guest vs auth routing) |
| `src/screens/SwipeFeedScreen.tsx` | Main vertical scrolling feed |
| `src/screens/FeedOnboardingScreen.tsx` | First-time user onboarding |
| `src/components/ActivityFeed/MobileRepoCard.tsx` | Full-screen repo card with commit carousel |
| `src/components/ActivityFeed/SwipeCard.tsx` | Alternative swipeable card (legacy?) |
| `src/components/ActivityFeed/RepoCard.tsx` | Desktop-style repo card |
| `src/services/FeedApiService.ts` | Feed API (commit queue, watches, save/pass) |
| `src/services/ActivityFeedService.ts` | Guest mode featured feed |
| `src/utils/feedTransforms.ts` | Transform summaries → cards |
| `src/utils/feedStorage.ts` | Local feed storage utilities |

## User Interactions

### Card Navigation (Vertical)

1. **Scroll up/down** to navigate between repository cards
2. Uses `FlatList` with `pagingEnabled` and `snapToInterval`
3. **Auto-mark as seen**: Cards marked when scrolled past after 1s
4. **Dot indicator**: Right side shows progress through feed
5. **Done card**: Shown when all cards viewed

### Commit Navigation (Horizontal)

1. Swipe **left** to see next commit
2. Swipe **right** to see previous commit
3. File City image updates to highlight changed files for active commit
4. **Timeline bar**: Shows commit sequence (only for multi-commit cards)
5. **Tap timeline avatar**: Jump to that commit

### Tap Actions

- **Double-tap card**: Save card (shows heart animation)
- **Single tap commit**: Navigate to CommitDetailScreen
- **Author avatar tap**: Navigate to UserProfileScreen
- **Repository header tap**: Navigate to RepoFileCityScreen

## API Dependencies

All APIs are provided by the web-ade backend:

### Guest Mode APIs

| Endpoint | Method | Auth | Returns |
|----------|--------|------|---------|
| `/github/repo/{owner}/{repo}/commits?per_page=10` | GET | No | `{ commits: CommitResponse[] }` - Last 10 commits |
| `/github/repo/{owner}/{repo}/commits/{sha}` | GET | No | `CommitStatsResponse` - Additions/deletions/files |
| `/file-city/{owner}/{repo}?width=800&height=800&commit={sha}` | GET | No | PNG image with highlighted files |

### Authenticated Mode APIs

| Endpoint | Method | Auth | Returns |
|----------|--------|------|---------|
| `/trpc/feed.getWatches` | GET | Required | `{ watchedUsers: [], watchedRepos: [] }` |
| `/trpc/feed.getCommitQueue?input={json:{limit:50}}` | GET | Required | `{ cards: CommitActivityCard[], hasMore: boolean }` |
| `/trpc/feed.passCard` | POST | Required | `{ success: boolean }` - Mark commits as seen |
| `/trpc/feed.saveCard` | POST | Required | `{ success: boolean }` - Save card |
| `/trpc/feed.getSavedCards` | GET | Required | `SavedCard[]` - All saved cards |
| `/explain-commits` | POST | No | SSE stream with AI summary |
| `/file-city/{owner}/{repo}?width=800&height=800&commit={sha}` | GET | No | PNG image with highlighted files |

### Data Types

**CommitActivityCard:**
```typescript
{
  itemId: string;           // "YYYY-MM-DD:HH:owner/repo"
  repo: { owner, name };
  hour: number;             // 0-23 UTC
  hourBucket: string;       // ISO timestamp
  commits: CommitInfo[];    // Commits in this hour
  commitCount: number;
  latestCommitAt: string;
}
```

**CommitInfo:**
```typescript
{
  sha: string;
  message: string;
  author: { login, avatarUrl? };
  committedAt: string;
  url: string;
  additions?: number;       // Only in guest mode with stats fetch
  deletions?: number;
  filesChanged?: number;
}
```

**RepoActivitySummary (Guest):**
```typescript
{
  owner: string;
  repo: string;
  fullName: string;
  commits: ActivityCommit[];
  latestCommitAt: Date;
  commitCount: number;
}
```

## Telemetry Events

See `activity-feed.otel.canvas` for the full event flow diagram.

### Core Flow Events

| Event | When |
|-------|------|
| `activity-feed.init.started` | Feed begins loading |
| `activity-feed.fetch.batch.started` | Parallel repo fetch begins |
| `activity-feed.fetch.repo.loaded` | Individual repo loaded |
| `activity-feed.init.success` | Feed ready with data |
| `activity-feed.init.empty` | No recent activity |
| `activity-feed.init.error` | Fatal error during init |

### Refresh Events

| Event | When |
|-------|------|
| `activity-feed.app-state.change` | App foreground/background |
| `activity-feed.refresh.started` | Refresh triggered |
| `activity-feed.refresh.complete` | Refresh finished |

### User Interaction Events

| Event | When |
|-------|------|
| `activity-feed.card.swipe` | Vertical swipe between repos |
| `activity-feed.commit.swipe` | Horizontal swipe between commits |
| `activity-feed.commit.tap` | Tap on commit card |
| `activity-feed.author.tap` | Tap on author avatar |
| `activity-feed.filecity.loaded` | File City image displayed |
| `activity-feed.filecity.error` | File City failed to load |

## Key Implementation Details

### MobileRepoCard Layout Calculation

The card uses precise height calculations to fit the screen:

```typescript
// Layout constants (in pixels)
const HOUR_LABEL_HEIGHT = 37;
const HEADER_HEIGHT = 80;
const FILE_CITY_BORDER = 2;
const TIMELINE_HEIGHT = 52;

// Calculate commit section height dynamically
const fileCityHeight = containerWidth + FILE_CITY_BORDER;
const topContentHeight = hourLabel
  ? topInset + HOUR_LABEL_HEIGHT + HEADER_HEIGHT
  : topInset + HEADER_HEIGHT;
const commitSectionHeight =
  containerHeight - topContentHeight - fileCityHeight - TIMELINE_HEIGHT - insets.bottom;
```

### AI Summary Generation

- Triggered when card becomes visible
- Calls `/explain-commits` with commit list
- Receives SSE (Server-Sent Events) stream
- Parses `data: {type:"text", content:"..."}` format
- Falls back to latest commit message if summary fails
- Can be expanded by tapping footer section

### Auto-Mark as Seen Logic

Uses FlatList `onViewableItemsChanged` callback:

```typescript
viewabilityConfig = {
  itemVisiblePercentThreshold: 50,  // 50% visible
  minimumViewTime: 1000,             // For 1 second
}

// When card scrolls out of view AND was visible >1s:
// → Mark as seen in local state
// → Call passCard(token, itemId, seenShas) in background
```

## Implementation Notes

### React Native Specifics

| Web Pattern | React Native Equivalent |
|-------------|------------------------|
| CSS scroll-snap | `FlatList` + `pagingEnabled` |
| `IntersectionObserver` | `onViewableItemsChanged` |
| CSS transitions | `react-native-reanimated` |
| Image lazy loading | `Image` + prefetch API |
| Pull-to-refresh | `RefreshControl` component |
| App visibility | `AppState` API |

### Gesture Handling

Use `react-native-gesture-handler` for:
- Smooth swipe detection
- Velocity-based snapping
- Gesture composition (vertical + horizontal)

### Featured Repositories (Guest Mode)

Guest users see a curated list of active repositories defined in `ActivityFeedService.ts`:

```typescript
FEATURED_REPOS = [
  'garrytan/gstack',
  'pingdotgg/t3code',
  'iamlukethedev/Claw3D',
  'openclaw/openclaw',
  'paperclipai/paperclip',
  'Dimillian/CodexMonitor',
  'ubicloud/ubicloud',
  'different-ai/openwork',
  'ghostty-org/ghostty',
  'rivet-dev/secure-exec',
  'yazinsai/OpenOats',
  'tigerbeetle/tigerbeetle',
]
```

Each repo is fetched in parallel, filtered to last 24h activity, and sorted by latest commit time.

## What Gets Fetched Where

### FeedTabScreen (Entry Point)

**Guest Mode:**
- Calls `fetchActivityFeed()` which fetches commits from FEATURED_REPOS
- For each repo: fetches last 10 commits, filters to 24h, fetches stats for each
- Returns `RepoActivitySummary[]`
- Passes as `initialCards` to SwipeFeedScreen

**Authenticated Mode:**
- Calls `getWatches(token)` to check if user has any follows
- If no follows → shows FeedOnboardingScreen
- If has follows → shows SwipeFeedScreen (which fetches commit queue)

### SwipeFeedScreen (Feed Container)

**Guest Mode:**
- Receives `initialCards` prop (already fetched)
- No additional API calls
- No save/pass tracking

**Authenticated Mode:**
- On mount: calls `getCommitQueue(token, 50)`
- Returns up to 50 `CommitActivityCard` objects
- Each card represents commits from a repo within a 1-hour window
- On scroll past card (>1s): calls `passCard(token, itemId, seenShas)`
- On double-tap: calls `saveCard(token, card)`

### MobileRepoCard (Individual Card)

**Always:**
- Receives `summary: RepoActivitySummary` prop (transformed from CommitActivityCard)
- Renders File City as `<Image>` with URL: `${baseUrl}/file-city/${owner}/${repo}?width=800&height=800&commit=${activeCommitSha}`
- **Does NOT fetch city data** - uses pre-rendered PNG
- Shows loading Logo while image loads
- On commit carousel scroll: updates File City URL with new commit SHA

**When visible (useEffect):**
- Calls `getCommitsSummary(commits, repoName, 'non-technical')`
- Receives AI-generated summary via SSE
- Shows in expandable footer section

### What's NOT Being Fetched

- **City data structure** (buildings, districts) - Only PNG images
- **Individual commit details** beyond what's in CommitActivityCard
- **Commit file lists** - File City highlight uses server-side rendering
- **Real-time updates** - Only manual refresh (guest) or on app foreground

## Design Decisions

**Why use web-ade APIs instead of direct GitHub API?**
- Caching layer reduces rate limit impact
- File City generation requires server-side processing
- Consistent data format with web app

**Why vertical swipe for repos, horizontal for commits?**
- Matches web mobile UX for familiarity
- Vertical = browse repos (primary navigation)
- Horizontal = browse commits within context (secondary)

**Why PNG for File City instead of FileCityCanvas component?**
- **Current**: Server-rendered PNG with commit highlighting baked in
- **Pro**: Lightweight, fast to load, low bandwidth
- **Con**: Not interactive, no zoom/pan in feed cards
- **Alternative**: Use `FileCityCanvas` component (exists in codebase)
  - Would need to fetch full city data (buildings, districts, etc.)
  - Would need to create highlight layers dynamically from commit file lists
  - More bandwidth/processing but enables interactivity
  - Already used in `RepoFileCityScreen` - could reuse here
- **Decision**: Keep PNG in feed for performance, use FileCityCanvas in detail view
