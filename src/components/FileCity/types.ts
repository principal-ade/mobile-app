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
  FileTypeIconConfig,
} from '@principal-ai/file-city-builder';

// React Native specific types

/** Isolation mode for non-highlighted buildings */
export type IsolationMode = 'none' | 'transparent' | 'hide';

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
  iconMap?: Map<string, import('@principal-ai/file-city-builder').FileTypeIconConfig>;

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

  // Animated zoom transitions
  animateZoom?: boolean; // Default: true - smooth zoom transitions
  animatePan?: boolean; // Default: true - smooth pan transitions
  zoomAnimationSpeed?: number; // 0-1, default: 0.12 (matches web)

  // Zoom to path (programmatic navigation)
  zoomToPath?: string | null; // Path to zoom to (triggers animation)
  onZoomComplete?: () => void; // Called when zoom animation finishes
  zoomPadding?: number; // Default: 0.8 (80% of viewport)

  // Isolation mode (dim or hide non-highlighted buildings)
  isolationMode?: IsolationMode; // Default: 'none'
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
