# Three.js Package Warnings

## Issue Overview

When running the development server, you may see warnings about invalid package.json configuration in the `three` package:

```
WARN  The package /Users/griever/Developer/mobile-app/node_modules/three contains an invalid package.json configuration.
Reason: The resolution for "/Users/griever/Developer/mobile-app/node_modules/three/examples/jsm/loaders/ColladaLoader" defined in "exports" is /Users/griever/Developer/mobile-app/node_modules/three/examples/jsm/loaders/ColladaLoader, however this file does not exist. Falling back to file-based resolution.

WARN  The package /Users/griever/Developer/mobile-app/node_modules/three/examples/jsm/loaders/MTLLoader" defined in "exports" is /Users/griever/Developer/mobile-app/node_modules/three/examples/jsm/loaders/MTLLoader, however this file does not exist. Falling back to file-based resolution.

WARN  The package /Users/griever/Developer/mobile-app/node_modules/three/examples/jsm/loaders/OBJLoader" defined in "exports" is /Users/griever/Developer/mobile-app/node_modules/three/examples/jsm/loaders/OBJLoader, however this file does not exist. Falling back to file-based resolution.
```

## Root Cause

The `three` package (v0.166.1) has declared export paths in its package.json for certain 3D model loaders that don't actually exist at those paths:
- `ColladaLoader` (.dae files)
- `MTLLoader` (material template library files)
- `OBJLoader` (.obj 3D model files)

The bundler falls back to file-based resolution, so this doesn't break functionality.

## Why We Can't Fix It (Yet)

### Current Dependency Chain:
- **Our app** uses `expo-three@8.0.0` for rendering Three.js in React Native
- **expo-three@8.0.0** has peer dependency: `three@^0.166.0`
- **Latest three.js** is v0.183.2

### Why We Can't Update:
1. Updating `three` to latest (0.183.2) breaks compatibility with `expo-three@8.0.0`
2. `expo-three@8.0.0` is the latest version available (as of April 14, 2026)
3. No newer version of `expo-three` exists that supports newer `three` versions

### Investigation Summary (April 14, 2026):
- ✅ Confirmed `three` is actively used in FileCity 3D components:
  - `src/components/FileCity/FileCityCanvas3D_Direct.tsx`
  - `src/components/FileCity/__debug__/FileCityCanvas3D.test.tsx`
  - `src/components/FileCity/__debug__/DirectThreeTest.tsx`
- ✅ Confirmed none of the missing loaders (Collada, MTL, OBJ) are used in our code
- ✅ Attempted update to `three@latest` → Failed due to `expo-three` peer dependency conflict
- ✅ Checked for newer `expo-three` versions → None available

## Impact Assessment

### Severity: LOW ⚠️

- **No functional impact**: The bundler successfully falls back to file-based resolution
- **No performance impact**: We don't use the affected loaders
- **No security impact**: This is a packaging/export configuration issue, not a vulnerability

### What We Actually Use from Three.js:
- Basic geometries (BoxGeometry, PlaneGeometry)
- Materials (MeshStandardMaterial, MeshBasicMaterial)
- Scene, Camera, Renderer
- Lights (AmbientLight, DirectionalLight)

We do NOT use any of the missing loaders (ColladaLoader, MTLLoader, OBJLoader).

## Possible Future Solutions

### Option 1: Wait for expo-three Update
Monitor for new `expo-three` releases that support newer `three` versions:
```bash
npm view expo-three versions
```

### Option 2: Switch to @react-three/fiber (If it supports React Native)
Currently, we use `expo-three` directly because React Three Fiber doesn't fully support React Native. Re-evaluate if this changes:
- Check: https://github.com/pmndrs/react-three-fiber/issues

### Option 3: Fork expo-three
If `expo-three` is no longer maintained:
1. Fork the repository
2. Update peer dependencies to support newer `three` versions
3. Test compatibility
4. Use our fork until official support is available

### Option 4: Use --legacy-peer-deps (NOT RECOMMENDED)
Force install newer `three` version:
```bash
npm install three@latest --legacy-peer-deps
```
**Risk**: May cause runtime errors with `expo-three`

## Recommendation

**SAFE TO IGNORE** these warnings. They are:
- Cosmetic (don't affect functionality)
- Expected (given our dependency constraints)
- Monitored (documented here for future reference)

## Related Files

- `package.json` - Dependencies configuration
- `src/components/FileCity/FileCityCanvas3D_Direct.tsx` - Main FileCity 3D component
- Node modules: `three@0.166.1`, `expo-three@8.0.0`

## Last Updated

April 14, 2026 - Initial investigation and documentation
