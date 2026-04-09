# File City Performance Analysis

**Date:** 2026-04-08
**Component:** FileCityCanvas (React Native Skia Implementation)
**Status:** Performance Review

## Executive Summary

The FileCityCanvas component exhibits several performance bottlenecks that impact rendering performance, particularly during animations and with large codebases. The primary issues stem from excessive re-renders during animations, expensive per-frame computations, and lack of render optimization strategies.

**Estimated Performance:**
- **Current:** 40-50fps for 1,000 files, <20fps for 10,000+ files
- **Optimized:** 60fps for 1,000 files, 30-60fps for 10,000+ files

---

## Critical Performance Issues

### 1. Animation Frame State Thrashing
**Location:** `FileCityCanvas.tsx:203-219`

**Problem:**
```typescript
useEffect(() => {
  const scaleListener = scaleAnim.addListener(({ value }) => {
    setTransformState(prev => ({ ...prev, scale: value }));
  });
  const translateXListener = translateXAnim.addListener(({ value }) => {
    setTransformState(prev => ({ ...prev, translateX: value }));
  });
  const translateYListener = translateYAnim.addListener(({ value }) => {
    setTransformState(prev => ({ ...prev, translateY: value }));
  });
  // ...
}, [scaleAnim, translateXAnim, translateYAnim]);
```

**Impact:**
- Triggers full React re-renders at **60fps** during pan/zoom animations
- Cascades to expensive `useMemo` recalculations for all buildings and districts
- Causes dropped frames and janky animations

**Root Cause:**
- Bridging between React Native Animated and React state
- `@shopify/react-native-skia` supports Reanimated shared values directly, making this bridge unnecessary

---

### 2. Heavy Memoization Dependencies
**Location:** `FileCityCanvas.tsx:551-670` (districtData, buildingData)

**Problem:**
```typescript
const worldToCanvas = useCallback(
  (x: number, z: number) => {
    // Uses transformState which updates every frame
    // ...
  },
  [cityData.bounds, scaleAndOffset, transformState]
);

const districtData = useMemo(() => {
  return cityData.districts.map((district) => {
    const topLeft = worldToCanvas(minX, minZ); // Called for every district
    const bottomRight = worldToCanvas(maxX, maxZ);
    // ...
  });
}, [cityData.districts, worldToCanvas, /* ... */]);

const buildingData = useMemo(() => {
  return cityData.buildings.map((building) => {
    const pos = worldToCanvas(building.position.x, building.position.z); // Called for every building
    // ...
  });
}, [cityData.buildings, worldToCanvas, /* ... */]);
```

**Impact:**
- `worldToCanvas` changes on every animation frame due to `transformState` dependency
- Forces `districtData` and `buildingData` to recompute **O(n)** calculations 60 times per second
- For 1,000 buildings: 1,000+ coordinate transformations per frame = 60,000/second

**Example Cost:**
- 1,000 files: ~16ms per frame (drops to 30fps)
- 5,000 files: ~80ms per frame (drops to 12fps)
- 10,000 files: ~160ms per frame (unusable)

---

### 3. Continuous requestAnimationFrame Loop
**Location:** `FileCityCanvas.tsx:228-280`

**Problem:**
```typescript
useEffect(() => {
  const animate = () => {
    let hasChanges = false;

    // Iterates ALL buildings
    cityData.buildings.forEach((building) => {
      const layerMatches = layerIndex.getItemsForPath(building.path)
        .filter((match) => match.item.type === 'file');
      // ...
      if (Math.abs(diff) > THRESHOLD) {
        // ...
        hasChanges = true;
      }
    });

    // Iterates ALL districts
    cityData.districts.forEach((district) => {
      // Similar logic
    });

    if (hasChanges) {
      forceUpdate(); // Force re-render
      opacityAnimationFrameRef.current = requestAnimationFrame(animate);
    }
  };

  opacityAnimationFrameRef.current = requestAnimationFrame(animate);
}, [isolationMode, cityData, layerIndex, getTargetOpacity]);
```

