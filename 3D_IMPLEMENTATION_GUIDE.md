# 3D File City Implementation Guide for React Native

## Overview

This guide explains how to implement the 3D File City visualization in React Native, migrating from the 2D Skia implementation to a full 3D experience using React Three Fiber.

## Architecture Comparison

### Web Implementation (FileCity3D.tsx)
- Uses `@react-three/fiber` (React renderer for Three.js)
- Uses `@react-three/drei` for helpers (OrbitControls, PerspectiveCamera, Text)
- Uses `@react-spring/three` for animations
- Renders directly to WebGL canvas

### Current Mobile Implementation (FileCityCanvas.tsx)
- Uses `@shopify/react-native-skia` for 2D rendering
- GPU-accelerated but limited to 2D
- Custom gesture handling with react-native-gesture-handler
- Custom animation with react-native-reanimated

### Target Mobile 3D Implementation
- Use `expo-gl` for WebGL context
- Use `expo-three` to bridge Three.js to React Native
- Reuse `@react-three/fiber` and `@react-three/drei` (already installed!)
- Leverage existing gesture handlers and animations

## Required Dependencies

### Already Installed ✅
```json
{
  "@react-three/drei": "^10.7.7",
  "@react-three/fiber": "^9.5.0",
  "three": "^0.183.2",
  "react-native-gesture-handler": "~2.30.0",
  "react-native-reanimated": "4.2.1"
}
```

### Need to Install 📦
```bash
npx expo install expo-gl expo-three
```

### Optional (for animations matching web)
```bash
npm install @react-spring/three
```

## Implementation Steps

### 1. Create FileCityCanvas3D Component

Create a new file: `src/components/FileCity/FileCityCanvas3D.tsx`

