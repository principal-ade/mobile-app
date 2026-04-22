/**
 * Collections API Service
 *
 * Handles syncing starred repo collections with the server.
 * Manages collections, repos, and users via REST API.
 *
 * See: /Users/griever/Developer/web-ade/web-ade/collections-api-spec.md
 */

import { apiConfig } from '../utils/config';
import type { Collection, CollectionRepo, CollectionUser } from '../types/collections';

const API_BASE = `${apiConfig.baseUrl}/starred-collections`;

// ============================================================================
// Response Types
// ============================================================================

export interface CollectionsListResponse {
  collections: Collection[];
  version: number;
}

export type CollectionResponse = Collection;

export interface CreateCollectionRequest {
  name: string;
  description?: string;
  icon?: string;
  orgLogin?: string;
}

export interface UpdateCollectionRequest {
  name?: string;
  description?: string;
  icon?: string;
}

export interface AddRepoRequest {
  owner: string;
  repo: string;
}

export interface AddUserRequest {
  login: string;
}

// ============================================================================
// Collection CRUD
// ============================================================================

/**
 * Get all collections for the authenticated user
 * Requires authentication
 */
export async function getCollections(
  githubToken: string,
  includeItems: boolean = true
): Promise<CollectionsListResponse> {
  const url = `${API_BASE}?include_items=${includeItems}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`Failed to fetch collections: ${response.status}`);
  }

  return await response.json();
}

/**
 * Get a single collection by ID
 * Requires authentication
 */
export async function getCollection(
  githubToken: string,
  collectionId: string
): Promise<CollectionResponse> {
  const url = `${API_BASE}/${collectionId}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    if (response.status === 404) {
      throw new Error('Collection not found');
    }
    throw new Error(`Failed to fetch collection: ${response.status}`);
  }

  return await response.json();
}

/**
 * Create a new collection
 * Requires authentication
 */
export async function createCollection(
  githubToken: string,
  data: CreateCollectionRequest
): Promise<CollectionResponse> {
  const url = `${API_BASE}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${githubToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    if (response.status === 400) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Invalid collection data');
    }
    if (response.status === 409) {
      throw new Error('Collection with this name already exists');
    }
    throw new Error(`Failed to create collection: ${response.status}`);
  }

  return await response.json();
}

/**
 * Update collection metadata (name, description, icon)
 * Requires authentication
 */
export async function updateCollection(
  githubToken: string,
  collectionId: string,
  data: UpdateCollectionRequest
): Promise<CollectionResponse> {
  const url = `${API_BASE}/${collectionId}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${githubToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    if (response.status === 404) {
      throw new Error('Collection not found');
    }
    if (response.status === 400) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Invalid update data');
    }
    throw new Error(`Failed to update collection: ${response.status}`);
  }

  return await response.json();
}

/**
 * Delete a collection
 * Requires authentication
 */
export async function deleteCollection(
  githubToken: string,
  collectionId: string
): Promise<void> {
  const url = `${API_BASE}/${collectionId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${githubToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    if (response.status === 404) {
      throw new Error('Collection not found');
    }
    throw new Error(`Failed to delete collection: ${response.status}`);
  }
}

// ============================================================================
// Repo Management
// ============================================================================

/**
 * Add a repository to a collection
 * Server fetches and caches GitHub metadata
 * Requires authentication
 */
export async function addRepoToCollection(
  githubToken: string,
  collectionId: string,
  owner: string,
  repo: string
): Promise<CollectionRepo> {
  const url = `${API_BASE}/${collectionId}/repos`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${githubToken}`,
    },
    body: JSON.stringify({ owner, repo }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    if (response.status === 404) {
      throw new Error('Collection not found');
    }
    if (response.status === 409) {
      throw new Error('Repository already in collection');
    }
    if (response.status === 400) {
      throw new Error('Invalid owner/repo format');
    }
    if (response.status === 502) {
      throw new Error('GitHub API unavailable or repository not found');
    }
    throw new Error(`Failed to add repository: ${response.status}`);
  }

  return await response.json();
}

/**
 * Remove a repository from a collection
 * Requires authentication
 */
export async function removeRepoFromCollection(
  githubToken: string,
  collectionId: string,
  owner: string,
  repo: string
): Promise<void> {
  const url = `${API_BASE}/${collectionId}/repos/${owner}/${repo}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${githubToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    if (response.status === 404) {
      throw new Error('Collection or repository not found');
    }
    throw new Error(`Failed to remove repository: ${response.status}`);
  }
}

// ============================================================================
// User Management
// ============================================================================

/**
 * Add a GitHub user to a collection
 * Server fetches and caches GitHub user metadata
 * Requires authentication
 */
export async function addUserToCollection(
  githubToken: string,
  collectionId: string,
  login: string
): Promise<CollectionUser> {
  const url = `${API_BASE}/${collectionId}/users`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${githubToken}`,
    },
    body: JSON.stringify({ login }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    if (response.status === 404) {
      throw new Error('Collection not found');
    }
    if (response.status === 409) {
      throw new Error('User already in collection');
    }
    if (response.status === 400) {
      throw new Error('Invalid username format');
    }
    if (response.status === 502) {
      throw new Error('GitHub API unavailable or user not found');
    }
    throw new Error(`Failed to add user: ${response.status}`);
  }

  return await response.json();
}

/**
 * Remove a GitHub user from a collection
 * Requires authentication
 */
export async function removeUserFromCollection(
  githubToken: string,
  collectionId: string,
  login: string
): Promise<void> {
  const url = `${API_BASE}/${collectionId}/users/${login}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${githubToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    if (response.status === 404) {
      throw new Error('Collection or user not found');
    }
    throw new Error(`Failed to remove user: ${response.status}`);
  }
}
