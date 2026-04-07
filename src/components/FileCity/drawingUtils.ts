/**
 * FileCity Drawing Utilities
 * Coordinate transformations, layer indexing, and hit testing
 */

import type {
  CityBuilding,
  CityDistrict,
  CityData,
  HighlightLayer,
  LayerItem,
} from '@principal-ai/file-city-builder';
import { TransformState } from './types';

// ============================================================================
// Color Utilities
// ============================================================================

export function hexToRgba(hex: string, alpha: number = 1): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(75, 80, 85, ${alpha})`;

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function adjustColorBrightness(hex: string, amount: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;

  const r = Math.min(255, Math.max(0, parseInt(result[1], 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(result[2], 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(result[3], 16) + amount));

  return `rgb(${r}, ${g}, ${b})`;
}

// ============================================================================
// Coordinate Transformation
// ============================================================================

export interface ScaleAndOffset {
  scale: number;
  offsetX: number;
  offsetZ: number;
}

export function calculateScaleAndOffset(
  cityData: CityData,
  width: number,
  height: number,
  padding: number = 20
): ScaleAndOffset {
  const cityWidth = cityData.bounds.maxX - cityData.bounds.minX;
  const cityDepth = cityData.bounds.maxZ - cityData.bounds.minZ;

  const horizontalPadding = padding;
  const verticalPadding = padding * 2;

  const scaleX = (width - horizontalPadding) / cityDepth;
  const scaleZ = (height - verticalPadding) / cityWidth;
  const scale = Math.min(scaleX, scaleZ);

  const scaledCityWidth = cityDepth * scale;
  const scaledCityHeight = cityWidth * scale;
  const offsetX = (width - scaledCityWidth) / 2;
  const offsetZ = (height - scaledCityHeight) / 2;

  return { scale, offsetX, offsetZ };
}

export function worldToCanvas(
  x: number,
  z: number,
  cityData: CityData,
  scaleAndOffset: ScaleAndOffset,
  transform: TransformState
): { x: number; y: number } {
  const { scale, offsetX, offsetZ } = scaleAndOffset;

  const baseX = (x - cityData.bounds.minX) * scale + offsetX;
  const baseY = (z - cityData.bounds.minZ) * scale + offsetZ;

  return {
    x: baseX * transform.scale + transform.translateX,
    y: baseY * transform.scale + transform.translateY,
  };
}

// ============================================================================
// Layer Index for O(1) Path Lookups
// ============================================================================

export class LayerIndex {
  private exactIndex: Map<string, Array<{ layer: HighlightLayer; item: LayerItem }>> = new Map();
  private directoryPaths: Array<{ path: string; layer: HighlightLayer; item: LayerItem }> = [];

  constructor(layers: HighlightLayer[]) {
    this.buildIndex(layers);
  }

  private buildIndex(layers: HighlightLayer[]) {
    for (const layer of layers) {
      if (!layer.enabled) continue;

      for (const item of layer.items) {
        const entry = { layer, item };

        if (item.type === 'file') {
          const existing = this.exactIndex.get(item.path);
          if (existing) {
            existing.push(entry);
          } else {
            this.exactIndex.set(item.path, [entry]);
          }
        } else {
          this.directoryPaths.push({ path: item.path, layer, item });
        }
      }
    }

    this.directoryPaths.sort((a, b) => b.path.length - a.path.length);
  }

  getItemsForPath(
    path: string,
    checkType: 'exact' | 'children' = 'children'
  ): Array<{ layer: HighlightLayer; item: LayerItem }> {
    const matches: Array<{ layer: HighlightLayer; item: LayerItem }> = [];

    const exactMatches = this.exactIndex.get(path);
    if (exactMatches) {
      matches.push(...exactMatches);
    }

    if (checkType === 'exact') {
      for (const dir of this.directoryPaths) {
        if (dir.path === path) {
          matches.push({ layer: dir.layer, item: dir.item });
        }
      }
    } else {
      for (const dir of this.directoryPaths) {
        if (path === dir.path || path.startsWith(dir.path + '/')) {
          matches.push({ layer: dir.layer, item: dir.item });
        }
      }
    }

    return matches.sort((a, b) => b.layer.priority - a.layer.priority);
  }
}

// ============================================================================
// Hit Testing
// ============================================================================

export function hitTestBuilding(
  touchX: number,
  touchY: number,
  building: CityBuilding,
  cityData: CityData,
  scaleAndOffset: ScaleAndOffset,
  transform: TransformState
): boolean {
  const totalScale = scaleAndOffset.scale * transform.scale;
  const pos = worldToCanvas(building.position.x, building.position.z, cityData, scaleAndOffset, transform);

  let width: number, height: number;
  if (building.dimensions[0] > 50 || building.dimensions[2] > 50) {
    width = building.dimensions[0] * totalScale * 0.95;
    height = building.dimensions[2] * totalScale * 0.95;
  } else {
    const size = Math.max(2, Math.max(building.dimensions[0], building.dimensions[2]) * totalScale * 0.9);
    width = size;
    height = size;
  }

  const x = pos.x - width / 2;
  const y = pos.y - height / 2;

  return touchX >= x && touchX <= x + width && touchY >= y && touchY <= y + height;
}

export function hitTestDistrict(
  touchX: number,
  touchY: number,
  district: CityDistrict,
  cityData: CityData,
  scaleAndOffset: ScaleAndOffset,
  transform: TransformState
): boolean {
  const { minX, maxX, minZ, maxZ } = district.worldBounds;
  const topLeft = worldToCanvas(minX, minZ, cityData, scaleAndOffset, transform);
  const bottomRight = worldToCanvas(maxX, maxZ, cityData, scaleAndOffset, transform);

  return (
    touchX >= topLeft.x &&
    touchX <= bottomRight.x &&
    touchY >= topLeft.y &&
    touchY <= bottomRight.y
  );
}

export function findHitTarget(
  touchX: number,
  touchY: number,
  cityData: CityData,
  scaleAndOffset: ScaleAndOffset,
  transform: TransformState
): { building: CityBuilding | null; district: CityDistrict | null } {
  // Check buildings first (they're on top)
  for (const building of cityData.buildings) {
    if (hitTestBuilding(touchX, touchY, building, cityData, scaleAndOffset, transform)) {
      return { building, district: null };
    }
  }

  // Then check districts (deepest first)
  let deepestDistrict: CityDistrict | null = null;
  let deepestLevel = -1;

  for (const district of cityData.districts) {
    if (hitTestDistrict(touchX, touchY, district, cityData, scaleAndOffset, transform)) {
      const level = (district.path || '').split('/').filter(Boolean).length;
      if (level > deepestLevel) {
        deepestLevel = level;
        deepestDistrict = district;
      }
    }
  }

  return { building: null, district: deepestDistrict };
}