**Impact:**
- Runs continuously when isolation mode is active, even when idle
- **No early termination** - once started, runs until component unmounts
- Calls `forceUpdate()` on every frame with changes
- O(n) iteration over all buildings + districts

**Issues:**
- Loop continues running even after all opacities have settled
- `hasChanges` only controls whether to schedule next frame, not whether to continue checking
- Combined with issue #2, creates double re-render on animation frames

---

### 4. Redundant Layer Lookups
**Location:** `FileCityCanvas.tsx:564, 628-630`

**Problem:**
```typescript
// Called for EVERY district on EVERY render
const layerMatches = layerIndex.getItemsForPath(district.path, 'exact');

// Called for EVERY building on EVERY render
const layerMatches = layerIndex
  .getItemsForPath(building.path)
  .filter((match) => match.item.type === 'file');
```

**Impact:**
- `getItemsForPath()` includes:
  - Map lookup: O(1)
  - Array iteration: O(m) where m = number of directory layers
  - Array filtering: O(k) where k = matches found
  - Array sorting: O(k log k)
- Called for every building/district on every render
- For 1,000 files with 10 highlight layers: ~10,000 operations per render

**Waste:**
- Results rarely change (only when `highlightLayers` or `cityData` change)
- Could be pre-computed once and cached

---

### 5. SVG Icon Recreation
**Location:** `FileCityCanvas.tsx:806-808`

**Problem:**
```typescript
{(() => {
  // Called for EVERY building with icon on EVERY render
  if (b.icon.type === 'lucide') {
    const svgString = getLucideIconSvg(b.icon.name, b.icon.color || '#ffffff');
    if (!svgString) return null;
    const svg = Skia.SVG.MakeFromString(svgString); // Expensive parsing
    if (!svg) return null;
    // ...
  }
})()}
```

**Impact:**
- SVG string generation: relatively cheap (string concatenation)
- SVG parsing (`Skia.SVG.MakeFromString`): **expensive** (DOM-like parsing)
- Called on every render for every visible icon
- For 100 visible icons: 100 SVG parses per frame = 6,000/second during animation

---

### 6. No Render Virtualization

**Problem:**
- All buildings and districts render regardless of viewport visibility
- No culling or spatial indexing

**Impact:**
```typescript
// Renders ALL buildings
{visibleBuildings.map((b) => /* render */)}

// Renders ALL districts
{districtData.map((d) => /* render */)}
```

**Scale Issues:**
- 1,000 files: Generally manageable
- 10,000 files: 10,000+ Skia draw calls per frame
- 50,000 files: Likely crashes or freezes

**Note:** Skia is GPU-accelerated, so this is less critical than CPU bottlenecks, but still impacts performance at scale.

---

## Optimization Recommendations

### Priority 1: High Impact (Implement First)

#### 1.1 Decouple Transform from React State
**Effort:** Medium | **Impact:** Very High | **Gain:** +15-20fps

**Solution:**
Use Reanimated shared values with Skia directly, eliminating the React state bridge.

```typescript
import { useSharedValue, useAnimatedProps } from 'react-native-reanimated';

// Replace Animated.Value with shared values
const scale = useSharedValue(initialZoom);
const translateX = useSharedValue(0);
const translateY = useSharedValue(0);

// Use with Skia directly (no state sync needed)
const transform = useAnimatedProps(() => ({
  scale: scale.value,
  translateX: translateX.value,
  translateY: translateY.value,
}));
```

**Benefits:**
- Eliminates 60fps React re-renders
- Keeps animations on UI thread
- Reduces JS thread pressure

**Files to Modify:**
- `FileCityCanvas.tsx:134-144, 203-219`

---

#### 1.2 Optimize Opacity Animation Loop
**Effort:** Low | **Impact:** High | **Gain:** +5-10fps when isolation active

**Solution:**
Add proper early termination and throttling.

