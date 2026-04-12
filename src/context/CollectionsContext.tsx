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
import { getCollections, saveCollections } from '../utils/feedStorage';

interface CollectionsState {
  collections: Collection[];
  /** Incrementing counter - changes trigger dependent queries to refetch */
  version: number;
}

interface CollectionsContextValue extends CollectionsState {
  /** True while loading initial data from storage */
  isLoading: boolean;

  // Collection mutations
  createCollection: (name: string, icon?: string) => string;
  deleteCollection: (collectionId: string) => void;
  updateCollection: (collectionId: string, updates: Partial<Pick<Collection, 'name' | 'icon' | 'description'>>) => void;

  // Repo mutations
  addRepoToCollection: (collectionId: string, owner: string, repo: string) => void;
  removeRepoFromCollection: (collectionId: string, owner: string, repo: string) => void;

  // User mutations
  addUserToCollection: (collectionId: string, login: string) => void;
  removeUserFromCollection: (collectionId: string, login: string) => void;
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
  const [state, setState] = useState<CollectionsState>({
    collections: initialCollections ?? [],
    version: 0,
  });
  const [isLoading, setIsLoading] = useState(!initialCollections);

  // Update state when parent provides new initial data (multi-account mode)
  useEffect(() => {
    if (onCollectionsChange && initialCollections !== undefined) {
      setState((prev) => ({
        collections: initialCollections,
        version: prev.version,
      }));
    }
  }, [initialCollections, onCollectionsChange]);

  // Bootstrap: Load from storage on mount
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
        const stored = await getCollections();
        setState({
          collections: stored ?? [],
          version: 0,
        });
      } catch (error) {
        console.warn('Failed to load collections from storage:', error);
        setState({
          collections: [],
          version: 0,
        });
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();
  }, [initialCollections, onCollectionsChange]);

  // Persist to storage whenever collections change
  useEffect(() => {
    if (isLoading) return;

    async function persist() {
      try {
        await saveCollections(state.collections);
        // Call parent callback if provided (for server sync)
        if (onCollectionsChange) {
          await onCollectionsChange(state.collections);
        }
      } catch (error) {
        console.warn('Failed to persist collections:', error);
      }
    }

    persist();
  }, [state.collections, isLoading, onCollectionsChange]);

  const createCollection = useCallback((name: string, icon?: string): string => {
    const newCollection: Collection = {
      id: Date.now().toString(),
      name,
      icon,
      repos: [],
      users: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setState((prev) => ({
      collections: [...prev.collections, newCollection],
      version: prev.version + 1,
    }));

    return newCollection.id;
  }, []);

  const deleteCollection = useCallback((collectionId: string) => {
    setState((prev) => ({
      collections: prev.collections.filter((c) => c.id !== collectionId),
      version: prev.version + 1,
    }));
  }, []);

  const updateCollection = useCallback(
    (collectionId: string, updates: Partial<Pick<Collection, 'name' | 'icon' | 'description'>>) => {
      setState((prev) => ({
        collections: prev.collections.map((c) =>
          c.id === collectionId
            ? { ...c, ...updates, updatedAt: new Date().toISOString() }
            : c
        ),
        version: prev.version + 1,
      }));
    },
    []
  );

  const addRepoToCollection = useCallback((collectionId: string, owner: string, repo: string) => {
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
  }, []);

  const removeRepoFromCollection = useCallback((collectionId: string, owner: string, repo: string) => {
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
  }, []);

  const addUserToCollection = useCallback((collectionId: string, login: string) => {
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
  }, []);

  const removeUserFromCollection = useCallback((collectionId: string, login: string) => {
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
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      isLoading,
      createCollection,
      deleteCollection,
      updateCollection,
      addRepoToCollection,
      removeRepoFromCollection,
      addUserToCollection,
      removeUserFromCollection,
    }),
    [
      state,
      isLoading,
      createCollection,
      deleteCollection,
      updateCollection,
      addRepoToCollection,
      removeRepoFromCollection,
      addUserToCollection,
      removeUserFromCollection,
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
