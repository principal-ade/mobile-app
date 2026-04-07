export { FileCityCanvas } from './FileCityCanvas';
export type {
  CityData,
  CityBuilding,
  CityDistrict,
  Bounds2D,
  HighlightLayer,
  LayerItem,
  FileCityCanvasProps,
  FileTypeIconConfig,
} from './types';
export { generateMockCityData, generateMockHighlightLayers } from './mockData';

// Also re-export the builder utilities for convenience
export {
  CodeCityBuilderWithGrid,
  buildFileSystemTreeFromFileInfoList,
} from '@principal-ai/file-city-builder';
