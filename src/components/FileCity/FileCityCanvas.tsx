/**
 * FileCityCanvas - React Native Skia implementation of File City visualization
 *
 * GPU-accelerated rendering using @shopify/react-native-skia.
 * Uses react-native-reanimated for gesture handling.
 */

import React, { useMemo, useCallback, useState, useRef } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import {
  Canvas,
  RoundedRect,
  Group,
  Text,
  useFont,
  Skia,
  Paint,
} from '@shopify/react-native-skia';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import type { CityBuilding, CityDistrict } from '@principal-ai/file-city-builder';
import { getFileColor } from '@principal-ai/file-city-builder';
import { FileCityCanvasProps, TransformState } from './types';
import {
  calculateScaleAndOffset,
  LayerIndex,
  findHitTarget,
} from './drawingUtils';

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

export function FileCityCanvas({
  cityData,
  highlightLayers = [],
  backgroundColor = DEFAULT_BACKGROUND_COLOR,
  defaultDistrictColor = DEFAULT_DISTRICT_COLOR,
  buildingBorderRadius = 2,
  districtBorderRadius = 0,
  showDirectoryLabels = true,
  enableZoom = true,
  enablePan = true,
  onBuildingPress,
  onDistrictPress,
  initialZoom = 1,
  minZoom = 0.5,
  maxZoom = 5,
}: FileCityCanvasProps) {
  const [canvasSize, setCanvasSize] = useState({ width: 300, height: 300 });

  // Load font for labels (using system default)
  const font = useFont(null, 10);

  // Transform state using regular React state
  const [transformState, setTransformState] = useState<TransformState>({
    scale: initialZoom,
    translateX: 0,
    translateY: 0,
  });

  // Refs for gesture tracking
  const savedTransform = useRef({ scale: initialZoom, translateX: 0, translateY: 0 });

  // Build layer index for O(1) lookups
  const layerIndex = useMemo(
    () => new LayerIndex(highlightLayers),
    [highlightLayers]
  );

  // Calculate scale and offset
  const scaleAndOffset = useMemo(
    () => calculateScaleAndOffset(cityData, canvasSize.width, canvasSize.height),
    [cityData, canvasSize]
  );

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

  // Gesture helper functions (called via runOnJS)
  const saveCurrent = useCallback(() => {
    savedTransform.current = { ...transformState };
  }, [transformState]);

  const updatePan = useCallback((translationX: number, translationY: number) => {
    setTransformState({
      ...savedTransform.current,
      translateX: savedTransform.current.translateX + translationX,
      translateY: savedTransform.current.translateY + translationY,
    });
  }, []);

  const updatePinch = useCallback((scale: number) => {
    const newScale = savedTransform.current.scale * scale;
    setTransformState({
      ...savedTransform.current,
      scale: Math.min(maxZoom, Math.max(minZoom, newScale)),
    });
  }, [maxZoom, minZoom]);

  // Pan gesture
  const panGesture = Gesture.Pan()
    .enabled(enablePan)
    .onStart(() => {
      'worklet';
      runOnJS(saveCurrent)();
    })
    .onUpdate((e) => {
      'worklet';
      runOnJS(updatePan)(e.translationX, e.translationY);
    });

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .enabled(enableZoom)
    .onStart(() => {
      'worklet';
      runOnJS(saveCurrent)();
    })
    .onUpdate((e) => {
      'worklet';
      runOnJS(updatePinch)(e.scale);
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

        let borderOpacity = 0.6;
        if (hasHighlight) {
          borderOpacity = 0.8;
        }

        const districtName = district.path?.split('/').pop() || 'root';
        const shouldShowText = showDirectoryLabels && width > 40 && height > 20;

        return {
          key: `district-${district.path}`,
          x: topLeft.x,
          y: topLeft.y,
          width,
          height,
          borderColor: adjustColorBrightness(defaultDistrictColor, 40),
          borderOpacity,
          districtName,
          shouldShowText,
          hasHighlight,
        };
      })
      .filter(Boolean);
  }, [cityData.districts, worldToCanvas, layerIndex, defaultDistrictColor, showDirectoryLabels]);

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
        const highlightColor = hasHighlight ? layerMatches[0].layer.color : undefined;

        const color = building.color || getFileColor(building.path);
        const opacity = hasHighlight ? 1 : 0.6;
        const actualRadius = Math.min(buildingBorderRadius, Math.min(width, height) / 6);

        return {
          key: `building-${building.path}`,
          x,
          y,
          width,
          height,
          color,
          opacity,
          radius: actualRadius,
          hasHighlight,
          highlightColor,
        };
      })
      .filter(Boolean);
  }, [cityData.buildings, worldToCanvas, scaleAndOffset, transformState.scale, layerIndex, buildingBorderRadius]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View style={[styles.canvasContainer, { backgroundColor }]} onLayout={onLayout}>
          <Canvas style={styles.canvas}>
            {/* Districts (borders only) */}
            {districtData.map((d) =>
              d ? (
                <RoundedRect
                  key={d.key}
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
            {buildingData.map((b) =>
              b ? (
                <Group key={b.key}>
                  {/* Building fill */}
                  <RoundedRect
                    x={b.x}
                    y={b.y}
                    width={b.width}
                    height={b.height}
                    r={b.radius}
                    color={hexToSkiaColor(b.color, b.opacity)}
                  />
                  {/* Highlight border */}
                  {b.hasHighlight && b.highlightColor && (
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
