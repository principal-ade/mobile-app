/**
 * Animation Utilities for FileCityCanvas
 *
 * Re-exports shared utilities from @principal-ai/file-city-builder
 * and provides mobile-specific animation helpers.
 */

// Re-export shared zoom utilities from builder package
export {
  findTargetBounds,
  calculateZoomTarget,
  calculateAnimationDuration,
} from '@principal-ai/file-city-builder';

export type {
  TargetBounds,
  ZoomTarget,
  ScaleAndOffset,
} from '@principal-ai/file-city-builder';

// Mobile-specific utilities can be added here if needed