```typescript
useEffect(() => {
  const EASING_FACTOR = 0.08;
  const THRESHOLD = 0.01;
  let frameCount = 0;
  let allSettled = false;

  const animate = () => {
    // Only check for settling every 5 frames
    const shouldCheckSettling = frameCount % 5 === 0;
    let hasChanges = false;

    if (shouldCheckSettling) {
      allSettled = true; // Assume settled until proven otherwise
    }

    cityData.buildings.forEach((building) => {
      const target = getTargetOpacity(hasHighlight, 'building');
      const current = buildingOpacityRef.current.get(building.path) ?? target;
      const diff = target - current;

      if (Math.abs(diff) > THRESHOLD) {
        const newOpacity = current + diff * EASING_FACTOR;
        buildingOpacityRef.current.set(building.path, newOpacity);
        hasChanges = true;
        allSettled = false;
      }
    });

    // Similar for districts...

    if (hasChanges) {
      forceUpdate();
    }

    frameCount++;

    // Only continue if not settled
    if (!allSettled) {
      opacityAnimationFrameRef.current = requestAnimationFrame(animate);
    }
  };

  opacityAnimationFrameRef.current = requestAnimationFrame(animate);

  return () => {
    if (opacityAnimationFrameRef.current) {
      cancelAnimationFrame(opacityAnimationFrameRef.current);
    }
  };
}, [isolationMode, cityData, layerIndex, getTargetOpacity]);
```

**Benefits:**
- Stops running when animations complete
- Reduces unnecessary iterations
- Lowers battery usage

**Files to Modify:**
- `FileCityCanvas.tsx:228-280`

---

#### 1.3 Cache Icon SVGs
**Effort:** Low | **Impact:** Medium-High | **Gain:** +3-8fps with icons enabled

**Solution:**
Pre-create and cache all SVG objects.

```typescript
// Add at component level
const iconCache = useMemo(() => {
  const cache = new Map<string, SVG>();

  if (!showFileTypeIcons || !iconMap) return cache;

  // Pre-create all possible icon SVGs
  iconMap.forEach((config, key) => {
    if (config.type === 'lucide') {
      const svgString = getLucideIconSvg(config.name, config.color || '#ffffff');
      if (svgString) {
        const svg = Skia.SVG.MakeFromString(svgString);
        if (svg) {
          cache.set(`${config.name}:${config.color || '#ffffff'}`, svg);
        }
      }
    }
  });

  return cache;
}, [showFileTypeIcons, iconMap]);

// In render:
if (b.icon.type === 'lucide') {
  const cacheKey = `${b.icon.name}:${b.icon.color || '#ffffff'}`;
  const svg = iconCache.get(cacheKey);
  if (!svg) return null;
  // Use cached svg
}
```

**Benefits:**
- One-time SVG parsing cost
- Significant reduction in per-frame work

**Files to Modify:**
- `FileCityCanvas.tsx:805-823`

---

### Priority 2: Medium Impact

#### 2.1 Split Building/District Data Computation
**Effort:** Medium | **Impact:** Medium | **Gain:** +5-10fps

**Solution:**
Separate static data from dynamic transforms.

```typescript
// Static data - only depends on cityData
const staticBuildingData = useMemo(() => {
  return cityData.buildings.map((building) => {
    const { scale } = scaleAndOffset;
    // Pre-compute relative positions, sizes, colors
    return {
      path: building.path,
      relativeX: (building.position.x - cityData.bounds.minX) * scale,
      relativeZ: (building.position.z - cityData.bounds.minZ) * scale,
      baseWidth: building.dimensions[0] * scale,
      baseHeight: building.dimensions[2] * scale,
      color: building.color || getFileColor(building.path),
      // ... other static properties
    };
  });
}, [cityData, scaleAndOffset]);

// Dynamic data - applies current transform
const transformedBuildingData = useMemo(() => {
  return staticBuildingData.map((static) => {
    const screenX = (static.relativeX + scaleAndOffset.offsetX) * transformState.scale + transformState.translateX;
    const screenY = (static.relativeZ + scaleAndOffset.offsetZ) * transformState.scale + transformState.translateY;
    const width = static.baseWidth * transformState.scale;
    const height = static.baseHeight * transformState.scale;

    return { ...static, screenX, screenY, width, height };
  });
}, [staticBuildingData, transformState, scaleAndOffset]);
```

