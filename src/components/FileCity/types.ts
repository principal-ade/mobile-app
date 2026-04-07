/**
 * FileCity Types - Re-exports from @principal-ai/file-city-builder
 * Plus additional types for the React Native canvas component
 */

// Re-export all types from the builder
export type {
  CityBuilding,
  CityDistrict,
  CityData,
  Bounds2D,
  HighlightLayer,
  LayerItem,
  LayerRenderStrategy,
} from '@principal-ai/file-city-builder';

// React Native specific types

export interface FileTypeIconConfig {
  type: 'emoji' | 'lucide';
  name: string; // emoji character or Lucide icon name
  color?: string;
  backgroundColor?: string;
  glow?: boolean;
  size?: number; // Scale factor (0-1) relative to building size
}

export interface FileCityCanvasProps {
  cityData: import('@principal-ai/file-city-builder').CityData;
  highlightLayers?: import('@principal-ai/file-city-builder').HighlightLayer[];

  // Appearance
  backgroundColor?: string;
  defaultBuildingColor?: string;
  defaultDistrictColor?: string;
  buildingBorderRadius?: number;
  districtBorderRadius?: number;
  showDirectoryLabels?: boolean;
  showFileTypeIcons?: boolean;
  iconMap?: Map<string, FileTypeIconConfig>;

  // Interaction
  enableZoom?: boolean;
  enablePan?: boolean;
  onBuildingPress?: (building: import('@principal-ai/file-city-builder').CityBuilding) => void;
  onDistrictPress?: (district: import('@principal-ai/file-city-builder').CityDistrict) => void;
  onBuildingHover?: (building: import('@principal-ai/file-city-builder').CityBuilding | null) => void;

  // Zoom control
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
}

export interface TransformState {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface HitTestResult {
  building: import('@principal-ai/file-city-builder').CityBuilding | null;
  district: import('@principal-ai/file-city-builder').CityDistrict | null;
}
