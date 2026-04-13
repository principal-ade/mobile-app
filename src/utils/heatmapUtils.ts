/**
 * Shared utilities for heatmap/contribution grid components
 */

/**
 * Standard intensity levels for heatmap color opacity
 */
export const INTENSITY_LEVELS = [0.25, 0.45, 0.65, 0.85, 1.0];

/**
 * Convert hex color to RGB object
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  if (!hex.startsWith('#')) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
};

/**
 * Calculate color with intensity-based opacity for heatmap cells
 * @param count - Number of contributions/commits for this cell
 * @param maxCount - Maximum count across all cells (for normalization)
 * @param baseColor - Primary color to use (typically theme.colors.primary)
 * @param emptyColor - Color to use when count is 0 (typically theme.colors.border)
 * @returns CSS color string (hex or rgba)
 */
export const getIntensityColor = (
  count: number,
  maxCount: number,
  baseColor: string,
  emptyColor: string
): string => {
  if (count === 0) {
    return emptyColor;
  }

  const intensity = maxCount > 0
    ? Math.min(4, Math.ceil((count / maxCount) * 4))
    : 0;

  const opacity = INTENSITY_LEVELS[intensity];

  const rgb = hexToRgb(baseColor);
  if (rgb) {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
  }

  return baseColor;
};
