import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Collection } from '../types/collections';
import { getCollections as getStoredCollections, saveCollections } from '../utils/feedStorage';
import { useAuth } from '../hooks/useAuth';
import * as CollectionsService from '../services/CollectionsService';

interface CollectionsState {
  collections: Collection[];
  /** Incrementing counter - changes trigger dependent queries to refetch */
  version: number;
}

interface CollectionsContextValue extends CollectionsState {
  /** True while loading initial data from storage */
  isLoading: boolean;
  /** True if connected to server */
  isOnline: boolean;

  // Collection mutations
  createCollection: (name: string, icon?: string, orgLogin?: string) => string;
  deleteCollection: (collectionId: string) => void;
  updateCollection: (collectionId: string, updates: Partial<Pick<Collection, 'name' | 'icon' | 'description'>>) => void;

  // Repo mutations
  addRepoToCollection: (collectionId: string, owner: string, repo: string) => void;
  removeRepoFromCollection: (collectionId: string, owner: string, repo: string) => void;

  // User mutations
  addUserToCollection: (collectionId: string, login: string) => void;
  removeUserFromCollection: (collectionId: string, login: string) => void;

  // Sync control
  syncWithServer: () => Promise<void>;
}

interface CollectionsProviderProps extends PropsWithChildren {
  initialCollections?: Collection[];
  onCollectionsChange?: (collections: Collection[]) => Promise<void>;
}

const CollectionsContext = createContext<CollectionsContextValue | undefined>(undefined);