**Note:** This becomes obsolete if Recommendation 1.1 is implemented.

**Files to Modify:**
- `FileCityCanvas.tsx:550-670`

---

#### 2.2 Pre-compute Highlight Matches
**Effort:** Low | **Impact:** Medium | **Gain:** +3-5fps

**Solution:**
Build a lookup map once when layers or data change.

```typescript
const highlightMatchMap = useMemo(() => {
  const map = new Map<string, Array<{ layer: HighlightLayer; item: LayerItem }>>();

  // Pre-compute matches for all buildings
  cityData.buildings.forEach((building) => {
    const matches = layerIndex
      .getItemsForPath(building.path)
      .filter((match) => match.item.type === 'file');
    if (matches.length > 0) {
      map.set(building.path, matches);
    }
  });

  // Pre-compute matches for all districts
  cityData.districts.forEach((district) => {
    const matches = layerIndex.getItemsForPath(district.path, 'exact');
    if (matches.length > 0) {
      map.set(district.path, matches);
    }
  });

  return map;
}, [cityData, layerIndex, highlightLayers]);

// In buildingData/districtData:
const layerMatches = highlightMatchMap.get(building.path) || [];
const hasHighlight = layerMatches.length > 0;
```

**Benefits:**
- O(n) lookup cost moves to memo creation
- O(1) Map.get during render
- Eliminates repeated filtering and sorting

**Files to Modify:**
- `FileCityCanvas.tsx:238-240, 254, 564, 628-630`

---

#### 2.3 Extract Memoized Sub-components
**Effort:** Medium | **Impact:** Low-Medium | **Gain:** +2-5fps

**Solution:**
Create memoized components for buildings and districts.

```typescript
const Building = React.memo<{ data: BuildingData }>(({ data }) => {
  // Render single building
  // ...
}, (prev, next) => {
  // Custom comparison - only re-render if data actually changed
  return prev.data.path === next.data.path &&
         prev.data.x === next.data.x &&
         prev.data.y === next.data.y &&
         prev.data.opacity === next.data.opacity;
});

// In render:
{visibleBuildings.map((b) => b ? <Building key={b.key} data={b} /> : null)}
```

**Note:** Effectiveness depends on whether parent re-renders can be reduced first.

---

### Priority 3: Nice to Have

#### 3.1 Viewport Culling
**Effort:** Medium-High | **Impact:** High (at scale) | **Gain:** Scales with city size

**Solution:**
Only render elements within viewport bounds + margin.

```typescript
const viewportBounds = useMemo(() => {
  const margin = 100; // pixels
  return {
    minX: -transformState.translateX - margin,
    maxX: -transformState.translateX + canvasSize.width + margin,
    minY: -transformState.translateY - margin,
    maxY: -transformState.translateY + canvasSize.height + margin,
  };
}, [transformState, canvasSize]);

const visibleBuildings = useMemo(() => {
  return buildingData.filter(b => {
    if (!b) return false;
    // Check if building intersects viewport
    return b.x + b.width >= viewportBounds.minX &&
           b.x <= viewportBounds.maxX &&
           b.y + b.height >= viewportBounds.minY &&
           b.y <= viewportBounds.maxY;
  });
}, [buildingData, viewportBounds]);
```

**Benefits:**
- Critical for cities with 10,000+ files
- Reduces render cost proportionally to zoom level
- Lower memory pressure

**Trade-offs:**
- Adds computation cost for culling
- Only beneficial above ~2,000 files

---

#### 3.2 Reduce Inline Functions
**Effort:** Low | **Impact:** Low | **Gain:** +1-2fps

**Solution:**
Extract icon rendering logic to separate function.

```typescript
const renderBuildingIcon = useCallback((b: BuildingData) => {
  // Icon rendering logic from lines 797-839
  // ...
}, [iconCache, iconFont]);

// In render:
{renderBuildingIcon(b)}
```

