# File City - Mobile Implementation

## Overview

File City is a 2D visualization that represents a codebase as a city layout, where:
- **Buildings** = Files (sized by file size, colored by file type)
- **Districts** = Directories (bordered regions containing their files)

This is a port of the web-based `ArchitectureMapHighlightLayers` component from `web-ade`.

## Current Implementation (SVG)

The mobile implementation uses `react-native-svg` for rendering and `react-native-gesture-handler` for interactions.

### Components

```
src/components/FileCity/
├── FileCityCanvas.tsx      # Main SVG canvas component
├── drawingUtils.ts         # Coordinate transforms, hit testing, color utils
├── types.ts                # Re-exports from @principal-ai/file-city-builder
├── mockData.ts             # Mock data generator for stories/demos
└── index.ts                # Public exports
```

### Key Dependencies

- `@principal-ai/file-city-builder` - Official package for building city data from file trees
- `react-native-svg` - SVG rendering
- `react-native-gesture-handler` - Pan, pinch, tap gestures

### Features

- Pan and pinch-to-zoom navigation
- Tap to select buildings/districts
- File type coloring via `getFileColor()` from the builder
- Highlight layers for emphasizing specific files/directories
- Directory border rendering (no fill)

### Screens

- `FileCityDemoScreen` - Demo with mock data and complexity selector
- `RepoFileCityScreen` - Real repository visualization via GitHub API

### Services

- `FileCityService.ts` - Fetches file trees from API and builds city data

## Why SVG (Not Skia)

We initially attempted to use `@shopify/react-native-skia` with `react-native-reanimated` for better performance, but encountered significant issues:

1. **Babel plugin conflicts** - The Reanimated babel plugin caused build failures
2. **Complex setup** - Required extensive metro/babel configuration
3. **Debugging difficulty** - Errors were cryptic and hard to trace

SVG was chosen as a pragmatic alternative because:
- Works out of the box with React Native
- Familiar declarative API
- Adequate performance for moderate-sized repositories
- No additional build configuration needed

## Future: Migration to Skia

For larger repositories and smoother interactions, migrating to Skia would provide:

### Benefits

- **GPU-accelerated rendering** - Significantly faster for 1000+ buildings
- **60fps animations** - Smooth zoom/pan via Reanimated worklets
- **Lower memory usage** - No DOM-like overhead
- **Advanced effects** - Shadows, gradients, blur effects

### Migration Plan

1. **Resolve Reanimated setup**
   - Ensure babel plugin is properly configured
   - Test with a minimal Skia component first
   - Consider using Skia without Reanimated if issues persist

2. **Create SkiaFileCityCanvas**
   - Port drawing logic to Skia Canvas API
   - Use `drawRect()`, `drawRRect()` for buildings/districts
   - Implement text rendering with Skia fonts

3. **Gesture handling**
   - Use Reanimated's `useSharedValue` for transform state
   - Implement gestures with `useAnimatedGestureHandler`
   - Run all transforms on UI thread for 60fps

4. **Performance optimizations**
   - Implement level-of-detail (LOD) - hide small buildings when zoomed out
   - Use spatial indexing for hit testing
   - Consider offscreen rendering for static layers

5. **Feature parity checklist**
   - [ ] Building rendering with file type colors
   - [ ] District border rendering
   - [ ] Pan gesture
   - [ ] Pinch-to-zoom gesture
   - [ ] Tap to select
   - [ ] Highlight layers
   - [ ] Directory labels (optional)

### Skia Code Structure (Proposed)

```tsx
// SkiaFileCityCanvas.tsx
import { Canvas, Rect, RoundedRect, Group } from '@shopify/react-native-skia';
import { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

function SkiaFileCityCanvas({ cityData, ... }) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Gesture handlers update shared values on UI thread
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value += e.changeX;
      translateY.value += e.changeY;
    });

  return (
    <GestureDetector gesture={panGesture}>
      <Canvas style={{ flex: 1 }}>
        <Group transform={[{ scale }, { translateX }, { translateY }]}>
          {/* Districts */}
          {/* Buildings */}
        </Group>
      </Canvas>
    </GestureDetector>
  );
}
```

## API Integration

The file tree is fetched from the web-ade API:

```
GET /api/github/repo/{owner}/{name}?action=tree&ref=HEAD
```

Response is processed using:
1. `getFilesFromGitHubTree()` - Converts API response to FileInfo array
2. `buildFileSystemTreeFromFileInfoList()` - Builds FileTree structure
3. `CodeCityBuilderWithGrid.buildCityFromFileSystem()` - Generates CityData

## Performance Considerations

Current SVG implementation works well for:
- Small repos: < 100 files - Excellent
- Medium repos: 100-500 files - Good
- Large repos: 500-1000 files - Acceptable
- Very large repos: > 1000 files - Consider Skia migration

The API truncates very large repos to prevent performance issues.
