# Highlight Layer Strategy

## Overview

The FileCityCanvas supports multiple highlight layers that can be stacked to show different types of information. We use a two-tier highlighting strategy:

1. **File Type Highlights** (Background) - Subtle, low opacity
2. **Commit Diff Highlights** (Foreground) - Prominent, high opacity

## Current Implementation

### Base Highlight Layers (File Types)

**Purpose**: Show what types of files exist in the repository

**Opacity**: `0.15` (15%) - Very subtle

**Example layers**:
- JavaScript files: Blue tint
- TypeScript files: Blue tint
- CSS files: Purple tint
- Python files: Yellow tint
- etc. (55 layers total)

**Why low opacity?**
- Provides context about file composition
- Doesn't distract from commit changes
- Creates a subtle color-coded map
- Leaves room for diff highlights to stand out

### Commit Diff Highlights (Coming Soon)

**Purpose**: Show which files changed in the active commit

**Planned Opacity**: `0.8` (80%) - Very prominent

**Planned colors**:
- Added files: Green (`#22c55e`)
- Modified files: Orange/Yellow (`#f59e0b`)
- Deleted files: Red (`#ef4444`)

**Why high opacity?**
- Makes changes immediately visible
- Clear visual distinction from base layer
- Easy to see what was touched in this commit

## Visual Hierarchy

```
Layer Stack (bottom to top):
├─ Districts (background) - Gray
├─ Buildings (base) - File-specific colors
├─ File Type Highlights - 15% opacity (subtle)
└─ Commit Diff Highlights - 80% opacity (prominent) ← Future
```

## Example Scenario

**Repository**: React app with 5000 files
- 2000 TypeScript files (blue tint at 15%)
- 1500 JavaScript files (blue tint at 15%)
- 800 CSS files (purple tint at 15%)
- 700 other files (various tints at 15%)

**Active Commit**: Modified 3 files
- `src/App.tsx` - Modified (orange border at 80%)
- `src/index.css` - Modified (orange border at 80%)
- `src/utils/new.ts` - Added (green fill at 80%)

**Result**: The 3 changed files **pop out** prominently against the subtle file-type background.

## Code Location

**File**: `src/components/ActivityFeed/MobileRepoCard.tsx`

```typescript
// Generate base highlight layers from city data
const files = result.cityData.buildings.map((b) => ({ path: b.path }));
const { highlightLayers, iconMap: fileIconMap } = createFileHighlightLayers(files);

// Reduce opacity of file type layers to make commit diffs stand out
const dulledLayers = highlightLayers.map(layer => ({
  ...layer,
  opacity: 0.15, // Much lower opacity for file type highlights
}));

setBaseHighlightLayers(dulledLayers);
```

## Future: Adding Commit Diff Highlighting

When we add commit diff highlighting, it will look like this:

```typescript
const commitHighlightLayer = useMemo<HighlightLayer | null>(() => {
  if (!activeCommit || !cityData) return null;

  // Fetch or extract changed files from commit
  const changedFiles = activeCommit.filesChanged || [];

  return {
    name: 'commit-changes',
    color: theme.colors.warning, // Orange for modified
    opacity: 0.8, // High opacity to stand out
    enabled: true,
    items: changedFiles.map(file => ({
      path: file.filename,
      type: 'file' as const,
      renderStrategy: file.status === 'added' ? 'fill' : 'border',
      // Optional: use different colors per status
      color: file.status === 'added' ? '#22c55e'
           : file.status === 'removed' ? '#ef4444'
           : '#f59e0b',
    })),
  };
}, [activeCommit, cityData, theme]);
```

Then the combined layers:

```typescript
const allHighlightLayers = useMemo(() => {
  if (commitHighlightLayer) {
    return [...baseHighlightLayers, commitHighlightLayer]; // Commit layer on top!
  }
  return baseHighlightLayers;
}, [baseHighlightLayers, commitHighlightLayer]);
```

## Adjusting Opacity

If you want to tweak the visibility:

**Make file types MORE visible**:
```typescript
opacity: 0.25, // 25% instead of 15%
```

**Make file types LESS visible**:
```typescript
opacity: 0.08, // 8% instead of 15%
```

**Make file types invisible** (commit diffs only):
```typescript
opacity: 0.0, // Completely hidden
```

Current sweet spot: `0.15` provides subtle context without distraction.

## Benefits

1. **Clear Visual Hierarchy**: File types = context, Diffs = focus
2. **Better UX**: Users immediately see what changed
3. **Layered Information**: Can see both file types AND changes
4. **Future-Proof**: Easy to add more highlight layers (e.g., test coverage, errors, etc.)
5. **Customizable**: Easy to adjust opacity based on user preference

## Testing

To see the dulled file type highlights:
1. Open app → Watch tab
2. Tap a user with activity
3. Observe the subtle color tints on buildings
4. Notice they don't dominate the visualization
5. Imagine how commit diffs at 80% opacity will stand out clearly

## Next Steps

1. ✅ Dull file type highlights (Done - 15% opacity)
2. ⏳ Fetch commit file changes
3. ⏳ Build commit diff highlight layer
4. ⏳ Test visual hierarchy (15% vs 80%)
5. ⏳ Fine-tune opacity values based on feedback
