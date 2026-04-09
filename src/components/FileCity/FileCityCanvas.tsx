/**
 * FileCityCanvas - React Native Skia implementation of File City visualization
 *
 * GPU-accelerated rendering using @shopify/react-native-skia.
 * Uses react-native-reanimated for gesture handling.
 */

import React, { useMemo, useCallback, useState, useRef, useEffect, useReducer } from 'react';
import { View, StyleSheet, LayoutChangeEvent, Animated, Easing } from 'react-native';
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
import { runOnJS } from 'react-native-reanimated';

import type { LayerRenderStrategy } from '@principal-ai/file-city-builder';
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
  buildingBorderRadius = 2,
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

  // Animated values for smooth zoom/pan transitions
  const scaleAnim = useRef(new Animated.Value(initialZoom)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  // Transform state (synced from animated values for Skia rendering)
  const [transformState, setTransformState] = useState<TransformState>({
    scale: initialZoom,
    translateX: 0,
    translateY: 0,
  });

  // Animation tracking
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

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

  // Sync animated values to React state for Skia rendering
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

    return () => {
      scaleAnim.removeListener(scaleListener);
      translateXAnim.removeListener(translateXListener);
      translateYAnim.removeListener(translateYListener);
    };
  }, [scaleAnim, translateXAnim, translateYAnim]);

  // Calculate scale and offset
  const scaleAndOffset = useMemo(
    () => calculateScaleAndOffset(cityData, canvasSize.width, canvasSize.height),
    [cityData, canvasSize]
  );

  // Opacity animation loop for isolation modes
  useEffect(() => {
    const EASING_FACTOR = 0.08; // Match web 3D
    const THRESHOLD = 0.01;

    const animate = () => {
      let hasChanges = false;

      // Animate building opacities
      cityData.buildings.forEach((building) => {
        const layerMatches = layerIndex
          .getItemsForPath(building.path)
          .filter((match) => match.item.type === 'file');
        const hasHighlight = layerMatches.length > 0;
        const target = getTargetOpacity(hasHighlight, 'building');
        const current = buildingOpacityRef.current.get(building.path) ?? target;
        const diff = target - current;

        if (Math.abs(diff) > THRESHOLD) {
          const newOpacity = current + diff * EASING_FACTOR;
          buildingOpacityRef.current.set(building.path, newOpacity);
          hasChanges = true;
        }
      });

      // Animate district opacities
      cityData.districts.forEach((district) => {
        const layerMatches = layerIndex.getItemsForPath(district.path, 'exact');
        const hasHighlight = layerMatches.length > 0;
        const target = getTargetOpacity(hasHighlight, 'district');
        const current = districtOpacityRef.current.get(district.path) ?? target;
        const diff = target - current;

        if (Math.abs(diff) > THRESHOLD) {
          const newOpacity = current + diff * EASING_FACTOR;
          districtOpacityRef.current.set(district.path, newOpacity);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        forceUpdate();
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

  // Handle canvas layout
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCanvasSize({ width, height });
  }, []);

  // Handle tap
  const handleTap = useCallback(
    (x: number, y: number) => {
      const { building, district } = findHitTarget(
        x,
        y,
        cityData,
        scaleAndOffset,
        transformState
      );

      if (building && onBuildingPress) {
        onBuildingPress(building);
      } else if (district && onDistrictPress) {
        onDistrictPress(district);
      }
    },
    [cityData, scaleAndOffset, transformState, onBuildingPress, onDistrictPress]
  );

  // Animation helper - animate to target zoom/pan position
  const animateToTarget = useCallback(
    (target: ZoomTarget, type: 'spring' | 'timing') => {
      // Stop any ongoing animation
      if (animationRef.current) {
        animationRef.current.stop();
      }


      if (type === 'spring') {
        // Spring animation for gesture-initiated zooms
        animationRef.current = Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: target.scale,
            tension: 100,
            friction: 10,
            useNativeDriver: false,
          }),
          Animated.spring(translateXAnim, {
            toValue: target.translateX,
            tension: 100,
            friction: 10,
            useNativeDriver: false,
          }),
          Animated.spring(translateYAnim, {
            toValue: target.translateY,
            tension: 100,
            friction: 10,
            useNativeDriver: false,
          }),
        ]);
      } else {
        // Timing animation for programmatic zooms
        const duration = calculateAnimationDuration(
          transformState.scale,
          target.scale,
          transformState.translateX,
          target.translateX,
          transformState.translateY,
          target.translateY
        );

        animationRef.current = Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: target.scale,
            duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.timing(translateXAnim, {
            toValue: target.translateX,
            duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.timing(translateYAnim, {
            toValue: target.translateY,
            duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
        ]);
      }

      animationRef.current.start(({ finished }) => {
        if (finished) {
          animationRef.current = null;
          onZoomComplete?.();
        }
      });
    },
    [
      scaleAnim,
      translateXAnim,
      translateYAnim,
      transformState,
      onZoomComplete,
    ]
  );

  // Zoom to path effect
  useEffect(() => {
    // If zoomToPath is null or empty, zoom out to full city
    if (!zoomToPath || zoomToPath === '') {
      const target = calculateZoomTarget(
        cityData.bounds,
        cityData,
        scaleAndOffset,
        canvasSize.width,
        canvasSize.height,
        maxZoom,
        0.9 // Use more padding for full city view
      );
      animateToTarget(target, 'timing');
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
  }, [
    zoomToPath,
    cityData,
    scaleAndOffset,
    canvasSize,
    maxZoom,
    zoomPadding,
    animateToTarget,
    onZoomComplete,
  ]);

  // Spring back to constraints if zoom exceeds min/max
  const springBackToConstraints = useCallback(() => {
    const currentScale = transformState.scale;
    let targetScale = currentScale;

    if (currentScale < minZoom) targetScale = minZoom;
    if (currentScale > maxZoom) targetScale = maxZoom;

    if (targetScale !== currentScale) {
      animateToTarget(
        {
          scale: targetScale,
          translateX: transformState.translateX,
          translateY: transformState.translateY,
        },
        'spring'
      );
    }
  }, [transformState, minZoom, maxZoom, animateToTarget]);

  // Gesture helper functions (called via runOnJS)
  const handleGestureStart = useCallback(() => {
    // Stop animation if user starts gesture
    if (animationRef.current) {
      animationRef.current.stop();
    }
    savedTransform.current = { ...transformState };
  }, [transformState]);

  const updatePan = useCallback((translationX: number, translationY: number) => {
    const newX = savedTransform.current.translateX + translationX;
    const newY = savedTransform.current.translateY + translationY;

    translateXAnim.setValue(newX);
    translateYAnim.setValue(newY);
  }, [translateXAnim, translateYAnim]);

  const updatePinch = useCallback(
    (scale: number, focalX: number, focalY: number) => {
      const saved = savedTransform.current;
      const newScale = Math.min(maxZoom, Math.max(minZoom, saved.scale * scale));

      // Zoom around focal point
      const scaleRatio = newScale / saved.scale;
      const newTranslateX = focalX - (focalX - saved.translateX) * scaleRatio;
      const newTranslateY = focalY - (focalY - saved.translateY) * scaleRatio;

      scaleAnim.setValue(newScale);
      translateXAnim.setValue(newTranslateX);
      translateYAnim.setValue(newTranslateY);
    },
    [scaleAnim, translateXAnim, translateYAnim, minZoom, maxZoom]
  );

  // Pan gesture
  const panGesture = Gesture.Pan()
    .enabled(enablePan)
    .onStart(() => {
      'worklet';
      runOnJS(handleGestureStart)();
    })
    .onUpdate((e) => {
      'worklet';
      runOnJS(updatePan)(e.translationX, e.translationY);
    })
    .onEnd(() => {
      'worklet';
      if (animatePan) {
        // Could add pan constraints here if needed
      }
    });

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .enabled(enableZoom)
    .onStart(() => {
      'worklet';
      runOnJS(handleGestureStart)();
    })
    .onUpdate((e) => {
      'worklet';
      runOnJS(updatePinch)(e.scale, e.focalX, e.focalY);
    })
    .onEnd(() => {
      'worklet';
      if (animateZoom) {
        runOnJS(springBackToConstraints)();
      }
    });

  // Tap gesture
  const tapGesture = Gesture.Tap().onEnd((e) => {
    'worklet';
    runOnJS(handleTap)(e.x, e.y);
  });

  // Combine gestures
  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture, tapGesture);

  // World to canvas coordinate transform (inline for Skia)
  const worldToCanvas = useCallback(
    (x: number, z: number) => {
      const { scale, offsetX, offsetZ } = scaleAndOffset;
      const baseX = (x - cityData.bounds.minX) * scale + offsetX;
      const baseY = (z - cityData.bounds.minZ) * scale + offsetZ;
      return {
        x: baseX * transformState.scale + transformState.translateX,
        y: baseY * transformState.scale + transformState.translateY,
      };
    },
    [cityData.bounds, scaleAndOffset, transformState]
  );

  // Pre-compute district data
  const districtData = useMemo(() => {
    return cityData.districts
      .filter((district) => district.path && district.path !== '')
      .map((district) => {
        const { minX, maxX, minZ, maxZ } = district.worldBounds;
        const topLeft = worldToCanvas(minX, minZ);
        const bottomRight = worldToCanvas(maxX, maxZ);

        const width = bottomRight.x - topLeft.x;
        const height = bottomRight.y - topLeft.y;

        if (width < 2 || height < 2) return null;

        const layerMatches = layerIndex.getItemsForPath(district.path, 'exact');
        const hasHighlight = layerMatches.length > 0;

        // Get highlight info from first matching layer
        const firstMatch = hasHighlight ? layerMatches[0] : null;
        const highlightColor = firstMatch?.layer.color;
        const renderStrategy: LayerRenderStrategy = firstMatch?.item.renderStrategy || 'border';
        const layerOpacity = firstMatch?.layer.opacity ?? 1;
        const layerBorderWidth = firstMatch?.layer.borderWidth ?? 3;

        // Use animated opacity for isolation modes
        const targetOpacity = getTargetOpacity(hasHighlight, 'district');
        const borderOpacity = districtOpacityRef.current.get(district.path) ?? targetOpacity;

        const districtName = district.path?.split('/').pop() || 'root';
        const shouldShowText = showDirectoryLabels && width > 40 && height > 20;

        return {
          key: `district-${district.path}`,
          path: district.path,
          x: topLeft.x,
          y: topLeft.y,
          width,
          height,
          borderColor: adjustColorBrightness(defaultDistrictColor, 40),
          borderOpacity,
          districtName,
          shouldShowText,
          hasHighlight,
          highlightColor,
          renderStrategy,
          layerOpacity,
          layerBorderWidth,
        };
      })
      .filter(Boolean);
  }, [cityData.districts, worldToCanvas, layerIndex, defaultDistrictColor, showDirectoryLabels, getTargetOpacity]);

  // Pre-compute building data
  const buildingData = useMemo(() => {
    const totalScale = scaleAndOffset.scale * transformState.scale;

    return cityData.buildings
      .map((building) => {
        const pos = worldToCanvas(building.position.x, building.position.z);

        let width: number, height: number;
        if (building.dimensions[0] > 50 || building.dimensions[2] > 50) {
          width = building.dimensions[0] * totalScale * 0.95;
          height = building.dimensions[2] * totalScale * 0.95;
        } else {
          const size = Math.max(
            2,
            Math.max(building.dimensions[0], building.dimensions[2]) * totalScale * 0.9
          );
          width = size;
          height = size;
        }

        if (width < 1 || height < 1) return null;

        const x = pos.x - width / 2;
        const y = pos.y - height / 2;

        const layerMatches = layerIndex
          .getItemsForPath(building.path)
          .filter((match) => match.item.type === 'file');
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
          hasHighlight,
          highlightColor,
          renderStrategy,
          layerOpacity,
          icon,
        };
      })
      .filter(Boolean);
  }, [cityData.buildings, worldToCanvas, scaleAndOffset, transformState.scale, layerIndex, buildingBorderRadius, showFileTypeIcons, iconMap, getTargetOpacity]);

  // Filter buildings for 'hide' mode
  const visibleBuildings = useMemo(() => {
    if (isolationMode === 'hide' && shouldIsolate) {
      return buildingData.filter(b => b?.hasHighlight);
    }
    return buildingData;
  }, [buildingData, isolationMode, shouldIsolate]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View style={[styles.canvasContainer, { backgroundColor }]} onLayout={onLayout}>
          <Canvas style={styles.canvas}>
            {/* Districts (borders only) */}
            {districtData.map((d) =>
              d ? (
                <React.Fragment key={d.key}>
                  {/* Normal district border */}
                  {!d.hasHighlight && (
                    <RoundedRect
                      x={d.x}
                      y={d.y}
                      width={d.width}
                      height={d.height}
                      r={districtBorderRadius}
                      color="transparent"
                      style="stroke"
                      strokeWidth={1}
                    >
                      <Paint
                        color={Skia.Color(d.borderColor)}
                        style="stroke"
                        strokeWidth={1}
                        opacity={d.borderOpacity}
                      />
                    </RoundedRect>
                  )}

                  {/* Highlighted district */}
                  {d.hasHighlight && d.renderStrategy === 'fill' && (
                    <RoundedRect
                      x={d.x}
                      y={d.y}
                      width={d.width}
                      height={d.height}
                      r={districtBorderRadius}
                      color={hexToSkiaColor(d.highlightColor!, d.layerOpacity!)}
                    />
                  )}

                  {d.hasHighlight && d.renderStrategy === 'border' && (
                    <RoundedRect
                      x={d.x}
                      y={d.y}
                      width={d.width}
                      height={d.height}
                      r={districtBorderRadius}
                      color="transparent"
                      style="stroke"
                      strokeWidth={d.layerBorderWidth}
                    >
                      <Paint
                        color={Skia.Color(d.highlightColor!)}
                        style="stroke"
                        strokeWidth={d.layerBorderWidth}
                        opacity={d.layerOpacity}
                      />
                    </RoundedRect>
                  )}
                </React.Fragment>
              ) : null
            )}

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

            {/* Buildings */}
            {visibleBuildings.map((b) =>
              b ? (
                <Group key={b.key}>
                  {/* Building fill - use highlight color for fill strategy, otherwise base color */}
                  <RoundedRect
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
                  {/* Highlight - border strategy (default) */}
                  {b.hasHighlight && b.highlightColor && b.renderStrategy !== 'fill' && (
                    <RoundedRect
                      x={b.x}
                      y={b.y}
                      width={b.width}
                      height={b.height}
                      r={b.radius}
                      color="transparent"
                      style="stroke"
                      strokeWidth={2}
                    >
                      <Paint color={Skia.Color(b.highlightColor)} style="stroke" strokeWidth={2} />
                    </RoundedRect>
                  )}
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
              ) : null
            )}
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
