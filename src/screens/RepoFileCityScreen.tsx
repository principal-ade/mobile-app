/**
 * RepoFileCityScreen - Main entry point
 *
 * Routes to phone or tablet layout based on device type.
 * Tablet layout features desktop-inspired header with heatmap banner,
 * overlapping owner avatar, stats row, and File City 3D at bottom.
 */

import React from 'react';
import { useIsTablet } from '../hooks/useIsTablet';
import { RepoFileCityPhoneLayout } from './RepoFileCityScreen/RepoFileCityPhoneLayout';
import { RepoFileCityTabletLayout } from './RepoFileCityScreen/RepoFileCityTabletLayout';

export function RepoFileCityScreen() {
  const isTablet = useIsTablet();

  return isTablet ? <RepoFileCityTabletLayout /> : <RepoFileCityPhoneLayout />;
}
