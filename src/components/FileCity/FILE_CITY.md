# File City - Mobile Implementation

## Overview

File City is a 2D visualization that represents a codebase as a city layout, where:
- **Buildings** = Files (sized by file size, colored by file type)
- **Districts** = Directories (bordered regions containing their files)

This is a port of the web-based `ArchitectureMapHighlightLayers` component from `web-ade`.

## Implementation (Skia)

The mobile implementation uses `@shopify/react-native-skia` for GPU-accelerated rendering and `react-native-reanimated` + `react-native-gesture-handler` for interactions.

### Components

```
src/components/FileCity/
├── FileCityCanvas.tsx      # Main Skia canvas component
├── drawingUtils.ts         # Coordinate transforms, hit testing, color utils
├── types.ts                # Re-exports from @principal-ai/file-city-builder
├── mockData.ts             # Mock data generator for stories/demos
└── index.ts                # Public exports
```

### Key Dependencies

- `@principal-ai/file-city-builder` - Official package for building city data from file trees
- `@shopify/react-native-skia` - GPU-accelerated 2D rendering
- `react-native-reanimated` - Worklet-based animations
- `react-native-gesture-handler` - Pan, pinch, tap gestures

### Features

- GPU-accelerated rendering (handles 1000+ buildings)
- Pan and pinch-to-zoom navigation
- Tap to select buildings/districts
- File type coloring via `getFileColor()` from the builder
- Highlight layers for emphasizing specific files/directories
- Directory border rendering (no fill)

### Usage

```tsx
import { FileCityCanvas } from '@/components/FileCity';

<FileCityCanvas
  cityData={cityData}
  highlightLayers={highlightLayers}
  onBuildingPress={(building) => console.log(building.path)}
  onDistrictPress={(district) => console.log(district.path)}
/>
```

**Note:** FileCityCanvas requires native code (Skia) and won't work in web Storybook. Test on device/simulator.

### Screens

- `RepoFileCityScreen` - Real repository visualization via GitHub API

### Services

- `FileCityService.ts` - Fetches file trees from API and builds city data

## API Integration

The file tree is fetched from the web-ade API:

```
GET /api/github/repo/{owner}/{name}?action=tree&ref=HEAD
```

Response is processed using:
1. `getFilesFromGitHubTree()` - Converts API response to FileInfo array
2. `buildFileSystemTreeFromFileInfoList()` - Builds FileTree structure
3. `CodeCityBuilderWithGrid.buildCityFromFileSystem()` - Generates CityData

## Performance

Skia implementation handles:
- Small repos: < 100 files - Excellent
- Medium repos: 100-500 files - Excellent
- Large repos: 500-1000 files - Good
- Very large repos: > 1000 files - Good (API may truncate)

## Historical Note

The original implementation used `react-native-svg` for rendering. It was replaced with Skia for better performance with large repositories. If you need to reference the SVG implementation, see the git history before this commit.
