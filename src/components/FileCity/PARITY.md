# File City - Web/Mobile Feature Parity

This document compares the web implementation (`ArchitectureMapHighlightLayers` in `web-ade/file-city`) with the mobile implementation (`FileCityCanvas` in this repo).

## Reference Implementations

- **Web**: `/packages/react/src/components/ArchitectureMapHighlightLayers.tsx` (2D Canvas)
- **Mobile**: `src/components/FileCity/FileCityCanvas.tsx` (Skia)

Note: The web also has a 3D version (`FileCity3D` using Three.js) which is out of scope for mobile parity.

## Feature Comparison

### Rendering

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| Buildings with file-type colors | ✅ | ✅ | Uses `getFileColor()` from builder |
| District borders (stroke only) | ✅ | ✅ | |
| Directory labels | ✅ | ✅ | Basic implementation |
| Highlight layers - border | ✅ | ✅ | |
| Highlight layers - fill | ✅ | ✅ | `renderStrategy: 'fill'` supported |
| Highlight layers - glow | ✅ | ❌ | Web supports `renderStrategy: 'glow'` |
| Highlight layers - pattern | ✅ | ❌ | Web supports `renderStrategy: 'pattern'` |
| Highlight layers - cover | ✅ | ❌ | Web supports `renderStrategy: 'cover'` |
| File type icons (Lucide) | ✅ | ❌ | Web renders SVG icons on buildings |
| File type icons (emoji) | ✅ | ✅ | `showFileTypeIcons` + `iconMap` props |
| Grid overlay | ✅ | ❌ | `showGrid` prop |
| Building opacity based on highlight | ✅ | ✅ | Non-highlighted at 0.6 opacity |

### Interactions

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| Pan gesture | ✅ | ✅ | |
| Zoom (scroll/pinch) | ✅ | ✅ | |
| Tap/click to select | ✅ | ✅ | |
| Zoom to path (animated) | ✅ | ❌ | `zoomToPath` prop with animation |
| Hover state | ✅ | N/A | Not applicable for touch |
| Hover tooltips | ✅ | N/A | `onHover` callback with tooltip data |
| Click to zoom into directory | ✅ | ❌ | Auto-zoom on directory click |
| Double-tap to zoom | ❌ | ❌ | Neither has this |

### Visual Polish

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| Animated zoom transitions | ✅ | ❌ | `zoomAnimationSpeed` prop |
| Smart text wrapping | ✅ | ❌ | `breakTextIntelligently()` for labels |
| Isolation modes | ✅ | ❌ | 'none', 'transparent', 'collapse', 'hide' |
| Transform (rotate) | ✅ | ❌ | 0, 90, 180, 270 degree rotation |
| Transform (flip) | ✅ | ❌ | Horizontal/vertical flip |
| Focus directory highlight | ✅ | ❌ | `focusDirectory` prop |
| Configurable label position | ✅ | ❌ | Top or bottom of districts |

### Performance

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| LayerIndex (O(1) lookups) | ✅ | ✅ | Same implementation |
| Spatial grid hit testing | ✅ | ❌ | Web uses `SpatialGrid` class |
| Canvas size limiting | ✅ | N/A | `maxCanvasSize` prop |
| Icon texture caching | ✅ | N/A | For Lucide icons |

### Props Interface

| Prop | Web | Mobile | Notes |
|------|-----|--------|-------|
| `cityData` | ✅ | ✅ | |
| `highlightLayers` | ✅ | ✅ | |
| `backgroundColor` | ✅ | ✅ | |
| `defaultBuildingColor` | ✅ | ✅ | |
| `defaultDistrictColor` | ✅ | ✅ | |
| `buildingBorderRadius` | ✅ | ✅ | |
| `districtBorderRadius` | ✅ | ✅ | |
| `showDirectoryLabels` | ✅ | ✅ | |
| `enableZoom` | ✅ | ✅ | |
| `enablePan` | ✅ | ✅ | |
| `onBuildingPress/Click` | ✅ | ✅ | |
| `onDistrictPress/Select` | ✅ | ✅ | |
| `initialZoom` | ❌ | ✅ | Mobile-only |
| `minZoom` | ❌ | ✅ | Mobile-only |
| `maxZoom` | ❌ | ✅ | Mobile-only |
| `zoomToPath` | ✅ | ❌ | |
| `onHover` | ✅ | ❌ | |
| `showGrid` | ✅ | ❌ | |
| `showFileNames` | ✅ | ❌ | |
| `showFileTypeIcons` | ✅ | ✅ | |
| `focusDirectory` | ✅ | ❌ | |
| `isolationMode` | ✅ | ❌ | |
| `transform` | ✅ | ❌ | |

## Priority Features

### High Priority
Features that significantly improve usability:

1. **Zoom to path** - Navigate to specific files/directories programmatically
2. **Isolation mode (transparent)** - Dim non-highlighted buildings for focus
3. **Double-tap to zoom** - Standard mobile gesture for zooming in

### Medium Priority
Features that enhance the experience:

4. **Animated zoom transitions** - Smooth camera movements
5. **Smart text wrapping** - Better directory label readability
6. **File type icons** - Visual identification of file types
7. **Spatial grid hit testing** - Performance for large repos (1000+ files)

### Low Priority
Nice-to-have features:

8. Additional highlight render strategies (glow, pattern)
9. Grid overlay
10. Transform options (rotate/flip)
11. Focus directory highlight

## Implementation Notes

### Web Architecture
- Uses HTML5 Canvas 2D Context
- Rendering in `drawLayeredBuildings.ts` (966 lines)
- Separate draw functions for buildings, districts, grid
- SpatialGrid class for efficient hit testing

### Mobile Architecture
- Uses @shopify/react-native-skia
- Declarative rendering with Skia primitives
- react-native-reanimated for gesture worklets
- LayerIndex for O(1) path lookups (shared with web)

### Key Differences
1. **Rendering paradigm**: Web is imperative (Canvas 2D), Mobile is declarative (Skia React)
2. **Gesture handling**: Web uses mouse events, Mobile uses gesture-handler + reanimated
3. **Text rendering**: Web uses Canvas fillText, Mobile uses Skia Text with font loading
4. **No hover on mobile**: Touch devices don't have hover state

## File References

### Web (web-ade/file-city)
- `/packages/react/src/components/ArchitectureMapHighlightLayers.tsx`
- `/packages/react/src/render/client/drawLayeredBuildings.ts`
- `/packages/react/src/utils/fileColorHighlightLayers.ts`
- `/packages/react/src/utils/fileTypeIcons.ts`
- `/packages/builder/src/types/cityData.ts`

### Mobile (this repo)
- `src/components/FileCity/FileCityCanvas.tsx`
- `src/components/FileCity/drawingUtils.ts`
- `src/components/FileCity/types.ts`
