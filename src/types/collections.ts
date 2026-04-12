export type CollectionItemType = 'repo' | 'user';

export interface CollectionRepo {
  owner: string;
  repo: string;
  addedAt: string;
  // Optional cached metadata from GitHub
  description?: string;
  stargazersCount?: number;
  avatarUrl?: string;
}

export interface CollectionUser {
  login: string;
  addedAt: string;
  // Optional cached metadata from GitHub
  name?: string;
  avatarUrl?: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  icon?: string; // Optional Lucide icon name for the collection
  repos: CollectionRepo[];
  users: CollectionUser[];
  createdAt: string;
  updatedAt: string;
}

export interface StarredRepo {
  owner: string;
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  owner_avatar_url: string;
  // Optional fields for enhanced display
  topics?: string[];
  updated_at?: string;
}
