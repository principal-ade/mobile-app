# Mobile Activity Feed

Real-time GitHub activity feed displaying commits from featured repositories in a mobile-native swipeable card interface.

## Overview

The Mobile Activity Feed is the home screen experience, showing a curated stream of recent commits from featured repositories. It mirrors the web homepage's mobile view with native React Native components.

## Key Features

- **Pull-to-refresh**: Native refresh control for manual updates
- **App state awareness**: Auto-refresh when app returns to foreground
- **Vertical card carousel**: Swipe up/down between repository cards
- **Horizontal commit carousel**: Swipe left/right through commits within a repo
- **File City visualization**: Repository structure rendered as isometric city PNG
- **Image prefetching**: Smooth transitions between commits

## Architecture

### Data Flow

```
Featured Repos (hardcoded list)
        |
        v
useActivityFeed Hook
        |
        v
[Parallel Fetch] web-ade API /api/github/repo/{owner}/{repo}/commits
        |
        v
RepoActivitySummary[] (sorted by latest commit)
        |
        v
ActivityFeedScreen
        |
        v
RepoCardCarousel (FlatList, pagingEnabled)
        |
        v
CommitCarousel (horizontal FlatList)
        |
        v
FileCityImage (prefetched PNG)
```

### Planned File Structure

| File | Purpose |
|------|---------|
| `src/hooks/useActivityFeed.ts` | Data fetching hook |
| `src/screens/ActivityFeedScreen.tsx` | Main feed screen |
| `src/components/ActivityFeed/RepoCardCarousel.tsx` | Vertical repo swiper |
| `src/components/ActivityFeed/RepoCard.tsx` | Individual repo card |
| `src/components/ActivityFeed/CommitCarousel.tsx` | Horizontal commit swiper |
| `src/components/ActivityFeed/CommitCard.tsx` | Individual commit display |
| `src/components/ActivityFeed/FileCityImage.tsx` | File City PNG loader |
| `src/components/ActivityFeed/AuthorAvatar.tsx` | Author avatar with tap action |
| `src/lib/featured-repos.ts` | Curated repository list |

## User Interactions

### Card Navigation (Vertical)

1. Swipe **up** to see next repository
2. Swipe **down** to see previous repository
3. Uses `FlatList` with `pagingEnabled` and `snapToInterval`

### Commit Navigation (Horizontal)

1. Swipe **left** to see next commit
2. Swipe **right** to see previous commit
3. File City image updates to highlight changed files

### Tap Actions

- **Commit card tap**: Open commit on GitHub or view details
- **Author avatar tap**: Open GitHub profile or filter by author
- **Repository name tap**: Open repository on GitHub

## API Dependencies

All APIs are provided by the web-ade backend:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/github/repo/{owner}/{repo}/commits` | Fetch recent commits |
| `GET /api/github/repo/{owner}/{repo}/commits/{sha}` | Fetch commit stats |
| `GET /api/file-city/{owner}/{repo}` | File City PNG (base) |
| `GET /api/file-city/{owner}/{repo}?commit={sha}` | File City PNG (with highlight) |

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

### Image Prefetching Strategy

```typescript
// Prefetch adjacent File City images
const prefetchAdjacentImages = (currentIndex: number, commits: Commit[]) => {
  const indices = [currentIndex - 1, currentIndex + 1];
  indices.forEach(i => {
    if (commits[i]) {
      Image.prefetch(getFileCityUrl(commits[i].sha));
    }
  });
};
```

## Design Decisions

**Why use web-ade APIs instead of direct GitHub API?**
- Caching layer reduces rate limit impact
- File City generation requires server-side processing
- Consistent data format with web app

**Why vertical swipe for repos, horizontal for commits?**
- Matches web mobile UX for familiarity
- Vertical = browse repos (primary navigation)
- Horizontal = browse commits within context (secondary)

**Why PNG for File City instead of native rendering?**
- File City is complex isometric visualization
- Server-side rendering ensures consistency
- Native implementation would be significant effort
