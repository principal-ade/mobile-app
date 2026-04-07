/**
 * FileCityCanvas - React Native SVG implementation of File City visualization
 *
 * This is a proof-of-concept port of the web ArchitectureMapHighlightLayers component.
 * Uses react-native-svg for rendering and react-native-gesture-handler for interactions.
 */

import React, { useMemo, useCallback, useState, useRef } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Rect, G, Text as SvgText } from 'react-native-svg';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

import type { CityBuilding, CityDistrict } from '@principal-ai/file-city-builder';
import { getFileColor } from '@principal-ai/file-city-builder';
import { FileCityCanvasProps, TransformState } from './types';
import {
  calculateScaleAndOffset,
  LayerIndex,
  worldToCanvas,
  hexToRgba,
  adjustColorBrightness,
  findHitTarget,
} from './drawingUtils';

const DEFAULT_BACKGROUND_COLOR = '#1a1a2e';
const DEFAULT_DISTRICT_COLOR = '#4B5155';

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
  const [hoveredBuilding] = useState<CityBuilding | null>(null);
  const [hoveredDistrict] = useState<CityDistrict | null>(null);

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

  // Pan gesture
  const panGesture = Gesture.Pan()
    .enabled(enablePan)
    .onStart(() => {
      savedTransform.current = { ...transformState };
    })
    .onUpdate((e) => {
      setTransformState({
        ...savedTransform.current,
        translateX: savedTransform.current.translateX + e.translationX,
        translateY: savedTransform.current.translateY + e.translationY,
      });
    });

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .enabled(enableZoom)
    .onStart(() => {
      savedTransform.current = { ...transformState };
    })
    .onUpdate((e) => {
      const newScale = savedTransform.current.scale * e.scale;
      setTransformState({
        ...savedTransform.current,
        scale: Math.min(maxZoom, Math.max(minZoom, newScale)),
      });
    });

  // Tap gesture
  const tapGesture = Gesture.Tap()
    .onEnd((e) => {
      handleTap(e.x, e.y);
    });

  // Combine gestures
  const composedGesture = Gesture.Simultaneous(
    panGesture,
    pinchGesture,
    tapGesture
  );

  // Render districts
  const renderedDistricts = useMemo(() => {
    return cityData.districts.map((district) => {
      const isRoot = !district.path || district.path === '';
      if (isRoot) return null;

      const { minX, maxX, minZ, maxZ } = district.worldBounds;
      const topLeft = worldToCanvas(minX, minZ, cityData, scaleAndOffset, transformState);
      const bottomRight = worldToCanvas(maxX, maxZ, cityData, scaleAndOffset, transformState);

      const width = bottomRight.x - topLeft.x;
      const height = bottomRight.y - topLeft.y;

      if (width < 2 || height < 2) return null;

      const layerMatches = layerIndex.getItemsForPath(district.path, 'exact');
      const hasHighlight = layerMatches.length > 0;
      const isHovered = hoveredDistrict === district;

      let borderOpacity = 0.6;
      if (hasHighlight) {
        borderOpacity = 0.8;
      }
      if (isHovered) {
        borderOpacity = Math.max(borderOpacity, 0.7);
      }

      const districtName = district.path?.split('/').pop() || 'root';
      const shouldShowText = showDirectoryLabels && width > 40 && height > 20;

      return (
        <G key={`district-${district.path}`}>
          {/* Border only */}
          <Rect
            x={topLeft.x}
            y={topLeft.y}
            width={width}
            height={height}
            rx={districtBorderRadius}
            ry={districtBorderRadius}
            fill="none"
            stroke={hexToRgba(adjustColorBrightness(defaultDistrictColor, 40), borderOpacity)}
            strokeWidth={1}
          />
          {/* Hover highlight */}
          {isHovered && (
            <Rect
              x={topLeft.x}
              y={topLeft.y}
              width={width}
              height={height}
              rx={districtBorderRadius}
              ry={districtBorderRadius}
              fill="none"
              stroke="white"
              strokeWidth={2}
            />
          )}
          {/* Label */}
          {shouldShowText && (
            <SvgText
              x={topLeft.x + width / 2}
              y={topLeft.y + height - 6}
              fill={hexToRgba('#ffffff', hasHighlight ? 0.9 : 0.7)}
              fontSize={10}
              textAnchor="middle"
            >
              {districtName}
            </SvgText>
          )}
        </G>
      );
    });
  }, [cityData, scaleAndOffset, transformState, layerIndex, defaultDistrictColor, districtBorderRadius, showDirectoryLabels, hoveredDistrict]);

  // Render buildings
  const renderedBuildings = useMemo(() => {
    return cityData.buildings.map((building) => {
      const totalScale = scaleAndOffset.scale * transformState.scale;
      const pos = worldToCanvas(building.position.x, building.position.z, cityData, scaleAndOffset, transformState);

      let width: number, height: number;
      if (building.dimensions[0] > 50 || building.dimensions[2] > 50) {
        width = building.dimensions[0] * totalScale * 0.95;
        height = building.dimensions[2] * totalScale * 0.95;
      } else {
        const size = Math.max(2, Math.max(building.dimensions[0], building.dimensions[2]) * totalScale * 0.9);
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
      const isHovered = hoveredBuilding === building;

      // Use file-type color from builder, or building's explicit color, or default
      const color = building.color || getFileColor(building.path);
      const opacity = hasHighlight ? 1 : 0.6;
      const actualRadius = Math.min(buildingBorderRadius, Math.min(width, height) / 6);

      return (
        <G key={`building-${building.path}`}>
          {/* Fill */}
          <Rect
            x={x}
            y={y}
            width={width}
            height={height}
            rx={actualRadius}
            ry={actualRadius}
            fill={hexToRgba(color, opacity)}
          />
          {/* Highlight border */}
          {hasHighlight && highlightColor && (
            <Rect
              x={x}
              y={y}
              width={width}
              height={height}
              rx={actualRadius}
              ry={actualRadius}
              fill="none"
              stroke={highlightColor}
              strokeWidth={2}
            />
          )}
          {/* Hover effect */}
          {isHovered && (
            <Rect
              x={x - 1}
              y={y - 1}
              width={width + 2}
              height={height + 2}
              rx={actualRadius}
              ry={actualRadius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.8)"
              strokeWidth={1}
            />
          )}
        </G>
      );
    });
  }, [cityData, scaleAndOffset, transformState, layerIndex, buildingBorderRadius, hoveredBuilding]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View style={[styles.canvasContainer, { backgroundColor }]} onLayout={onLayout}>
          <Svg width={canvasSize.width} height={canvasSize.height}>
            {/* Districts */}
            {renderedDistricts}
            {/* Buildings */}
            {renderedBuildings}
          </Svg>
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
});

export default FileCityCanvas;
