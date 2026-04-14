/**
 * OrganizationScreenContainer
 *
 * Container component that fetches organization data from GitHub API
 * and renders the OrganizationScreen component.
 */

import React, { useState, useEffect } from 'react';
import { useRoute, useNavigation, RouteProp, type NavigationProp } from '@react-navigation/native';
import { OrganizationScreen, type OrganizationInfo } from './OrganizationScreen';
import type { SearchStackParamList } from '../navigation/types';
import {
  fetchOrganizationDetails,
  fetchOrganizationRepositories,
  fetchOrganizationMembers,
  type OrgMember,
} from '../services/GithubService';
import { getPinnedRepositories } from '../services/GitHubSearchService';
import { GitHubRepository } from '../types/github';

type OrganizationRouteProp = RouteProp<SearchStackParamList, 'Organization'>;

export function OrganizationScreenContainer() {
  const route = useRoute<OrganizationRouteProp>();
  const navigation = useNavigation<NavigationProp<SearchStackParamList>>();
  const { orgLogin } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [organization, setOrganization] = useState<OrganizationInfo | undefined>(undefined);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [pinnedRepoNames, setPinnedRepoNames] = useState<string[]>([]);
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
        // Fetch organization details, repos, members, and pinned repos in parallel
        const [orgDetails, repos, orgMembers, pinnedRepoNames] = await Promise.allSettled([
          fetchOrganizationDetails(orgLogin),
          fetchOrganizationRepositories(orgLogin),
          fetchOrganizationMembers(orgLogin),
          getPinnedRepositories(orgLogin),
        ]);

        if (orgDetails.status === 'fulfilled') {
          setOrganization(orgDetails.value);
        }

        if (repos.status === 'fulfilled') {
          const pinnedNames = pinnedRepoNames.status === 'fulfilled' ? pinnedRepoNames.value : [];
          setPinnedRepoNames(pinnedNames);

          // Separate pinned and non-pinned repos
          const pinned: GitHubRepository[] = [];
          const nonPinned: GitHubRepository[] = [];

          repos.value.forEach(repo => {
            if (pinnedNames.includes(repo.full_name)) {
              pinned.push(repo);
            } else {
              nonPinned.push(repo);
            }
          });

          // Sort non-pinned by updated_at (most recent first)
          const sortedNonPinned = nonPinned.sort((a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );

          // Sort pinned repos by the order they appear in pinnedNames
          const sortedPinned = pinned.sort((a, b) => {
            const aIndex = pinnedNames.indexOf(a.full_name);
            const bIndex = pinnedNames.indexOf(b.full_name);
            return aIndex - bIndex;
          });

          // Pinned repos first, then sorted repos
          setRepositories([...sortedPinned, ...sortedNonPinned]);
        }

        if (orgMembers.status === 'fulfilled') {
          setMembers(orgMembers.value);
        }
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
      pinnedRepoNames={pinnedRepoNames}
      members={members}
      onClose={handleClose}
      onRepoPress={handleRepoPress}
      onMemberPress={handleMemberPress}
    />
  );
}
