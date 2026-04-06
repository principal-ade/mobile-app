# Swipe Feed

Tinder-style card swiping interface for reviewing commit activity from followed users and repositories.

## Overview

The Swipe Feed presents commit activity as cards that users can swipe to interact with:
- **Swipe left/up**: Mark as seen (pass) - commits won't reappear
- **Swipe right**: Save to collection for later review
- **Swipe down**: Undo last action
- **Tap**: View card details

## Key Features

- **Commit-level tracking**: Individual commits are marked as seen, not entire cards
- **Guest mode**: Unauthenticated users see featured repos
- **Authenticated mode**: Personalized feed based on followed users/repos
- **Optimistic updates**: UI advances immediately, API calls happen in background
- **Undo support**: Swipe down to restore the last swiped card

## Architecture

### Data Flow

```
FeedTabScreen
        |
        v
Check auth state + follows
        |
        +--> Guest: fetchActivityFeed() -> summariesToCards()
        |
        +--> Authenticated: getCommitQueue(token, limit)
                |
                v
        SwipeFeedScreen
                |
                v
        Card Stack (current + next preview)
                |
                +--> Swipe Left/Up: passCard(token, itemId, seenCommitShas)
                |
                +--> Swipe Right: saveCard(token, card)
                |
                +--> Swipe Down: Undo (local only)
                |
                +--> Tap: Navigate to CardDetail
```

### File Structure

| File | Purpose |
|------|---------|
| `src/screens/SwipeFeedScreen.tsx` | Main swipe interface |
| `src/screens/FeedTabScreen.tsx` | Feed tab wrapper (guest/auth routing) |
| `src/components/ActivityFeed/SwipeCard.tsx` | Individual swipeable card |
| `src/services/FeedApiService.ts` | API calls (getCommitQueue, passCard, saveCard) |
| `src/utils/feedTransforms.ts` | Transform summaries to cards |

## Card Structure

Each card represents commit activity grouped by repository and hour bucket:

```typescript
interface CommitActivityCard {
  itemId: string;           // "YYYY-MM-DD:HH:owner/repo"
  repo: {
    owner: string;
    name: string;
  };
  hour: number;             // 0-23 UTC
  hourBucket: string;       // ISO timestamp for hour start
  commits: CommitInfo[];    // Array of commits in this bucket
  commitCount: number;
  latestCommitAt: string;
}
```

## Swipe Actions

### Pass (Swipe Left/Up)

Marks specific commits as seen so they won't appear again:

```typescript
// Optimistically advance UI
setCurrentIndex(prev => prev + 1);

// Background API call
const seenShas = currentCard.commits.map(c => c.sha);
await passCard(token, currentCard.itemId, seenShas);
```

**Server behavior**: Stores seen commit SHAs per itemId. If new commits arrive in the same hour bucket, they will still appear (only the specific SHAs are filtered).

### Save (Swipe Right)

Saves the full card snapshot to the user's collection:

```typescript
// Optimistically advance UI
setCurrentIndex(prev => prev + 1);

// Background API call
await saveCard(token, currentCard);
```

### Undo (Swipe Down)

Restores the last swiped card (local only, doesn't reverse API calls):

```typescript
if (lastSwipedCard && currentIndex > 0) {
  setCurrentIndex(prev => prev - 1);
  setLastSwipedCard(null);
}
```

## API Dependencies

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/trpc/feed.getCommitQueue` | GET | Fetch personalized commit cards |
| `POST /api/trpc/feed.passCard` | POST | Mark commits as seen |
| `POST /api/trpc/feed.saveCard` | POST | Save card to collection |

### Pass Card Request

```typescript
{
  itemId: "2024-01-15:14:facebook/react",
  seenCommitShas: ["abc123", "def456", "ghi789"]
}
```

## Telemetry Events

See `swipe-feed.otel.canvas` for the full event flow diagram.

### Feed Loading

| Event | When |
|-------|------|
| `swipe-feed.load.started` | Feed begins loading (guest or authenticated) |
| `swipe-feed.load.success` | Cards loaded successfully |
| `swipe-feed.load.error` | Failed to load feed |
| `swipe-feed.empty` | No cards available |

### Card Interactions

| Event | When |
|-------|------|
| `swipe-feed.card.view` | Card becomes visible |
| `swipe-feed.card.pass` | User swipes left/up (mark as seen) |
| `swipe-feed.card.save` | User swipes right (save card) |
| `swipe-feed.card.undo` | User swipes down (undo last) |
| `swipe-feed.card.tap` | User taps card (view details) |

### API Calls

| Event | When |
|-------|------|
| `swipe-feed.pass-api.success` | passCard API succeeded |
| `swipe-feed.pass-api.error` | passCard API failed |
| `swipe-feed.save-api.success` | saveCard API succeeded |
| `swipe-feed.save-api.error` | saveCard API failed |

### Session Events

| Event | When |
|-------|------|
| `swipe-feed.stack.exhausted` | User swiped through all cards |

## Guest vs Authenticated Mode

| Aspect | Guest | Authenticated |
|--------|-------|---------------|
| Data source | Featured repos (static list) | User's follows via API |
| Pass/Save | No-op (UI only) | Calls API |
| Undo | Works | Works |
| Empty state | "Sign in to customize" | "Edit Feed" / "View Saved" |

## Design Decisions

**Why commit-level tracking instead of card-level?**
- Cards are ephemeral (grouped by hour bucket)
- New commits in same hour should still appear
- More precise "seen" tracking

**Why optimistic updates?**
- Immediate UI feedback feels responsive
- API calls can fail silently without blocking UX
- Undo is local-only anyway

**Why swipe down for undo instead of button?**
- Keeps gesture-based interaction consistent
- No UI chrome cluttering the card view
- Natural gesture (pull back what you pushed away)
