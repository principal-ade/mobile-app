/**
 * FileCityCanvas3D_Direct - 3D File City using expo-three Renderer directly
 *
 * Uses Three.js + expo-three without React Three Fiber (which doesn't work in RN)
 * Based on the working DirectThreeTest approach.
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import type {
  CityData,
  CityBuilding,
  CityDistrict,
  HighlightLayer,
} from '@principal-ai/file-city-builder';
import { getFileColor } from '@principal-ai/file-city-builder';

export interface FileCityCanvas3DDirectProps {
  cityData: CityData;
  highlightLayers?: HighlightLayer[];
  backgroundColor?: string;
  onBuildingPress?: (building: CityBuilding) => void;
  heightScaling?: 'logarithmic' | 'linear';
  isolationMode?: 'none' | 'transparent' | 'collapse' | 'hide';
}

const DEFAULT_BACKGROUND_COLOR = '#1a1a2e';

/**
 * Calculate building height based on file metrics
 */
function calculateBuildingHeight(
  building: CityBuilding,
  scaling: 'logarithmic' | 'linear' = 'logarithmic',
): number {
  const minHeight = 2;

  if (building.lineCount !== undefined && building.lineCount > 0) {
    const lines = Math.max(building.lineCount, 1);
    if (scaling === 'linear') {
      return minHeight + lines * 0.1;
    }
    return minHeight + Math.log10(lines) * 12;
  }

  if (building.size !== undefined && building.size > 0) {
    const bytes = Math.max(building.size, 1);
    if (scaling === 'linear') {
      return minHeight + (bytes / 1024) * 0.1;
    }
    return minHeight + (Math.log10(bytes) - 2) * 12;
  }

  return building.dimensions[1] || minHeight;
}

/**
 * Check if a path is highlighted
 */
function getHighlightForPath(
  path: string,
  layers: HighlightLayer[],
): { color: string; opacity: number } | null {
  for (const layer of layers) {
    if (!layer.enabled) continue;
    for (const item of layer.items) {
      if (item.type === 'file' && item.path === path) {
        return { color: layer.color, opacity: layer.opacity ?? 1 };
      }
      if (item.type === 'directory' && (path === item.path || path.startsWith(item.path + '/'))) {
        return { color: layer.color, opacity: layer.opacity ?? 1 };
      }
    }
  }
  return null;
}

export function FileCityCanvas3D_Direct({
  cityData,
  highlightLayers = [],
  backgroundColor = DEFAULT_BACKGROUND_COLOR,
  heightScaling = 'logarithmic',
  isolationMode = 'none',
}: FileCityCanvas3DDirectProps) {
  const animationFrameRef = useRef<number | null>(null);

  const onContextCreate = async (gl: any) => {
    console.log('[FileCityCanvas3D_Direct] GL Context created');

    // Create renderer
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);

    // Parse background color
    const bgColor = new THREE.Color(backgroundColor);
    renderer.setClearColor(bgColor, 1);

    // Create scene
    const scene = new THREE.Scene();
    scene.background = bgColor;

    // Calculate city center
    const centerX = (cityData.bounds.minX + cityData.bounds.maxX) / 2;
    const centerZ = (cityData.bounds.minZ + cityData.bounds.maxZ) / 2;
    const width = cityData.bounds.maxX - cityData.bounds.minX;
    const depth = cityData.bounds.maxZ - cityData.bounds.minZ;

    console.log('[FileCityCanvas3D_Direct] City center:', { centerX, centerZ, width, depth });

    // Create camera - positioned far back to see the whole city
    const camera = new THREE.PerspectiveCamera(
      50,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      10000
    );

    // Position camera much further back to see entire city
    const cameraDistance = Math.max(width, depth) * 1.5; // 1.5x the city size
    camera.position.set(centerX, cameraDistance * 0.6, centerZ + cameraDistance);
    camera.lookAt(centerX, 0, centerZ);

    console.log('[FileCityCanvas3D_Direct] Camera distance:', cameraDistance, 'Camera pos:', camera.position);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(centerX + 50, 100, centerZ + 50);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.3);
    pointLight.position.set(centerX - 50, 50, centerZ - 50);
    scene.add(pointLight);

    // Create ground plane
    const groundGeometry = new THREE.PlaneGeometry(width * 2, depth * 2);
    const groundMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(backgroundColor),
      side: THREE.DoubleSide,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(centerX, 0, centerZ);
    scene.add(ground);

    // Check if highlights are active
    const hasActiveHighlights = highlightLayers.some(
      layer => layer.enabled && layer.items.length > 0
    );

    // Create buildings
    const buildings: THREE.Mesh[] = [];
    cityData.buildings.forEach((building) => {
      const height = calculateBuildingHeight(building, heightScaling);
      const highlight = getHighlightForPath(building.path, highlightLayers);

      // Determine opacity
      let opacity = 0.9;
      let effectiveHeight = height;

      if (hasActiveHighlights && isolationMode !== 'none') {
        if (highlight) {
          opacity = 1.0;
        } else {
          switch (isolationMode) {
            case 'transparent':
              opacity = 0.2;
              break;
            case 'hide':
              opacity = 0.0;
              return; // Skip this building
            case 'collapse':
              opacity = 0.3;
              effectiveHeight = 0.5;
              break;
          }
        }
      }

      const color = highlight?.color || building.color || getFileColor(building.path);

      const geometry = new THREE.BoxGeometry(
        building.dimensions[0] * 0.9,
        effectiveHeight,
        building.dimensions[2] * 0.9
      );

      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        opacity,
        transparent: opacity < 1,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        building.position.x,
        effectiveHeight / 2,
        building.position.z
      );

      buildings.push(mesh);
      scene.add(mesh);
    });

    console.log('[FileCityCanvas3D_Direct] Created', buildings.length, 'buildings');

    // Simple camera rotation variables
    let cameraAngle = 0;
    const cameraRadius = cameraDistance;
    const cameraHeight = cameraDistance * 0.6;

    // Render loop
    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);

      // Slowly rotate camera around the city
      cameraAngle += 0.002;
      camera.position.x = centerX + Math.sin(cameraAngle) * cameraRadius;
      camera.position.z = centerZ + Math.cos(cameraAngle) * cameraRadius;
      camera.position.y = cameraHeight;
      camera.lookAt(centerX, 0, centerZ);

      // Render
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };

    console.log('[FileCityCanvas3D_Direct] Starting render loop');
    render();
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <GLView
        style={[styles.glView, { backgroundColor }]}
        onContextCreate={onContextCreate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glView: {
    flex: 1,
  },
});

export default FileCityCanvas3D_Direct;