```typescript
import React, { Suspense } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei/native';
import { GLView } from 'expo-gl';

interface FileCityCanvas3DProps {
  cityData: CityData;
  // ... other props from FileCityCanvas
}

export function FileCityCanvas3D({ cityData, ...props }: FileCityCanvas3DProps) {
  return (
    <View style={styles.container}>
      <Canvas
        gl={{ preserveDrawingBuffer: true }}
        camera={{ position: [0, 100, 150], fov: 50 }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 50, 20]} intensity={1} />

          {/* Camera controls */}
          <PerspectiveCamera makeDefault position={[0, 100, 150]} />
          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            minDistance={50}
            maxDistance={500}
            maxPolarAngle={Math.PI / 2.1}
          />

          {/* 3D City Scene */}
          <CityScene cityData={cityData} {...props} />
        </Suspense>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

### 2. Implement CityScene Component

```typescript
function CityScene({ cityData, highlightLayers = [] }) {
  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Districts (flat borders) */}
      {cityData.districts.map((district) => (
        <District key={district.path} district={district} />
      ))}

      {/* Buildings (3D boxes) */}
      {cityData.buildings.map((building) => (
        <Building
          key={building.path}
          building={building}
          highlightLayers={highlightLayers}
        />
      ))}
    </group>
  );
}
```

### 3. Implement Building Component

```typescript
function Building({ building, highlightLayers }) {
  const height = calculateBuildingHeight(building);
  const color = building.color || getFileColor(building.path);

  // Check if building is highlighted
  const highlight = useMemo(() => {
    return highlightLayers.find(layer =>
      layer.enabled &&
      layer.items.some(item => item.path === building.path)
    );
  }, [building.path, highlightLayers]);

  return (
    <mesh
      position={[
        building.position.x,
        height / 2, // Center at half height
        building.position.z,
      ]}
    >
      <boxGeometry args={[
        building.dimensions[0],
        height,
        building.dimensions[2],
      ]} />
      <meshStandardMaterial
        color={highlight?.color || color}
        opacity={highlight ? 1.0 : 0.8}
        transparent
      />
    </mesh>
  );
}
```

### 4. Implement District Component

```typescript
function District({ district }) {
  const { minX, maxX, minZ, maxZ } = district.worldBounds;
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;

  return (
    <mesh position={[centerX, 0.1, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[
        Math.sqrt(width * width + depth * depth) / 2 - 1,
        Math.sqrt(width * width + depth * depth) / 2,
        4,
      ]} />
      <meshBasicMaterial color="#4B5155" transparent opacity={0.3} />
    </mesh>
  );
}
```

### 5. Helper Functions

```typescript
function calculateBuildingHeight(building: CityBuilding): number {
  const minHeight = 2;

  if (building.lineCount !== undefined) {
    const lines = Math.max(building.lineCount, 1);
    return minHeight + Math.log10(lines) * 12;
  } else if (building.size !== undefined) {
    const bytes = Math.max(building.size, 1);
    return minHeight + (Math.log10(bytes) - 2) * 12;
  }

  return building.dimensions[1];
}
```

## Key Differences from Web

### 1. Canvas Import
```typescript
// Web
import { Canvas } from '@react-three/fiber';

// React Native
import { Canvas } from '@react-three/fiber/native';
```

### 2. Drei Imports
```typescript
// Web
import { OrbitControls } from '@react-three/drei';

// React Native
import { OrbitControls } from '@react-three/drei/native';
```

### 3. Device Requirements
- **Must use physical device** - iOS Simulator and Android emulator don't support WebGL well
- Test on iPhone/iPad or Android device

### 4. Metro Configuration
Add to `metro.config.js` if loading 3D models:

```javascript
module.exports = {
  resolver: {
    sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'],
    assetExts: ['glb', 'gltf', 'png', 'jpg', 'obj', 'mtl'],
  },
};
```

## Performance Considerations

### 1. LOD (Level of Detail)
```typescript
// Simplify buildings based on distance from camera
function Building({ building }) {
  const meshRef = useRef();
  const [lod, setLod] = useState('high');

  useFrame(({ camera }) => {
    const distance = camera.position.distanceTo(meshRef.current.position);
    if (distance > 200) setLod('low');
    else if (distance > 100) setLod('medium');
    else setLod('high');
  });

  // Render based on LOD
}
```

### 2. Instancing for Many Buildings
```typescript
import { Instances, Instance } from '@react-three/drei/native';

<Instances limit={1000}>
  <boxGeometry />
  <meshStandardMaterial />
  {buildings.map(building => (
    <Instance
      key={building.path}
      position={[building.position.x, height/2, building.position.z]}
      scale={[building.dimensions[0], height, building.dimensions[2]]}
      color={building.color}
    />
  ))}
</Instances>
```

### 3. Frustum Culling
Three.js automatically culls objects outside the camera view, but you can optimize further:

```typescript
// Set reasonable render distance
camera.far = 1000;
camera.updateProjectionMatrix();
```

## Migration Strategy

### Phase 1: Dual Implementation
- Keep `FileCityCanvas.tsx` (2D Skia) as default
- Add `FileCityCanvas3D.tsx` (3D)
- Add toggle in UI to switch between 2D/3D

### Phase 2: Feature Parity
Implement these features from 2D version:
- ✅ Highlight layers
- ✅ Isolation modes
- ✅ Zoom to path
- ✅ Building/district press handlers
- ✅ Animated transitions

### Phase 3: 3D-Specific Enhancements
- Camera path animations
- Building growth animations
- Interactive tooltips in 3D space
- Shadows and advanced lighting

## Testing

```typescript
// Create a story for 3D canvas
// src/components/FileCity/FileCityCanvas3D.stories.tsx

export default {
  title: 'FileCity/Canvas3D',
  component: FileCityCanvas3D,
};

export const Default = {
  args: {
    cityData: mockCityData,
    enableZoom: true,
    enablePan: true,
  },
};

export const WithHighlights = {
  args: {
    cityData: mockCityData,
    highlightLayers: [
      {
        id: 'test',
        name: 'Test Files',
        enabled: true,
        color: '#00ff00',
        items: [{ path: 'src/test.ts', type: 'file' }],
      },
    ],
  },
};
```

## Resources

- [React Three Fiber Docs](https://docs.pmnd.rs/react-three-fiber)
- [Expo GL Docs](https://docs.expo.dev/versions/latest/sdk/gl-view/)
- [expo-three GitHub](https://github.com/expo/expo-three)
- [Three.js Docs](https://threejs.org/docs/)
- [React Native 3D Tutorial](https://www.iflair.com/beginners-introduction-to-creating-3d-animations-in-react-native-with-three-js/)

## Common Issues

### Issue: "GLView not found"
**Solution**: Run `npx expo install expo-gl`

### Issue: "Cannot render on simulator"
**Solution**: Use a physical device - simulators have limited WebGL support

### Issue: "Metro cannot resolve @react-three/fiber/native"
**Solution**: Clear metro cache: `npx expo start --clear`

### Issue: Performance issues with many buildings
**Solution**: Use instancing (see Performance section) or implement LOD

## Next Steps

1. Install missing dependencies (`expo-gl`, `expo-three`)
2. Create `FileCityCanvas3D.tsx` with basic scene
3. Test on physical device
4. Gradually port features from 2D implementation
5. Add 3D-specific enhancements
6. Performance optimization with LOD and instancing
