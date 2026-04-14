import { GitHubContentItem, GitHubRepository, GitHubOrganization } from '../types/github';

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

export async function fetchUserRepositories(
  token: string,
  username: string,
): Promise<GitHubRepository[]> {
  const encodedUsername = encodeRepositorySegment(username);
  return request<GitHubRepository[]>(
    `/users/${encodedUsername}/repos?per_page=100&sort=updated`,
    token,
  );
}

export async function fetchUserOrganizations(token: string): Promise<GitHubOrganization[]> {
  return request<GitHubOrganization[]>('/user/orgs?per_page=100', token);
}

export async function fetchOrganizationsForUser(
  token: string,
  username: string,
): Promise<GitHubOrganization[]> {
  const encodedUsername = encodeRepositorySegment(username);
  return request<GitHubOrganization[]>(`/users/${encodedUsername}/orgs?per_page=100`, token);
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

export async function fetchRepoReadme(
  token: string,
  owner: string,
  repo: string,
): Promise<string> {
  const encodedOwner = encodeRepositorySegment(owner);
  const encodedRepo = encodeRepositorySegment(repo);
  const endpoint = `/repos/${encodedOwner}/${encodedRepo}/readme`;

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.github.html',
      Authorization: `token ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('No README found for this repository');
    }
    const errorText = await response.text().catch(() => '');
    throw new Error(errorText || `Failed to load README (${response.status})`);
  }

  return await response.text();
}

export interface OrganizationDetails {
  login: string;
  name: string | null;
  description: string | null;
  avatar_url: string;
  html_url: string;
  blog: string | null;
  location: string | null;
  email: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  created_at: string;
}

export interface OrgMember {
  id: number;
  login: string;
  avatar_url: string;
}

export async function fetchOrganizationDetails(
  orgLogin: string,
): Promise<OrganizationDetails> {
  const encodedOrg = encodeRepositorySegment(orgLogin);
  const response = await fetch(`${BASE_URL}/orgs/${encodedOrg}`, {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch organization details: ${response.status}`);
  }

  return await response.json();
}

export async function fetchOrganizationRepositories(
  orgLogin: string,
): Promise<GitHubRepository[]> {
  const encodedOrg = encodeRepositorySegment(orgLogin);
  const response = await fetch(`${BASE_URL}/orgs/${encodedOrg}/repos?per_page=100&sort=updated`, {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch organization repositories: ${response.status}`);
  }

  return await response.json();
}

export async function fetchOrganizationMembers(
  orgLogin: string,
): Promise<OrgMember[]> {
  const encodedOrg = encodeRepositorySegment(orgLogin);
  const response = await fetch(`${BASE_URL}/orgs/${encodedOrg}/members?per_page=100`, {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch organization members: ${response.status}`);
  }

  return await response.json();
}