export function CollectionsProvider({
  children,
  initialCollections,
  onCollectionsChange,
}: CollectionsProviderProps): React.JSX.Element {
  const { token } = useAuth();
  const [state, setState] = useState<CollectionsState>({
    collections: initialCollections ?? [],
    version: 0,
  });
  const [isLoading, setIsLoading] = useState(!initialCollections);
  const [isOnline, setIsOnline] = useState(true);

  // Update state when parent provides new initial data (multi-account mode)
  useEffect(() => {
    if (onCollectionsChange && initialCollections !== undefined) {
      setState((prev) => ({
        collections: initialCollections,
        version: prev.version,
      }));
    }
  }, [initialCollections, onCollectionsChange]);

  // Bootstrap: Load from server (server-first approach)
  useEffect(() => {
    if (initialCollections) {
      setIsLoading(false);
      return;
    }

    if (onCollectionsChange) {
      setIsLoading(false);
      return;
    }

    async function bootstrap() {
      // Small delay to ensure native modules are ready
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        // Server-first: Try to load from server if authenticated
        if (token) {
          try {
            const response = await CollectionsService.getCollections(token);
            setState({
              collections: response.collections,
              version: response.version,
            });
            // Cache to local storage for offline use
            await saveCollections(response.collections);
            setIsOnline(true);
            return;
          } catch (error) {
            console.warn('Failed to load collections from server, falling back to local:', error);
            setIsOnline(false);
          }
        }

        // Fallback: Load from local storage
        const stored = await getStoredCollections();
        setState({
          collections: stored ?? [],
          version: 0,
        });
      } catch (error) {
        console.warn('Failed to load collections:', error);
        setState({
          collections: [],
          version: 0,
        });
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();
  }, [initialCollections, onCollectionsChange, token]);

  // Persist to local storage as cache for offline mode
  useEffect(() => {
    if (isLoading) return;

    async function persist() {
      try {
        // Always save to local storage as cache
        await saveCollections(state.collections);

        // Call parent callback if provided (for multi-account mode)
        if (onCollectionsChange) {
          await onCollectionsChange(state.collections);
        }
      } catch (error) {
        console.warn('Failed to persist collections to local storage:', error);
      }
    }

    persist();
  }, [state.collections, isLoading, onCollectionsChange]);

  const createCollection = useCallback((name: string, icon?: string, orgLogin?: string): string => {
    // Optimistic update with temp ID
    const tempId = Date.now().toString();
    const tempCollection: Collection = {
      id: tempId,
      name,
      icon,
      ownerType: orgLogin ? 'org' : 'user',
      ownerLogin: orgLogin,
      repos: [],
      users: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setState((prev) => ({
      collections: [...prev.collections, tempCollection],
      version: prev.version + 1,
    }));

    // Sync to server in background
    if (token && isOnline) {
      CollectionsService.createCollection(token, { name, icon, orgLogin })
        .then((serverCollection) => {
          // Replace temp collection with server version (preserving server ID)
          setState((prev) => ({
            collections: prev.collections.map((c) =>
              c.id === tempId ? serverCollection : c
            ),
            version: prev.version,
          }));
        })
        .catch((error) => {
          console.warn('Failed to create collection on server:', error);
          setIsOnline(false);
        });
    }

    return tempId;
  }, [token, isOnline]);

  const deleteCollection = useCallback((collectionId: string) => {
    // Optimistic update
    setState((prev) => ({
      collections: prev.collections.filter((c) => c.id !== collectionId),
      version: prev.version + 1,
    }));

    // Sync to server in background
    if (token && isOnline) {
      CollectionsService.deleteCollection(token, collectionId).catch((error) => {
        console.warn('Failed to delete collection on server:', error);
        setIsOnline(false);
      });
    }
  }, [token, isOnline]);

  const updateCollection = useCallback(
    (collectionId: string, updates: Partial<Pick<Collection, 'name' | 'icon' | 'description'>>) => {
      // Optimistic update
      setState((prev) => ({
        collections: prev.collections.map((c) =>
          c.id === collectionId
            ? { ...c, ...updates, updatedAt: new Date().toISOString() }
            : c
        ),
        version: prev.version + 1,
      }));

      // Sync to server in background
      if (token && isOnline) {
        CollectionsService.updateCollection(token, collectionId, updates)
          .then((serverCollection) => {
            // Update with server response to ensure consistency
            setState((prev) => ({
              collections: prev.collections.map((c) =>
                c.id === collectionId ? serverCollection : c
              ),
              version: prev.version,
            }));
          })
          .catch((error) => {
            console.warn('Failed to update collection on server:', error);
            setIsOnline(false);
          });
      }
    },
    [token, isOnline]
  );

  const addRepoToCollection = useCallback((collectionId: string, owner: string, repo: string) => {
    // Optimistic update
    setState((prev) => ({
      collections: prev.collections.map((c) => {
        if (c.id !== collectionId) return c;

        // Check if repo already exists
        const exists = c.repos.some((r) => r.owner === owner && r.repo === repo);
        if (exists) return c;

        return {
          ...c,
          repos: [
            ...c.repos,
            { owner, repo, addedAt: new Date().toISOString() },
          ],
          updatedAt: new Date().toISOString(),
        };
      }),
      version: prev.version + 1,
    }));

    // Sync to server in background (server will fetch GitHub metadata)
    if (token && isOnline) {
      CollectionsService.addRepoToCollection(token, collectionId, owner, repo)
        .then((repoWithMetadata) => {
          // Update with server response which includes GitHub metadata
          setState((prev) => ({
            collections: prev.collections.map((c) => {
              if (c.id !== collectionId) return c;
              return {
                ...c,
                repos: c.repos.map((r) =>
                  r.owner === owner && r.repo === repo ? repoWithMetadata : r
                ),
                updatedAt: new Date().toISOString(),
              };
            }),
            version: prev.version,
          }));
        })
        .catch((error) => {
          console.warn('Failed to add repo on server:', error);
          setIsOnline(false);
        });
    }
  }, [token, isOnline]);

  const removeRepoFromCollection = useCallback((collectionId: string, owner: string, repo: string) => {
    // Optimistic update
    setState((prev) => ({
      collections: prev.collections.map((c) => {
        if (c.id !== collectionId) return c;

        return {
          ...c,
          repos: c.repos.filter((r) => !(r.owner === owner && r.repo === repo)),
          updatedAt: new Date().toISOString(),
        };
      }),
      version: prev.version + 1,
    }));

    // Sync to server in background
    if (token && isOnline) {
      CollectionsService.removeRepoFromCollection(token, collectionId, owner, repo).catch((error) => {
        console.warn('Failed to remove repo on server:', error);
        setIsOnline(false);
      });
    }
  }, [token, isOnline]);

  const addUserToCollection = useCallback((collectionId: string, login: string) => {
    // Optimistic update
    setState((prev) => ({
      collections: prev.collections.map((c) => {
        if (c.id !== collectionId) return c;

        // Check if user already exists
        const exists = c.users.some((u) => u.login === login);
        if (exists) return c;

        return {
          ...c,
          users: [
            ...c.users,
            { login, addedAt: new Date().toISOString() },
          ],
          updatedAt: new Date().toISOString(),
        };
      }),
      version: prev.version + 1,
    }));

    // Sync to server in background (server will fetch GitHub user metadata)
    if (token && isOnline) {
      CollectionsService.addUserToCollection(token, collectionId, login)
        .then((userWithMetadata) => {
          // Update with server response which includes GitHub metadata
          setState((prev) => ({
            collections: prev.collections.map((c) => {
              if (c.id !== collectionId) return c;
              return {
                ...c,
                users: c.users.map((u) =>
                  u.login === login ? userWithMetadata : u
                ),
                updatedAt: new Date().toISOString(),
              };
            }),
            version: prev.version,
          }));
        })
        .catch((error) => {
          console.warn('Failed to add user on server:', error);
          setIsOnline(false);
        });
    }
  }, [token, isOnline]);

  const removeUserFromCollection = useCallback((collectionId: string, login: string) => {
    // Optimistic update
    setState((prev) => ({
      collections: prev.collections.map((c) => {
        if (c.id !== collectionId) return c;

        return {
          ...c,
          users: c.users.filter((u) => u.login !== login),
          updatedAt: new Date().toISOString(),
        };
      }),
      version: prev.version + 1,
    }));

    // Sync to server in background
    if (token && isOnline) {
      CollectionsService.removeUserFromCollection(token, collectionId, login).catch((error) => {
        console.warn('Failed to remove user on server:', error);
        setIsOnline(false);
      });
    }
  }, [token, isOnline]);

  const syncWithServer = useCallback(async () => {
    if (!token) {
      console.warn('Cannot sync: not authenticated');
      return;
    }

    try {
      const response = await CollectionsService.getCollections(token);
      setState({
        collections: response.collections,
        version: response.version,
      });
      // Cache to local storage
      await saveCollections(response.collections);
      setIsOnline(true);
    } catch (error) {
      console.warn('Failed to sync with server:', error);
      setIsOnline(false);
      throw error;
    }
  }, [token]);

  const value = useMemo(
    () => ({
      ...state,
      isLoading,
      isOnline,
      createCollection,
      deleteCollection,
      updateCollection,
      addRepoToCollection,
      removeRepoFromCollection,
      addUserToCollection,
      removeUserFromCollection,
      syncWithServer,
    }),
    [
      state,
      isLoading,
      isOnline,
      createCollection,
      deleteCollection,
      updateCollection,
      addRepoToCollection,
      removeRepoFromCollection,
      addUserToCollection,
      removeUserFromCollection,
      syncWithServer,
    ]
  );

  return <CollectionsContext.Provider value={value}>{children}</CollectionsContext.Provider>;
}

export function useCollections(): CollectionsContextValue {
  const context = useContext(CollectionsContext);
  if (!context) {
    throw new Error('useCollections must be used within CollectionsProvider');
  }
  return context;
}
