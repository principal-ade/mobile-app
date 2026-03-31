# Web App Image Swiping Implementation

This document covers the image swiping feature implemented in the web app's `MobileRepoCard` component that the mobile app may want to adopt for feature parity.

## Overview

The web app now supports swiping on the File City image to navigate between commits, similar to how the commit carousel works below it. This creates a unified gesture experience where users can swipe anywhere on the card to change commits.

## Key Features Implemented

### 1. Swipe Direction Detection

The first 10px of movement determines whether it's a horizontal or vertical swipe:
- **Horizontal swipe** → Controls the commit carousel
- **Vertical swipe** → Scrolls to next/previous card in the feed

```typescript
if (isHorizontalSwipe.current === null) {
  const deltaX = Math.abs(touch.clientX - touchStartX.current);
  const deltaY = Math.abs(touch.clientY - touchStartY.current);
  const threshold = 10;

  if (deltaX > threshold || deltaY > threshold) {
    isHorizontalSwipe.current = deltaX > deltaY;
  }
}
```

### 2. Real-time Carousel Movement

As the user drags horizontally on the image, the commit carousel below moves in sync (1:1 mapping):

```typescript
const diff = touchStartX.current - touch.clientX;
commitsContainerRef.current.scrollLeft = initialScrollLeft.current + diff;
```

### 3. Momentum/Inertia on Release

Velocity is tracked during the drag. On release, momentum is applied to project the final position:

```typescript
// Track velocity during drag
const dt = now - lastTouchTime.current;
if (dt > 0) {
  velocity.current = (lastTouchX.current - touch.clientX) / dt;
}

// Apply momentum on release
const momentum = velocity.current * 150;
const projectedScroll = currentScroll + momentum;
const nearestIndex = Math.round(projectedScroll / cardWidth);
```

### 4. Image Loading Without Flash

To prevent black flashes when switching commits, we:
1. Render all commit images stacked (position: absolute)
2. Track `displayedSha` - the last successfully loaded image
3. Only update `displayedSha` when the new image finishes loading
4. Prefetch adjacent commit images (next and previous)

```typescript
// Keep showing last loaded image until new one loads
useEffect(() => {
  if (activeCommit && loadedImages.has(activeCommit.sha)) {
    setDisplayedSha(activeCommit.sha);
  }
}, [activeCommit, loadedImages]);
```

## Mobile App Considerations

The mobile app (React Native) already has some of this via the timeline avatars, but could consider:

1. **Image swipe gestures** - Allow swiping on the File City image itself, not just the timeline/carousel
2. **Prefetching** - The web app prefetches next AND previous commit images
3. **Image stacking** - Consider keeping multiple images rendered to avoid reload flashes

## Files Changed (Web)

- `src/components/home/MobileRepoCard.tsx` - Main implementation
- Touch handling refs: `touchStartX`, `touchStartY`, `isHorizontalSwipe`, `velocity`, etc.
- Image state: `loadedImages`, `displayedSha`

## Related

- Web hourly grouping now matches mobile: `src/utils/activityGrouping.ts`
- Both apps use `groupSummariesByHour()` for consistent feed organization