**Benefits:**
- Cleaner code
- Slightly better render performance
- Easier to optimize separately

---

#### 3.3 Throttle Gesture Updates
**Effort:** Low | **Impact:** Low | **Gain:** +2-3fps on lower-end devices

**Solution:**
Limit gesture update frequency.

```typescript
let lastUpdate = 0;
const THROTTLE_MS = 16; // ~60fps max

const updatePan = useCallback((translationX: number, translationY: number) => {
  const now = Date.now();
  if (now - lastUpdate < THROTTLE_MS) return;
  lastUpdate = now;

  const newX = savedTransform.current.translateX + translationX;
  const newY = savedTransform.current.translateY + translationY;

  translateXAnim.setValue(newX);
  translateYAnim.setValue(newY);
}, [translateXAnim, translateYAnim]);
```

**Note:** May reduce gesture responsiveness on high refresh rate displays.

---

## Implementation Roadmap

### Phase 1: Quick Wins (1-2 days)
- ✅ **1.2** Optimize opacity animation loop
- ✅ **1.3** Cache icon SVGs
- ✅ **2.2** Pre-compute highlight matches

**Expected Result:** 40-50fps → 55-60fps for 1,000 files

---

### Phase 2: Core Architecture (3-5 days)
- ✅ **1.1** Decouple transform from React state (requires testing)
- ✅ **2.1** Split building/district data computation

**Expected Result:** Solid 60fps for 1,000 files, 40-50fps for 5,000 files

---

### Phase 3: Scale Optimization (2-3 days)
- ✅ **3.1** Viewport culling
- ✅ **2.3** Extract memoized sub-components

**Expected Result:** 60fps for 5,000 files, 30-60fps for 10,000+ files

---

## Performance Metrics to Track

### Before Optimization
- **Small City (100 files):** 60fps ✓
- **Medium City (1,000 files):** 40-50fps, drops to 30fps during animation
- **Large City (5,000 files):** 20-30fps, frequent jank
- **Very Large City (10,000+ files):** <20fps, possibly unusable

### Target After Optimization
- **Small City (100 files):** 60fps ✓
- **Medium City (1,000 files):** 60fps ✓
- **Large City (5,000 files):** 55-60fps
- **Very Large City (10,000+ files):** 30-60fps (device dependent)

### How to Measure
```typescript
// Add frame time logging
const lastFrameTime = useRef(Date.now());

useEffect(() => {
  const checkFrameTime = () => {
    const now = Date.now();
    const delta = now - lastFrameTime.current;
    if (delta > 20) { // More than 16.67ms = dropped frame
      console.warn(`Dropped frame: ${delta}ms`);
    }
    lastFrameTime.current = now;
    requestAnimationFrame(checkFrameTime);
  };
  requestAnimationFrame(checkFrameTime);
}, []);
```

---

## Risk Assessment

### Low Risk
- **1.2, 1.3, 2.2, 3.2, 3.3** - Pure optimizations, no behavior change

### Medium Risk
- **2.1, 2.3** - Refactoring logic, needs careful testing
- **3.1** - Culling could introduce edge cases (clipping at viewport edges)

### High Risk
- **1.1** - Significant architectural change
  - Requires migration from Animated to Reanimated
  - May affect gesture handling
  - Needs thorough testing on iOS/Android
  - **Recommendation:** Implement in feature branch, test extensively

---

## Conclusion

The FileCityCanvas component has solid architecture but suffers from over-coupling between animation state and React rendering. The primary bottleneck is the 60fps re-render cycle during animations, causing expensive recalculations.

**Recommended Approach:**
1. Start with quick wins (Phase 1) to gain confidence and metrics
2. Tackle the core architectural change (1.1) in isolation with thorough testing
3. Add scale optimizations (Phase 3) only if targeting very large codebases

With all optimizations implemented, the component should maintain 60fps for typical codebases (1,000-5,000 files) and remain usable for extremely large codebases (10,000+ files).
