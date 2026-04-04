# WebGPU 3D Rendering for Mobile App

## Goal

Port the File City 3D visualization from `@principal-ai/file-city-react` (web) to the mobile app using WebGPU.

## Research Summary

### Why Not expo-gl?

| Issue | Details |
|-------|---------|
| **Deprecated backend** | Uses OpenGL, which Apple deprecated on all platforms |
| **Version conflicts** | Expo SDK 53+ uses expo-gl@15, but React Three Fiber requires expo-gl@11 |
| **Simulator issues** | Doesn't work on iOS Simulator or Android emulators |
| **Maintenance burden** | Would require Metal adapter for iOS |

### Recommended: react-native-wgpu

[react-native-wgpu](https://github.com/wcandillon/react-native-webgpu) uses WebGPU via Dawn (Google's WebGPU implementation).

| Feature | Status |
|---------|--------|
| React Native 0.81+ | ✅ (we're on 0.83.2) |
| Three.js r168+ | ✅ Works out of the box |
| React Three Fiber | ✅ Supported with minor patch |
| Platform support | iOS, Android, Web, visionOS, macOS |
| Active development | 1.1k stars, actively maintained |

### Performance

- Skia Graphite (WebGPU backend): **50% faster on iOS**, **200% faster on Android**
- Unified backend — no separate OpenGL/Metal maintenance
- Compute shader support for ML inference

## File City 3D Stack (to port)

Location: `/Users/griever/Developer/web-ade/file-city`

```
packages/
├── builder/    # D3-based layout algorithms (CityData, CityBuilding, CityDistrict)
├── react/      # React Three Fiber 3D visualization (FileCity3D component)
├── server/     # Server-side rendering
└── cli/        # CLI utilities
```

### Key Dependencies (web version)
- `three@^0.175.0`
- `@react-three/fiber@^9.1.2`
- `@react-spring/three@^9.7.5`
- `@react-three/drei@^10.0.6`
- `d3-hierarchy@^3.1.2`

## Implementation Plan

### Phase 1: Setup & Validation

1. **Install dependencies**
   ```bash
   npm install react-native-wgpu three @react-three/fiber @react-three/drei
   ```

2. **Run expo prebuild** (required, no Expo Go support)
   ```bash
   npx expo prebuild
   ```

3. **Configure Metro for Three.js WebGPU**

   Create/update `metro.config.js`:
   ```js
   const { getDefaultConfig } = require('expo/metro-config');

   const config = getDefaultConfig(__dirname);

   config.resolver.resolveRequest = (context, moduleName, platform) => {
     if (moduleName === 'three') {
       return {
         filePath: require.resolve('three/webgpu'),
         type: 'sourceFile',
       };
     }
     return context.resolveRequest(context, moduleName, platform);
   };

   module.exports = config;
   ```

4. **Patch React Three Fiber for WebGPU**

   In `package.json`, add:
   ```json
   {
     "overrides": {
       "@react-three/fiber": {
         "three": "$three"
       }
     }
   }
   ```

5. **Create a minimal test screen**
   ```tsx
   // src/screens/WebGPUTestScreen.tsx
   import React from 'react';
   import { Canvas } from '@react-three/fiber/native';
   import { View } from 'react-native';

   function TestBox() {
     return (
       <mesh>
         <boxGeometry args={[1, 1, 1]} />
         <meshStandardMaterial color="orange" />
       </mesh>
     );
   }

   export function WebGPUTestScreen() {
     return (
       <View style={{ flex: 1 }}>
         <Canvas>
           <ambientLight intensity={0.5} />
           <pointLight position={[10, 10, 10]} />
           <TestBox />
         </Canvas>
       </View>
     );
   }
   ```

6. **Test on physical device**
   ```bash
   npx expo run:ios --device
   ```

### Phase 2: Port File City Components

1. Copy/adapt from `@principal-ai/file-city-react`:
   - `FileCity3D` main component
   - `CityScene` renderer
   - `BuildingGeometry` (instanced mesh)
   - Animation system (`@react-spring/three`)

2. Adjust for mobile:
   - Touch controls instead of mouse
   - Simplified lighting/shadows for performance
   - Reduced polygon counts if needed

### Phase 3: Integration

1. Create a reusable `<FileCity3D />` component for mobile
2. Integrate into Activity Feed or dedicated screen
3. Connect to real repository data

## Testing Approach

### On-Device Testing (Required)

`react-native-wgpu` cannot be tested in:
- Expo Go
- iOS Simulator (limited support)
- Android Emulator (limited support)
- Web-based Storybook (`react-native-web`)

**Must use physical device** with `expo prebuild`.

### Options for Storybook Testing

1. **On-device Storybook**: Install `@storybook/react-native` to run stories on device
2. **Separate test screen**: Add a dev-only screen for WebGPU testing
3. **Web Storybook with browser WebGPU**: Test Three.js code in browser (same API, validates rendering logic)

## iOS Simulator Workaround

If testing on iOS Simulator, disable Metal validation:

1. Xcode → Product → Scheme → Edit Scheme
2. Run → Options → Metal API Validation → Disabled

## Resources

- [react-native-webgpu GitHub](https://github.com/wcandillon/react-native-webgpu)
- [TypeGPU React Native Docs](https://docs.swmansion.com/TypeGPU/integration/react-native/)
- [Software Mansion WebGPU Worklets](https://github.com/software-mansion-labs/react-native-webgpu-worklets)
- [Three.js WebGPU Migration](https://threejs.org/docs/#manual/en/introduction/How-to-use-WebGPU)
- [File City source](/Users/griever/Developer/web-ade/file-city)

## Open Questions

- [ ] Performance on lower-end devices — may need LOD (level of detail) system
- [ ] Memory usage with large codebases (1000+ files)
- [ ] Touch gesture mapping for orbit controls
- [ ] Whether to use WebGPU Worklets for UI thread rendering
