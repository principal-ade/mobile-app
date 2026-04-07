/**
 * FileCityService - Fetches file trees and builds city data for repositories
 */

import {
  CodeCityBuilderWithGrid,
  getFilesFromGitHubTree,
  buildFileSystemTreeFromFileInfoList,
} from '@principal-ai/file-city-builder';
import type { CityData, HighlightLayer } from '@principal-ai/file-city-builder';
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

export interface FileCityResult {
  cityData: CityData;
  highlightLayers: HighlightLayer[];
  treeSha: string;
  truncated: boolean;
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
 * Generate highlight layers based on file types in the city
 */
function generateHighlightLayers(cityData: CityData): HighlightLayer[] {
  const layers: HighlightLayer[] = [];

  // TypeScript/JavaScript files
  const tsFiles = cityData.buildings.filter(
    (b) =>
      b.path.endsWith('.ts') ||
      b.path.endsWith('.tsx') ||
      b.path.endsWith('.js') ||
      b.path.endsWith('.jsx')
  );

  if (tsFiles.length > 0) {
    layers.push({
      id: 'typescript-js',
      name: 'TypeScript/JavaScript',
      enabled: true,
      color: '#3178c6',
      opacity: 1,
      borderWidth: 2,
      priority: 10,
      items: tsFiles.slice(0, 50).map((b) => ({
        path: b.path,
        type: 'file' as const,
        renderStrategy: 'border' as const,
      })),
    });
  }

  // Test files
  const testFiles = cityData.buildings.filter(
    (b) =>
      b.path.includes('.test.') ||
      b.path.includes('.spec.') ||
      b.path.includes('__tests__')
  );

  if (testFiles.length > 0) {
    layers.push({
      id: 'tests',
      name: 'Test Files',
      enabled: true,
      color: '#22c55e',
      opacity: 1,
      borderWidth: 2,
      priority: 20,
      items: testFiles.slice(0, 30).map((b) => ({
        path: b.path,
        type: 'file' as const,
        renderStrategy: 'border' as const,
      })),
    });
  }

  // Config files
  const configFiles = cityData.buildings.filter(
    (b) =>
      b.path.endsWith('.json') ||
      b.path.endsWith('.yaml') ||
      b.path.endsWith('.yml') ||
      b.path.endsWith('.toml') ||
      b.path.includes('config')
  );

  if (configFiles.length > 0) {
    layers.push({
      id: 'config',
      name: 'Config Files',
      enabled: false, // Disabled by default
      color: '#f59e0b',
      opacity: 1,
      borderWidth: 2,
      priority: 5,
      items: configFiles.slice(0, 30).map((b) => ({
        path: b.path,
        type: 'file' as const,
        renderStrategy: 'border' as const,
      })),
    });
  }

  return layers;
}

/**
 * Fetch and build a File City visualization for a repository
 */
export async function getFileCityForRepo(
  owner: string,
  repo: string,
  ref: string = 'HEAD'
): Promise<FileCityResult> {
  // Fetch the file tree from the API
  const treeResponse = await fetchFileTree(owner, repo, ref);

  // Build the city data
  const cityData = buildCityFromTree(treeResponse);

  // Generate highlight layers
  const highlightLayers = generateHighlightLayers(cityData);

  return {
    cityData,
    highlightLayers,
    treeSha: treeResponse.sha,
    truncated: treeResponse.truncated,
  };
}

export default {
  getFileCityForRepo,
};
