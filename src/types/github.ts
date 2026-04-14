export type GitHubAccountType = 'User' | 'Organization' | 'Bot';

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  type?: GitHubAccountType;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string | null;
  private: boolean;
  fork: boolean;
  parent?: {
    full_name: string;
    owner: {
      login: string;
    };
    name: string;
  };
  stargazers_count: number;
  updated_at: string;
  html_url: string;
  language: string | null;
}

export interface GitHubContentItem {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
  download_url: string | null;
}

export interface GitHubOrganization {
  id: number;
  login: string;
  description: string | null;
  avatar_url: string;
  url: string;
}
