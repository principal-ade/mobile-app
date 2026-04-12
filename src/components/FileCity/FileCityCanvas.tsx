/**
 * FileCityCanvas - React Native Skia implementation of File City visualization
 *
 * GPU-accelerated rendering using @shopify/react-native-skia.
 * Uses react-native-reanimated for gesture handling.
 */

import React, { useMemo, useCallback, useState, useRef, useEffect, useReducer } from 'react';
import { View, StyleSheet, LayoutChangeEvent, Easing } from 'react-native';
import {
  Canvas,
  RoundedRect,
  Group,
  Text,
  useFont,
  Skia,
  Paint,
  ImageSVG,
} from '@shopify/react-native-skia';
import { getLucideIconSvg } from './lucideIcons';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import {
  runOnJS,
  useSharedValue,
  useAnimatedReaction,
  useDerivedValue,
  withTiming,
  withSpring,
  Easing as ReanimatedEasing,
} from 'react-native-reanimated';

import type { LayerRenderStrategy, HighlightLayer, LayerItem } from '@principal-ai/file-city-builder';
import { getFileColor } from '@principal-ai/file-city-builder';
import { FileCityCanvasProps, TransformState, FileTypeIconConfig } from './types';
import {
  calculateScaleAndOffset,
  LayerIndex,
  findHitTarget,
} from './drawingUtils';
import {
  findTargetBounds,
  calculateZoomTarget,
  calculateAnimationDuration,
  type ZoomTarget,
} from './animationUtils';

const DEFAULT_BACKGROUND_COLOR = '#1a1a2e';
const DEFAULT_DISTRICT_COLOR = '#4B5155';


// Parse hex color to Skia color
function hexToSkiaColor(hex: string, alpha: number = 1) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return Skia.Color('rgba(75, 80, 85, 1)');

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  return Skia.Color(`rgba(${r}, ${g}, ${b}, ${alpha})`);
}

