/**
 * OrganizationScreen - Main entry point
 * Routes to phone or tablet layout based on device type
 */

import React from 'react';
import { useIsTablet } from '../hooks/useIsTablet';
import { OrganizationPhoneLayout } from './OrganizationScreen/OrganizationPhoneLayout';
import { OrganizationTabletLayout } from './OrganizationScreen/OrganizationTabletLayout';

// Re-export types
export type { OrgMember, OrganizationInfo } from './OrganizationScreen/OrganizationPhoneLayout';

export interface OrganizationScreenProps {
  loading?: boolean;
  organization?: import('./OrganizationScreen/OrganizationPhoneLayout').OrganizationInfo;
  repositories?: import('../types/github').GitHubRepository[];
  pinnedRepoNames?: string[];
  members?: import('./OrganizationScreen/OrganizationPhoneLayout').OrgMember[];
  onClose?: () => void;
  onRepoPress?: (owner: string, name: string, fullName: string) => void;
  onMemberPress?: (username: string) => void;
}

export const OrganizationScreen: React.FC<OrganizationScreenProps> = (props) => {
  const isTablet = useIsTablet();

  return isTablet ? (
    <OrganizationTabletLayout {...props} />
  ) : (
    <OrganizationPhoneLayout {...props} />
  );
};
