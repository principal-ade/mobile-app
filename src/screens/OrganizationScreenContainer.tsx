/**
 * OrganizationScreenContainer
 *
 * Container component that fetches organization data from GitHub API
 * and renders the OrganizationScreen component.
 */

import React, { useState, useEffect } from 'react';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { OrganizationScreen, type OrganizationInfo } from './OrganizationScreen';
import type { SearchStackParamList } from '../navigation/types';
import {
  fetchOrganizationDetails,
  fetchOrganizationRepositories,
  fetchOrganizationMembers,
  type OrgMember,
} from '../services/GithubService';
import { GitHubRepository } from '../types/github';

type OrganizationRouteProp = RouteProp<SearchStackParamList, 'Organization'>;

export function OrganizationScreenContainer() {
  const route = useRoute<OrganizationRouteProp>();
  const navigation = useNavigation<any>();
  const { orgLogin } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [organization, setOrganization] = useState<OrganizationInfo | undefined>(undefined);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);

  // Navigate to repo screen
  const handleRepoPress = (owner: string, name: string, fullName: string) => {
    navigation.navigate('RepoFileCity', {
      owner,
      name,
      fullName,
    });
  };

  // Navigate to user profile screen
  const handleMemberPress = (username: string) => {
    navigation.navigate('UserProfile', {
      username,
    });
  };

  // Handle close
  const handleClose = () => {
    navigation.goBack();
  };

  useEffect(() => {
    async function fetchOrgData() {
      setIsLoading(true);

      try {
        // Fetch organization details, repos, and members in parallel
        const [orgDetails, repos, orgMembers] = await Promise.all([
          fetchOrganizationDetails(orgLogin),
          fetchOrganizationRepositories(orgLogin),
          fetchOrganizationMembers(orgLogin),
        ]);

        setOrganization(orgDetails);
        setRepositories(repos);
        setMembers(orgMembers);
      } catch (error) {
        console.error('Error fetching organization data:', error);
        // You might want to show an error state here
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrgData();
  }, [orgLogin]);

  return (
    <OrganizationScreen
      loading={isLoading}
      organization={organization}
      repositories={repositories}
      members={members}
      onClose={handleClose}
      onRepoPress={handleRepoPress}
      onMemberPress={handleMemberPress}
    />
  );
}
