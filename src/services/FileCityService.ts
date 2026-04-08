/**
 * FileCityService - Fetches file trees and builds city data for repositories
 */

import {
  CodeCityBuilderWithGrid,
  getFilesFromGitHubTree,
  buildFileSystemTreeFromFileInfoList,
  createFileHighlightLayers,
} from '@principal-ai/file-city-builder';
import type { CityData, HighlightLayer, FileTypeIconConfig } from '@principal-ai/file-city-builder';
import { apiConfig } from '../utils/config';

// Types matching the web-ade API response
interface GitHubTreeEntry {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeEntry[];
  truncated: boolean;
}

interface GitHubRepoInfoResponse {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  default_branch: string;
}

export interface RepoInfo {
  ownerAvatarUrl: string;
  description: string | null;
  stargazersCount: number;
  forksCount: number;
  language: string | null;
}

export interface FileCityResult {
  cityData: CityData;
  highlightLayers: HighlightLayer[];
  iconMap: Map<string, FileTypeIconConfig>;
  treeSha: string;
  truncated: boolean;
  repoInfo: RepoInfo;
}

/**
 * Fetch repository info from the API
 */
async function fetchRepoInfo(
  owner: string,
  repo: string
): Promise<GitHubRepoInfoResponse> {
  const url = `${apiConfig.baseUrl}/github/repo/${owner}/${repo}?action=info`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Failed to fetch repo info: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data as GitHubRepoInfoResponse;
}

/**
 * Fetch the file tree for a repository from the API
 */
async function fetchFileTree(
  owner: string,
  repo: string,
  ref: string = 'HEAD'
): Promise<GitHubTreeResponse> {
  const url = `${apiConfig.baseUrl}/github/repo/${owner}/${repo}?action=tree&ref=${ref}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Failed to fetch file tree: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data as GitHubTreeResponse;
}

/**
 * Build city data from a GitHub tree response
 */
function buildCityFromTree(treeResponse: GitHubTreeResponse): CityData {
  // Convert GitHub tree to FileInfo array
  const files = getFilesFromGitHubTree(treeResponse);

  // Build the file system tree
  const fileTree = buildFileSystemTreeFromFileInfoList(files, treeResponse.sha);

  // Build the city using the official builder
  const builder = new CodeCityBuilderWithGrid();
  const cityData = builder.buildCityFromFileSystem(fileTree, '');

  return cityData;
}

/**
 * Generate highlight layers and icon map from city buildings using file config
 */
function generateHighlightLayersAndIcons(cityData: CityData): {
  highlightLayers: HighlightLayer[];
  iconMap: Map<string, FileTypeIconConfig>;
} {
  const files = cityData.buildings.map((b) => ({ path: b.path }));
  return createFileHighlightLayers(files);
}

/**
 * Fetch and build a File City visualization for a repository
 */
export async function getFileCityForRepo(
  owner: string,
  repo: string,
  ref: string = 'HEAD'
): Promise<FileCityResult> {
  // Fetch repo info and file tree in parallel
  const [repoInfoResponse, treeResponse] = await Promise.all([
    fetchRepoInfo(owner, repo),
    fetchFileTree(owner, repo, ref),
  ]);

  // Build the city data
  const cityData = buildCityFromTree(treeResponse);

  // Generate highlight layers and icon map using file config
  const { highlightLayers, iconMap } = generateHighlightLayersAndIcons(cityData);

  // Extract repo info
  const repoInfo: RepoInfo = {
    ownerAvatarUrl: repoInfoResponse.owner.avatar_url,
    description: repoInfoResponse.description,
    stargazersCount: repoInfoResponse.stargazers_count,
    forksCount: repoInfoResponse.forks_count,
    language: repoInfoResponse.language,
  };

  return {
    cityData,
    highlightLayers,
    iconMap,
    treeSha: treeResponse.sha,
    truncated: treeResponse.truncated,
    repoInfo,
  };
}

export default {
  getFileCityForRepo,
};