function adjustColorBrightness(hex: string, amount: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;

  const r = Math.min(255, Math.max(0, parseInt(result[1], 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(result[2], 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(result[3], 16) + amount));

  return `rgb(${r}, ${g}, ${b})`;
}

// Get file type icon for a given path
function getFileTypeIcon(
  filePath: string,
  iconMap: Map<string, FileTypeIconConfig> | undefined,
): FileTypeIconConfig | null {
  if (!iconMap) return null;

  const lastSlash = filePath.lastIndexOf('/');
  const fileName = lastSlash === -1 ? filePath : filePath.substring(lastSlash + 1);

  // Check exact filename match first (e.g., "package.json")
  if (iconMap.has(fileName)) {
    return iconMap.get(fileName) || null;
  }

  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1 || lastDot === fileName.length - 1) {
    return null;
  }

  // Check compound extensions (longest first)
  const sortedExtensions = Array.from(iconMap.keys()).sort((a, b) => b.length - a.length);
  const lowerFileName = fileName.toLowerCase();

  for (const ext of sortedExtensions) {
    if (ext.startsWith('.') && lowerFileName.endsWith(ext)) {
      return iconMap.get(ext) || null;
    }
  }

  return null;
}

export function FileCityCanvas({
  cityData,
  highlightLayers = [],
  backgroundColor = DEFAULT_BACKGROUND_COLOR,
  defaultDistrictColor = DEFAULT_DISTRICT_COLOR,
  buildingBorderRadius = 0,
  districtBorderRadius = 0,
  showDirectoryLabels = true,
  showFileTypeIcons = false,
  iconMap,
  enableZoom = true,
  enablePan = true,
  onBuildingPress,
  onDistrictPress,
  initialZoom = 1,
  minZoom = 0.5,
  maxZoom = 5,
  animateZoom = true,
  animatePan = true,
  zoomAnimationSpeed: _zoomAnimationSpeed = 0.12,
  zoomToPath,
  onZoomComplete,
  zoomPadding = 0.8,
  isolationMode = 'none',
}: FileCityCanvasProps) {
  const [canvasSize, setCanvasSize] = useState({ width: 300, height: 300 });

  // Load fonts for labels and icons
  const font = useFont(null, 10);
  const iconFont = useFont(null, 16);

  // Shared values for smooth zoom/pan transitions (no React re-renders)
  // Skia components can use these directly for GPU-accelerated animations
  const scale = useSharedValue(initialZoom);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Create transform matrix for Skia from shared values
  const transform = useDerivedValue(() => {
    return [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ];
  }, [scale, translateX, translateY]);

  // Transform state (only updated when animation completes for hit testing)
  const [transformState, setTransformState] = useState<TransformState>({
    scale: initialZoom,
    translateX: 0,
    translateY: 0,
  });

  // Animation tracking
  const isAnimating = useSharedValue(false);

  // Refs for gesture tracking
  const savedTransform = useRef({ scale: initialZoom, translateX: 0, translateY: 0 });

  // Opacity tracking for isolation modes
  const buildingOpacityRef = useRef<Map<string, number>>(new Map());
  const districtOpacityRef = useRef<Map<string, number>>(new Map());
  const opacityAnimationFrameRef = useRef<number | null>(null);
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  // Build layer index for O(1) lookups
  const layerIndex = useMemo(
    () => new LayerIndex(highlightLayers),
    [highlightLayers]
  );

  // Pre-compute highlight matches for all buildings and districts
  // This eliminates repeated layerIndex.getItemsForPath() calls
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

    // Pre-compute matches for all districts (only directory-type items)
    cityData.districts.forEach((district) => {
      const allMatches = layerIndex.getItemsForPath(district.path, 'exact');
      const matches = allMatches.filter((match) => match.item.type === 'directory');

      if (allMatches.length > 0 && matches.length === 0) {
        // Remove any building entry with the same path to prevent districts from using file highlights
        map.delete(district.path);
      }

      if (matches.length > 0) {
        map.set(district.path, matches);
      }
    });

    return map;
  }, [cityData, layerIndex]);

  // Detect if highlights are active (for isolation mode)
  const hasActiveHighlights = useMemo(() => {
    return highlightLayers.some(layer => layer.enabled && layer.items.length > 0);
  }, [highlightLayers]);

  // Determine if isolation should be active
  const shouldIsolate = hasActiveHighlights && isolationMode !== 'none';

  // Opacity configuration for isolation modes
  const OPACITY_CONFIGS = {
    none: {
      building: { highlighted: 1.0, normal: 0.6 },
      district: { highlighted: 0.8, normal: 0.6 },
    },
    transparent: {
      building: { highlighted: 1.0, normal: 0.3 },
      district: { highlighted: 0.8, normal: 0.3 },
    },
    hide: {
      building: { highlighted: 1.0, normal: 0 },
      district: { highlighted: 0.8, normal: 0.3 },
    },
  };

  // Get target opacity for a building or district
  const getTargetOpacity = useCallback(
    (hasHighlight: boolean, type: 'building' | 'district'): number => {
      if (!shouldIsolate) {
        // No isolation - show all normally
        return OPACITY_CONFIGS.none[type].normal;
      }

      const config = OPACITY_CONFIGS[isolationMode][type];
      return hasHighlight ? config.highlighted : config.normal;
    },
    [shouldIsolate, isolationMode]
  );

  // Only sync shared values to React state when animation completes (for hit testing)
  // This prevents 60fps re-renders during animations
  useAnimatedReaction(
    () => ({
      scale: scale.value,
      translateX: translateX.value,
      translateY: translateY.value,
      animating: isAnimating.value,
    }),
    (current, previous) => {
      // Only update React state when animation stops or values significantly change
      if (!current.animating && previous?.animating) {
        runOnJS(setTransformState)({
          scale: current.scale,
          translateX: current.translateX,
          translateY: current.translateY,
        });
      }
    },
    [scale, translateX, translateY, isAnimating]
  );

  // Calculate scale and offset
  const scaleAndOffset = useMemo(
    () => calculateScaleAndOffset(cityData, canvasSize.width, canvasSize.height),
    [cityData, canvasSize]
  );

  // Opacity animation loop for isolation modes
  useEffect(() => {
    const EASING_FACTOR = 0.08; // Match web 3D
    const THRESHOLD = 0.01;
    let frameCount = 0;
    let allSettled = false;

    const animate = () => {
      // Only check for settling every 5 frames to reduce overhead
      const shouldCheckSettling = frameCount % 5 === 0;
      let hasChanges = false;

      if (shouldCheckSettling) {
        allSettled = true; // Assume settled until proven otherwise
      }

      // Animate building opacities
      cityData.buildings.forEach((building) => {
        const hasHighlight = highlightMatchMap.has(building.path);
        const target = getTargetOpacity(hasHighlight, 'building');
        const current = buildingOpacityRef.current.get(building.path) ?? target;
        const diff = target - current;

        if (Math.abs(diff) > THRESHOLD) {
          const newOpacity = current + diff * EASING_FACTOR;
          buildingOpacityRef.current.set(building.path, newOpacity);
          hasChanges = true;
          if (shouldCheckSettling) {
            allSettled = false;
          }
        }
      });

      // Animate district opacities
      cityData.districts.forEach((district) => {
        const hasHighlight = highlightMatchMap.has(district.path);
        const target = getTargetOpacity(hasHighlight, 'district');
        const current = districtOpacityRef.current.get(district.path) ?? target;
        const diff = target - current;

        if (Math.abs(diff) > THRESHOLD) {
          const newOpacity = current + diff * EASING_FACTOR;
          districtOpacityRef.current.set(district.path, newOpacity);
          hasChanges = true;
          if (shouldCheckSettling) {
            allSettled = false;
          }
        }
      });

      // Throttle forceUpdate to every 2 frames (~30fps) to reduce re-render overhead
      if (hasChanges && frameCount % 2 === 0) {
        forceUpdate();
      }

      frameCount++;

      // Only continue if not settled
      if (!allSettled) {
        opacityAnimationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Final update to ensure we render the settled state
        if (hasChanges) {
          forceUpdate();
        }
        opacityAnimationFrameRef.current = null;
      }
    };

    opacityAnimationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (opacityAnimationFrameRef.current) {
        cancelAnimationFrame(opacityAnimationFrameRef.current);
      }
    };
  }, [isolationMode, cityData, highlightMatchMap, getTargetOpacity]);

  // Handle canvas layout
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCanvasSize({ width, height });
  }, []);

  // JS-side handler that performs hit testing and dispatches press events
  const handleTapJS = useCallback(
    (x: number, y: number, currentScale: number, currentTranslateX: number, currentTranslateY: number) => {
      // Inverse-transform tap coordinates to base space
      const baseX = (x - currentTranslateX) / currentScale;
      const baseY = (y - currentTranslateY) / currentScale;

      // Create a transform with scale=1 for hit testing (coordinates are already in base space)
      const baseTransform: TransformState = {
        scale: 1,
        translateX: 0,
        translateY: 0,
      };

      const { building, district } = findHitTarget(
        baseX,
        baseY,
        cityData,
        scaleAndOffset,
        baseTransform
      );

      if (building && onBuildingPress) {
        onBuildingPress(building);
      } else if (district && onDistrictPress) {
        onDistrictPress(district);
      }
    },
    [cityData, scaleAndOffset, onBuildingPress, onDistrictPress]
  );

  // Handle tap - just passes coordinates and transform to JS side
  const handleTap = useCallback(
    (x: number, y: number) => {
      'worklet';
      // Read current transform values and pass them to JS side
      const currentScale = scale.value;
      const currentTranslateX = translateX.value;
      const currentTranslateY = translateY.value;

      // Pass all necessary data as primitives to JS side
      runOnJS(handleTapJS)(x, y, currentScale, currentTranslateX, currentTranslateY);
    },
    [scale, translateX, translateY, handleTapJS]
  );

  // Animation helper - animate to target zoom/pan position
  // Called from JS thread (useEffect), so no 'worklet' directive
  const animateToTarget = useCallback(
    (target: ZoomTarget, type: 'spring' | 'timing') => {
      // Mark animation as active
      isAnimating.value = true;

      if (type === 'spring') {
        // Spring animation for gesture-initiated zooms
        scale.value = withSpring(
          target.scale,
          {
            damping: 10,
            stiffness: 100,
          },
          (finished) => {
            if (finished) {
              isAnimating.value = false;
              if (onZoomComplete) {
                runOnJS(onZoomComplete)();
              }
            }
          }
        );
        translateX.value = withSpring(target.translateX, {
          damping: 10,
          stiffness: 100,
        });
        translateY.value = withSpring(target.translateY, {
          damping: 10,
          stiffness: 100,
        });
      } else {
        // Timing animation for programmatic zooms
        const duration = calculateAnimationDuration(
          scale.value,
          target.scale,
          translateX.value,
          target.translateX,
          translateY.value,
          target.translateY
        );

        scale.value = withTiming(
          target.scale,
          {
            duration,
            easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
          },
          (finished) => {
            if (finished) {
              isAnimating.value = false;
              if (onZoomComplete) {
                runOnJS(onZoomComplete)();
              }
            }
          }
        );
        translateX.value = withTiming(target.translateX, {
          duration,
          easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
        });
        translateY.value = withTiming(target.translateY, {
          duration,
          easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
        });
      }
    },
    [scale, translateX, translateY, isAnimating, onZoomComplete]
  );

  // Track previous zoomToPath to prevent re-animating on re-renders
  const prevZoomToPath = useRef<string | null | undefined>(zoomToPath);
  const hasInitialized = useRef(false);

  // Zoom to path effect - only runs when zoomToPath actually changes
  useEffect(() => {
    // Skip on initial mount if no zoomToPath
    if (!hasInitialized.current && (!zoomToPath || zoomToPath === '')) {
      hasInitialized.current = true;
      prevZoomToPath.current = zoomToPath;
      return;
    }

    // Skip if zoomToPath hasn't changed
    if (prevZoomToPath.current === zoomToPath) {
      return;
    }

    const previousPath = prevZoomToPath.current;
    prevZoomToPath.current = zoomToPath;
    hasInitialized.current = true;

    // If zoomToPath is null/empty
    if (!zoomToPath || zoomToPath === '') {
      // Only zoom out if we're transitioning FROM a path TO empty
      // (e.g., tour focus changed from a directory to "show all")
      if (previousPath && previousPath !== '') {
        // Zoom out to show entire repo
        const target = calculateZoomTarget(
          cityData.bounds,
          cityData,
          scaleAndOffset,
          canvasSize.width,
          canvasSize.height,
          maxZoom,
          0.9 // More padding for full city view
        );
        animateToTarget(target, 'timing');
      }
      return;
    }

    // Find target bounds using shared utility
    const bounds = findTargetBounds(zoomToPath, cityData);
    if (!bounds) {
      console.warn(`[FileCityCanvas] Path not found: ${zoomToPath}`);
      onZoomComplete?.();
      return;
    }

    // Calculate target zoom using shared utility
    // bounds is guaranteed non-null due to check above
    const target = calculateZoomTarget(
      bounds,
      cityData,
      scaleAndOffset,
      canvasSize.width,
      canvasSize.height,
      maxZoom,
      zoomPadding
    );

    // Animate to target
    animateToTarget(target, 'timing');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomToPath]); // Only respond to zoomToPath changes

  // Spring back to constraints if zoom exceeds min/max
  // This runs as a worklet on UI thread
  const springBackToConstraints = useCallback(() => {
    'worklet';
    const currentScale = scale.value;
    let targetScale = currentScale;

    if (currentScale < minZoom) targetScale = minZoom;
    if (currentScale > maxZoom) targetScale = maxZoom;

    if (targetScale !== currentScale) {
      // Animate directly with shared values (no animateToTarget wrapper)
      isAnimating.value = true;
      scale.value = withSpring(targetScale, {
        damping: 10,
        stiffness: 100,
      }, (finished) => {
        if (finished) {
          isAnimating.value = false;
        }
      });
    }
  }, [scale, isAnimating, minZoom, maxZoom]);

  // Saved transform for gesture tracking
  const savedScale = useSharedValue(initialZoom);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Pan gesture - works directly with shared values (no JS bridge)
  const panGesture = Gesture.Pan()
    .enabled(enablePan)
    .onStart(() => {
      'worklet';
      // Save current position at gesture start
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      isAnimating.value = false; // Cancel any ongoing animation
    })
    .onUpdate((e) => {
      'worklet';
      // Directly update shared values - no React re-render
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      'worklet';
      if (animatePan) {
        // Could add pan constraints here if needed
      }
    });

  // Pinch gesture - works directly with shared values (no JS bridge)
  const pinchGesture = Gesture.Pinch()
    .enabled(enableZoom)
    .onStart(() => {
      'worklet';
      // Save current transform at gesture start
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      isAnimating.value = false; // Cancel any ongoing animation
    })
    .onUpdate((e) => {
      'worklet';
      const newScale = Math.min(maxZoom, Math.max(minZoom, savedScale.value * e.scale));

      // Zoom around focal point
      const scaleRatio = newScale / savedScale.value;
      const newTranslateX = e.focalX - (e.focalX - savedTranslateX.value) * scaleRatio;
      const newTranslateY = e.focalY - (e.focalY - savedTranslateY.value) * scaleRatio;

      // Directly update shared values - no React re-render
      scale.value = newScale;
      translateX.value = newTranslateX;
      translateY.value = newTranslateY;
    })
    .onEnd(() => {
      'worklet';
      if (animateZoom) {
        springBackToConstraints();
      }
    });

  // Tap gesture
  const tapGesture = Gesture.Tap().onEnd((e) => {
    'worklet';
    handleTap(e.x, e.y);
  });

  // Combine gestures
  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture, tapGesture);

  // World to canvas coordinate transform - computes base coordinates only
  // The pan/zoom transform is applied via Skia Group transform
  const worldToCanvasBase = useCallback(
    (x: number, z: number) => {
      const { scale, offsetX, offsetZ } = scaleAndOffset;
      const baseX = (x - cityData.bounds.minX) * scale + offsetX;
      const baseY = (z - cityData.bounds.minZ) * scale + offsetZ;
      return {
        x: baseX,
        y: baseY,
      };
    },
    [cityData.bounds, scaleAndOffset]
  );

  // Pre-compute district data (base coordinates, transform applied via Skia Group)
  const districtData = useMemo(() => {
    return cityData.districts
      .filter((district) => district.path && district.path !== '')
      .map((district) => {
        const { minX, maxX, minZ, maxZ } = district.worldBounds;
        const topLeft = worldToCanvasBase(minX, minZ);
        const bottomRight = worldToCanvasBase(maxX, maxZ);

        const width = bottomRight.x - topLeft.x;
        const height = bottomRight.y - topLeft.y;

        const layerMatches = highlightMatchMap.get(district.path) || [];
        const hasHighlight = layerMatches.length > 0;

        // Get highlight info from first matching layer
        const firstMatch = hasHighlight ? layerMatches[0] : null;
        const highlightColor = firstMatch?.layer.color;
        const renderStrategy: LayerRenderStrategy = firstMatch?.item.renderStrategy || 'border';
        const layerOpacity = firstMatch?.layer.opacity ?? 1;

        // Border width matches web version
        const scaledBorderWidth = 1;

        // Inset the rectangle by half the stroke width so stroke stays within bounds
        const inset = scaledBorderWidth / 2;

        // Use animated opacity for isolation modes
        const targetOpacity = getTargetOpacity(hasHighlight, 'district');
        const borderOpacity = districtOpacityRef.current.get(district.path) ?? targetOpacity;

        const districtName = district.path?.split('/').pop() || 'root';
        const shouldShowText = showDirectoryLabels && width > 40 && height > 20;

        return {
          key: `district-${district.path}`,
          path: district.path,
          x: topLeft.x + inset,
          y: topLeft.y + inset,
          width: width - scaledBorderWidth,
          height: height - scaledBorderWidth,
          borderColor: adjustColorBrightness(defaultDistrictColor, 40),
          borderOpacity,
          districtName,
          shouldShowText,
          hasHighlight,
          highlightColor,
          renderStrategy,
          layerOpacity,
          scaledBorderWidth,
        };
      })
      .filter(Boolean);
  }, [cityData.districts, worldToCanvasBase, highlightMatchMap, defaultDistrictColor, showDirectoryLabels, getTargetOpacity]);

  // Pre-compute building data (base coordinates, transform applied via Skia Group)
  const buildingData = useMemo(() => {
    const baseScale = scaleAndOffset.scale;

    return cityData.buildings
      .map((building) => {
        const pos = worldToCanvasBase(building.position.x, building.position.z);

        let width: number, height: number;
        if (building.dimensions[0] > 50 || building.dimensions[2] > 50) {
          width = building.dimensions[0] * baseScale * 0.95;
          height = building.dimensions[2] * baseScale * 0.95;
        } else {
          const size = Math.max(
            2,
            Math.max(building.dimensions[0], building.dimensions[2]) * baseScale * 0.9
          );
          width = size;
          height = size;
        }

        const x = pos.x - width / 2;
        const y = pos.y - height / 2;

        const layerMatches = highlightMatchMap.get(building.path) || [];
        const hasHighlight = layerMatches.length > 0;

        // Get highlight info from first matching layer
        const firstMatch = hasHighlight ? layerMatches[0] : null;
        const highlightColor = firstMatch?.layer.color;
        const renderStrategy: LayerRenderStrategy = firstMatch?.item.renderStrategy || 'border';
        const layerOpacity = firstMatch?.layer.opacity;

        const color = building.color || getFileColor(building.path);

        // Use animated opacity for isolation modes
        const targetOpacity = getTargetOpacity(hasHighlight, 'building');
        const opacity = buildingOpacityRef.current.get(building.path) ?? targetOpacity;

        const actualRadius = Math.min(buildingBorderRadius, Math.min(width, height) / 6);

        // Border width matches web version
        const scaledBorderWidth = 1;

        // Get icon config if enabled
        const icon = showFileTypeIcons ? getFileTypeIcon(building.path, iconMap) : null;

        return {
          key: `building-${building.path}`,
          path: building.path,
          x,
          y,
          centerX: pos.x,
          centerY: pos.y,
          width,
          height,
          color,
          opacity,
          radius: actualRadius,
          scaledBorderWidth,
          hasHighlight,
          highlightColor,
          renderStrategy,
          layerOpacity,
          icon,
        };
      })
      .filter(Boolean);
  }, [cityData.buildings, worldToCanvasBase, scaleAndOffset, highlightMatchMap, buildingBorderRadius, showFileTypeIcons, iconMap, getTargetOpacity]);

  // Filter buildings for 'hide' mode
  const visibleBuildings = useMemo(() => {
    if (isolationMode === 'hide' && shouldIsolate) {
      return buildingData.filter(b => b?.hasHighlight);
    }
    return buildingData;
  }, [buildingData, isolationMode, shouldIsolate]);

  // Pre-separate districts by rendering pass for performance
  const districtRenderPasses = useMemo(() => {
    const normal: typeof districtData = [];
    const highlightFills: typeof districtData = [];
    const highlightBorders: typeof districtData = [];

    districtData.forEach(d => {
      if (!d) return;
      if (!d.hasHighlight) {
        normal.push(d);
      } else if (d.renderStrategy === 'fill') {
        highlightFills.push(d);
      } else {
        highlightBorders.push(d);
      }
    });

    return { normal, highlightFills, highlightBorders };
  }, [districtData]);

  // Pre-separate buildings by rendering pass for performance
  const buildingRenderPasses = useMemo(() => {
    const fills: typeof visibleBuildings = [];
    const icons: typeof visibleBuildings = [];
    const highlightBorders: typeof visibleBuildings = [];

    visibleBuildings.forEach(b => {
      if (!b) return;
      fills.push(b);
      if (b.icon) icons.push(b);
      if (b.hasHighlight && b.highlightColor && b.renderStrategy !== 'fill') {
        highlightBorders.push(b);
      }
    });

    return { fills, icons, highlightBorders };
  }, [visibleBuildings]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View style={[styles.canvasContainer, { backgroundColor }]} onLayout={onLayout}>
          <Canvas style={styles.canvas}>
            {/* Apply pan/zoom transform via GPU - no React re-renders during animation */}
            <Group transform={transform}>
              {/* Pass 1: Normal district borders (bottom layer) */}
              {districtRenderPasses.normal.map((d) => (
                <RoundedRect
                  key={d.key}
                  x={d.x}
                  y={d.y}
                  width={d.width}
                  height={d.height}
                  r={districtBorderRadius}
                  color="transparent"
                  style="stroke"
                  strokeWidth={d.scaledBorderWidth}
                >
                  <Paint
                    color={Skia.Color(d.borderColor)}
                    style="stroke"
                    strokeWidth={d.scaledBorderWidth}
                    opacity={d.borderOpacity}
                  />
                </RoundedRect>
              ))}

              {/* Pass 2: Highlighted district fills (middle layer) */}
              {districtRenderPasses.highlightFills.map((d) => (
                <RoundedRect
                  key={`${d.key}-fill`}
                  x={d.x}
                  y={d.y}
                  width={d.width}
                  height={d.height}
                  r={districtBorderRadius}
                  color={hexToSkiaColor(d.highlightColor!, d.layerOpacity!)}
                />
              ))}

              {/* Pass 3: Highlighted district borders (top layer) */}
              {districtRenderPasses.highlightBorders.map((d) => (
                <RoundedRect
                  key={`${d.key}-highlight`}
                  x={d.x}
                  y={d.y}
                  width={d.width}
                  height={d.height}
                  r={districtBorderRadius}
                  color="transparent"
                  style="stroke"
                  strokeWidth={d.scaledBorderWidth}
                >
                  <Paint
                    color={Skia.Color(d.highlightColor!)}
                    style="stroke"
                    strokeWidth={d.scaledBorderWidth}
                    opacity={d.layerOpacity}
                  />
                </RoundedRect>
              ))}

            {/* District labels */}
            {font &&
              districtData.map((d) =>
                d && d.shouldShowText ? (
                  <Text
                    key={`${d.key}-label`}
                    x={d.x + d.width / 2 - (d.districtName.length * 3)}
                    y={d.y + d.height - 6}
                    text={d.districtName}
                    font={font}
                    color={Skia.Color(`rgba(255, 255, 255, ${d.hasHighlight ? 0.9 : 0.7})`)}
                  />
                ) : null
              )}

            {/* Buildings - Pass 1: All fills (normal and highlighted) */}
            {buildingRenderPasses.fills.map((b) => (
              <RoundedRect
                key={b.key}
                x={b.x}
                y={b.y}
                width={b.width}
                height={b.height}
                r={b.radius}
                style="fill"
                color={hexToSkiaColor(
                  b.hasHighlight && b.highlightColor && b.renderStrategy === 'fill'
                    ? b.highlightColor
                    : b.color,
                  b.hasHighlight && b.renderStrategy === 'fill'
                    ? (b.layerOpacity ?? 1)
                    : b.opacity
                )}
              />
            ))}

            {/* Buildings - Pass 2: Icons (on top of fills, below highlight borders) */}
            {buildingRenderPasses.icons.map((b) => (
              <Group key={`${b.key}-icon`}>
                {/* File type icon (Lucide SVG or emoji) */}
                {(() => {
                  // Only show icons on buildings large enough to display them
                  const minSize = Math.min(b.width, b.height);
                  if (!b.icon || minSize < 6) return null;

                  // Scale icon to fit within building (use 80% of min dimension)
                  const size = minSize * 0.8;

                  if (b.icon.type === 'lucide') {
                    const svgString = getLucideIconSvg(b.icon.name, b.icon.color || '#ffffff');
                    if (!svgString) return null;
                    const svg = Skia.SVG.MakeFromString(svgString);
                    if (!svg) return null;
                    // SVG is 24x24, scale to fit
                    const scale = size / 24;
                    return (
                      <Group
                        transform={[
                          { translateX: b.centerX - size / 2 },
                          { translateY: b.centerY - size / 2 },
                          { scale: scale },
                        ]}
                      >
                        <ImageSVG svg={svg} x={0} y={0} width={24} height={24} />
                      </Group>
                    );
                  }

                  // Emoji fallback
                  if (b.icon.type === 'emoji' && iconFont) {
                    return (
                      <Text
                        x={b.centerX - size * 0.3}
                        y={b.centerY + size * 0.3}
                        text={b.icon.name}
                        font={iconFont}
                        color={Skia.Color(b.icon.color || '#ffffff')}
                      />
                    );
                  }

                  return null;
                })()}
              </Group>
            ))}

            {/* Buildings - Pass 3: Highlight borders (top layer) */}
            {buildingRenderPasses.highlightBorders.map((b) => (
              <RoundedRect
                key={`${b.key}-highlight`}
                x={b.x}
                y={b.y}
                width={b.width}
                height={b.height}
                r={b.radius}
                color="transparent"
                style="stroke"
                strokeWidth={b.scaledBorderWidth}
              >
                <Paint color={Skia.Color(b.highlightColor!)} style="stroke" strokeWidth={b.scaledBorderWidth} />
              </RoundedRect>
            ))}
            </Group>
          </Canvas>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvasContainer: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
});

export default FileCityCanvas;
