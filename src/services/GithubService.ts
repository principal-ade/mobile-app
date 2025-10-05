import { GitHubContentItem, GitHubRepository } from '../types/github';

const BASE_URL = 'https://api.github.com';

type RequestOptions = {
  headers?: Record<string, string>;
};

async function request<T>(
  endpoint: string,
  token: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `token ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(errorText || `GitHub request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

function encodeRepositorySegment(value: string): string {
  return encodeURIComponent(value);
}

function buildContentsEndpoint(owner: string, repo: string, path: string): string {
  const encodedOwner = encodeRepositorySegment(owner);
  const encodedRepo = encodeRepositorySegment(repo);
  const trimmedPath = path.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!trimmedPath) {
    return `/repos/${encodedOwner}/${encodedRepo}/contents`;
  }

  const encodedPath = trimmedPath
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `/repos/${encodedOwner}/${encodedRepo}/contents/${encodedPath}`;
}

export async function fetchRepositories(token: string): Promise<GitHubRepository[]> {
  return request<GitHubRepository[]>('/user/repos?per_page=100&sort=updated', token);
}

export async function fetchRepositoryContents(
  token: string,
  owner: string,
  repo: string,
  path = '',
): Promise<GitHubContentItem[]> {
  const endpoint = buildContentsEndpoint(owner, repo, path);
  const data = await request<GitHubContentItem | GitHubContentItem[]>(endpoint, token);

  return Array.isArray(data) ? data : [data];
}

export async function fetchMarkdownFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
): Promise<string> {
  const endpoint = buildContentsEndpoint(owner, repo, path);
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.github.v3.raw',
      Authorization: `token ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(errorText || `Failed to load file content (${response.status})`);
  }

  return await response.text();
}
