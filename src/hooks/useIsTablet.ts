import { Platform, useWindowDimensions } from 'react-native';

const TABLET_MIN_WIDTH = 768;
const TABLET_ASPECT_RATIO_THRESHOLD = 1.6;

/**
 * Hook to detect if the device is a tablet (iPad on iOS, large screen on Android)
 *
 * iOS: Uses Platform.isPad
 * Android: Uses screen dimensions (width >= 768 or aspect ratio < 1.6)
 *
 * @returns boolean - true if device is a tablet
 */
export function useIsTablet(): boolean {
  const { width, height } = useWindowDimensions();

  // iOS: Use Platform.isPad for accurate iPad detection
  if (Platform.OS === 'ios') {
    return Platform.isPad;
  }

  // Android: Use dimension-based detection
  // Check both width and aspect ratio for landscape/portrait
  const aspectRatio = height / width;
  const isTabletByWidth = width >= TABLET_MIN_WIDTH;
  const isTabletByAspectRatio = aspectRatio < TABLET_ASPECT_RATIO_THRESHOLD;

  return isTabletByWidth || isTabletByAspectRatio;
}

/**
 * Hook to get detailed device type information
 *
 * @returns Object with device type details
 */
export function useDeviceType() {
  const { width, height } = useWindowDimensions();
  const isTablet = useIsTablet();

  return {
    isTablet,
    isPhone: !isTablet,
    isPad: Platform.OS === 'ios' && Platform.isPad,
    width,
    height,
    orientation: width > height ? 'landscape' : 'portrait',
  };
}
