/**
 * UserProfileScreen - Main entry point
 * Routes to phone or tablet layout based on device type
 */

import React from 'react';
import { useIsTablet } from '../hooks/useIsTablet';
import { UserProfilePhoneLayout, UserProfilePhoneLayoutProps } from './UserProfileScreen/UserProfilePhoneLayout';
import { UserProfileTabletLayout } from './UserProfileScreen/UserProfileTabletLayout';

// Re-export types and interfaces
export type { ActivityCommit, HourlyActivityGroup } from './UserProfileScreen/UserProfilePhoneLayout';
export type UserProfileScreenProps = UserProfilePhoneLayoutProps;

export const UserProfileScreen: React.FC<UserProfileScreenProps> = (props) => {
  const isTablet = useIsTablet();

  return isTablet ? (
    <UserProfileTabletLayout {...props} />
  ) : (
    <UserProfilePhoneLayout {...props} />
  );
};
