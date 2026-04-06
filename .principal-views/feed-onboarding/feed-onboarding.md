# Feed Onboarding

Guided onboarding flow for new authenticated users to personalize their feed by selecting users and repositories to follow.

## Overview

When a user signs in for the first time and has no followed users or repositories, they are presented with a two-step onboarding wizard to set up their personalized feed.

## Key Features

- **Two-step wizard**: Follow users first, then repositories
- **Smart suggestions**: Shows GitHub following, org members, and starred repos
- **Search integration**: Find any user or repo via GitHub search
- **Quick selection**: Tap chips to toggle selection
- **Skippable steps**: Users can skip either step and proceed

## Architecture

### Data Flow

```
FeedTabScreen
        |
        v
Check follows via getFollows()
        |
        v
needsOnboarding = (users.length === 0 && repos.length === 0)
        |
        v
FeedOnboardingScreen
        |
        +--> Step 1: Users
        |       |
        |       v
        |    getSuggestedUsers() + searchUsers()
        |       |
        |       v
        |    User selects chips
        |
        +--> Step 2: Repos
                |
                v
            FEATURED_REPOS + getSuggestedRepos() + searchRepos()
                |
                v
            User selects chips
                |
                v
            Save selections via followUser() / followRepo()
                |
                v
            onComplete() -> SwipeFeedScreen
```

### File Structure

| File | Purpose |
|------|---------|
| `src/screens/FeedOnboardingScreen.tsx` | Main onboarding wizard |
| `src/screens/FeedTabScreen.tsx` | Parent screen that detects onboarding need |
| `src/services/FeedApiService.ts` | API calls for follow operations |
| `src/services/GitHubSearchService.ts` | User/repo search and suggestions |
| `src/lib/featured-repos.ts` | Curated list of featured repositories |

## User Flow

### Step 1: Follow Users

1. Shows heading: "Follow people to see their activity"
2. Displays suggested users:
   - People user follows on GitHub
   - Members of user's organizations
3. Search bar for finding additional users
4. Tappable chips to toggle selection
5. [Skip] skips without selecting, [Next] proceeds

### Step 2: Follow Repositories

1. Shows heading: "Follow repositories you're interested in"
2. Displays suggested repos:
   - Featured/popular repositories
   - User's starred repositories
3. Search bar for finding additional repos
4. Tappable chips to toggle selection
5. [Skip] skips without selecting, [Done] completes onboarding

### Completion

On completing onboarding:
1. All selected users are followed via `followUser()` API
2. All selected repos are followed via `followRepo()` API
3. `onComplete()` callback triggers transition to SwipeFeedScreen
4. Personalized feed loads based on new follows

## API Dependencies

| Endpoint | Purpose |
|----------|---------|
| `GET /api/trpc/feed.getFollows` | Check if user has follows |
| `POST /api/trpc/feed.followUser` | Follow a GitHub user |
| `POST /api/trpc/feed.followRepo` | Follow a repository |
| `GET /api/trpc/github.searchUsers` | Search for users |
| `GET /api/trpc/github.searchRepos` | Search for repositories |
| `GET /api/trpc/github.getSuggestedUsers` | Get user suggestions |
| `GET /api/trpc/github.getSuggestedRepos` | Get repo suggestions |

## Telemetry Events

See `feed-onboarding.otel.canvas` for the full event flow diagram.

### Onboarding Lifecycle

| Event | When |
|-------|------|
| `feed-onboarding.check` | Checking if onboarding is needed |
| `feed-onboarding.started` | Onboarding flow begins |
| `feed-onboarding.complete` | Onboarding flow completes |

### Step 1 Events

| Event | When |
|-------|------|
| `feed-onboarding.step1.view` | Step 1 displayed |
| `feed-onboarding.user.search` | User searches for users |
| `feed-onboarding.user.selected` | User selects a user chip |
| `feed-onboarding.step1.complete` | Step 1 completed |

### Step 2 Events

| Event | When |
|-------|------|
| `feed-onboarding.step2.view` | Step 2 displayed |
| `feed-onboarding.repo.search` | User searches for repos |
| `feed-onboarding.repo.selected` | User selects a repo chip |

### Follow API Events

| Event | When |
|-------|------|
| `feed-onboarding.follow-user.success` | User followed successfully |
| `feed-onboarding.follow-user.error` | Failed to follow user |
| `feed-onboarding.follow-repo.success` | Repo followed successfully |
| `feed-onboarding.follow-repo.error` | Failed to follow repo |

## Component Structure

```typescript
interface FeedOnboardingScreenProps {
  onComplete: () => void;
}

// Internal state
const [step, setStep] = useState<1 | 2>(1);
const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
const [selectedRepos, setSelectedRepos] = useState<{owner: string, repo: string}[]>([]);
```

### Chip Component

```typescript
interface ChipProps {
  label: string;
  avatar?: string;
  selected: boolean;
  onPress: () => void;
}
```

## Design Decisions

**Why a two-step wizard instead of a single page?**
- Reduces cognitive load by focusing on one decision at a time
- Users and repos are different mental models
- Allows for skip/next flow with clear progress

**Why show suggestions before search?**
- Reduces friction for new users
- Leverages existing GitHub relationships
- Search is available but not required

**Why allow skipping?**
- Users may want to explore first
- Not all users have GitHub follows to import
- Prevents blocking the feed experience

**Why save on complete instead of real-time?**
- Batch operation is more efficient
- Allows user to change their mind before committing
- Clear "done" action provides closure
