# File City 3D Implementation

## Overview

This folder contains both 2D (Skia) and 3D (Three.js) implementations of the File City visualization.

## Components

### ✅ Working Components

- **FileCityCanvas.tsx** - 2D implementation using `@shopify/react-native-skia` (RECOMMENDED)
  - Fast, smooth, GPU-accelerated
  - Full gesture support (pan, zoom, pinch)
  - Works perfectly on all devices

- **FileCityCanvas3D_Direct.tsx** - 3D implementation using `expo-three` Renderer directly
  - True 3D visualization with building heights
  - Auto-rotating camera
  - Supports highlights and isolation modes
  - ⚠️ Must use `three@0.166.1` (exact version required by expo-three@8.0.0)

### 🧪 Debug Components (in `__debug__/`)

Test components used during 3D implementation debugging:
- `MinimalGLTest.tsx` - Raw WebGL test (pink triangle)
- `DirectThreeTest.tsx` - Three.js spinning cube test
- `FileCityCanvas3D.test.tsx` - React Three Fiber test (doesn't work in RN)

These can be safely removed if not needed for future debugging.

## Important Notes

### Three.js Version Requirement ⚠️

**DO NOT upgrade `three` beyond v0.166.1** without testing!

```json
{
  "three": "^0.166.1",  // Required by expo-three@8.0.0
  "expo-three": "^8.0.0"
}
```

expo-three v8.0.0 has a peer dependency on `three@^0.166.0`. Using a newer version (like 0.183.2) will cause 3D rendering to fail silently.

### Why Not React Three Fiber?

React Three Fiber (`@react-three/fiber`) does **not work** in React Native:
- Components like `OrbitControls` require DOM APIs
- Canvas rendering fails silently on mobile
- Raw WebGL works, but R3F's abstractions don't

Instead, we use `expo-three`'s Renderer directly with Three.js.

### Dependencies Required for 3D

```json
{
  "expo-gl": "~55.0.13",           // WebGL context provider
  "expo-three": "^8.0.0",          // Three.js bridge for Expo
  "three": "^0.166.1",             // Three.js (exact version!)
  "@react-three/fiber": "^9.5.0",  // Not used, but installed
  "@react-three/drei": "^10.7.7"   // Not used, but installed
}
```

## Testing

### Storybook Stories

**2D Canvas:**
- Components/FileCityCanvas - Multiple stories for 2D version

**3D Canvas:**
- Components/FileCityCanvas3D_Direct - Multiple stories for 3D version

**Debug Tests:**
- Debug/MinimalGLTest - Raw WebGL triangle (verifies WebGL works)
- Debug/DirectThreeTest - Three.js cube (verifies Three.js works)
- Debug/Simple3DTest - React Three Fiber test (confirms R3F doesn't work)

### Device Requirements

⚠️ **Physical device required for 3D testing** - iOS Simulator and Android Emulator have limited WebGL support.

## File Structure

```
src/components/FileCity/
├── FileCityCanvas.tsx              # ✅ 2D Skia version (recommended)
├── FileCityCanvas.stories.tsx      # Storybook for 2D
├── FileCityCanvas3D_Direct.tsx     # ✅ 3D expo-three version
├── FileCityCanvas3D_Direct.stories.tsx  # Storybook for 3D
├── types.ts                        # Shared types
├── mockData.ts                     # Test data generator
├── animationUtils.ts               # Animation helpers
├── drawingUtils.ts                 # 2D drawing utilities
├── lucideIcons.ts                  # Icon helpers
├── __debug__/                      # Debug test components
│   ├── MinimalGLTest.tsx
│   ├── DirectThreeTest.tsx
│   └── ...
└── README_3D.md                    # This file
```

## Performance

### 2D (Skia)
- Renders 100+ buildings at 60fps
- Instant response to gestures
- Small bundle size

### 3D (Three.js)
- Renders 40-50 buildings smoothly
- Auto-rotating camera (no manual controls yet)
- Larger bundle size due to Three.js
- Better for detailed file size visualization

## Future Enhancements

Potential improvements for 3D version:
- [ ] Manual camera controls (touch gestures)
- [ ] Building selection with touch
- [ ] Animated camera transitions
- [ ] LOD (Level of Detail) for large codebases
- [ ] Instanced rendering for better performance
- [ ] Upgrade to newer Three.js when expo-three supports it

## Troubleshooting

### 3D View is Blank

1. Check Three.js version: `npm list three`
   - Should show `three@0.166.1`
   - If different, run: `npm install three@0.166.1 --legacy-peer-deps`

2. Test on physical device (not simulator)

3. Check debug tests in Storybook:
   - Debug/MinimalGLTest - Should show pink triangle
   - Debug/DirectThreeTest - Should show spinning pink cube
   - If these work, the issue is with FileCityCanvas3D_Direct

### Camera Shows Nothing

The camera auto-rotates around the city center. If you see nothing:
- Try "Medium Project" story (has more buildings)
- "Simple Project" has only 11 buildings spread across large area

## References

- [expo-three Documentation](https://github.com/expo/expo-three)
- [Three.js Documentation](https://threejs.org/docs/)
- [3D_IMPLEMENTATION_GUIDE.md](../../../3D_IMPLEMENTATION_GUIDE.md) - Detailed implementation notes
