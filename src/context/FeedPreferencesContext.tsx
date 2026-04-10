import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { FEATURED_REPOS } from '../services/ActivityFeedService';
import {
  type WatchedUser,
  type WatchedRepo,
  getWatchedUsers,
  getWatchedRepos,
  saveWatchedUsers,
  saveWatchedRepos,
} from '../utils/feedStorage';

// Re-export types for convenience
export type { WatchedUser, WatchedRepo } from '../utils/feedStorage';

// Parse featured repos into structured format (default repos)
export const DEFAULT_REPOS: WatchedRepo[] = FEATURED_REPOS.map((fullName) => {
  const [owner, repo] = fullName.split('/') as [string, string];
  return { owner, repo, isFeatured: true };
});

interface FeedPreferencesState {
  watchedUsers: WatchedUser[];
  watchedRepos: WatchedRepo[];
  /** Incrementing counter - changes trigger dependent queries to refetch */
  version: number;
}

interface FeedPreferencesContextValue extends FeedPreferencesState {
  /** True while loading initial data from storage */
  isLoading: boolean;

  // User mutations
  addUser: (user: WatchedUser) => void;
  removeUser: (login: string) => void;
  setUsers: (users: WatchedUser[]) => void;

  // Repo mutations
  addRepo: (repo: WatchedRepo) => void;
  removeRepo: (owner: string, repo: string) => void;
  setRepos: (repos: WatchedRepo[]) => void;

  // Reset
  resetToDefaults: () => void;
}

interface FeedPreferencesProviderProps extends PropsWithChildren {
  initialUsers?: WatchedUser[];
  initialRepos?: WatchedRepo[];
  onUsersChange?: (users: WatchedUser[]) => Promise<void>;
  onReposChange?: (repos: WatchedRepo[]) => Promise<void>;
}

const FeedPreferencesContext = createContext<FeedPreferencesContextValue | undefined>(undefined);

export function FeedPreferencesProvider({
  children,
  initialUsers,
  initialRepos,
  onUsersChange,
  onReposChange,
}: FeedPreferencesProviderProps): React.JSX.Element {
  const [state, setState] = useState<FeedPreferencesState>({
    watchedUsers: initialUsers ?? [],
    watchedRepos: initialRepos ?? DEFAULT_REPOS,
    version: 0,
  });
  const [isLoading, setIsLoading] = useState(!(initialUsers || initialRepos));

  // Bootstrap: Load from storage on mount (only if no initial data provided)
  useEffect(() => {
    // Skip bootstrap if initial data was provided
    if (initialUsers || initialRepos) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const bootstrap = async () => {
      try {
        const [savedUsers, savedRepos] = await Promise.all([
          getWatchedUsers(),
          getWatchedRepos(),
        ]);

        if (!isMounted) return;

        setState({
          watchedUsers: savedUsers ?? [],
          watchedRepos: savedRepos ?? DEFAULT_REPOS,
          version: 0,
        });
      } catch (error) {
        console.error('Failed to load feed preferences:', error);
        // Fall back to defaults
        if (isMounted) {
          setState({
            watchedUsers: [],
            watchedRepos: DEFAULT_REPOS,
            version: 0,
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [initialUsers, initialRepos]);

  // User mutations
  const addUser = useCallback((user: WatchedUser) => {
    setState((prev) => {
      const exists = prev.watchedUsers.some(
        (u) => u.login.toLowerCase() === user.login.toLowerCase()
      );
      if (exists) return prev;

      const updated = [...prev.watchedUsers, user];

      // Notify parent context (MultiAccountContext)
      if (onUsersChange) {
        onUsersChange(updated).catch(console.error);
      } else {
        // Fallback to direct storage
        saveWatchedUsers(updated).catch(console.error);
      }

      return {
        ...prev,
        watchedUsers: updated,
        version: prev.version + 1,
      };
    });
  }, [onUsersChange]);

  const removeUser = useCallback((login: string) => {
    setState((prev) => {
      const updated = prev.watchedUsers.filter((u) => u.login !== login);

      // Notify parent context (MultiAccountContext)
      if (onUsersChange) {
        onUsersChange(updated).catch(console.error);
      } else {
        // Fallback to direct storage
        saveWatchedUsers(updated).catch(console.error);
      }

      return {
        ...prev,
        watchedUsers: updated,
        version: prev.version + 1,
      };
    });
  }, [onUsersChange]);

  const setUsers = useCallback((users: WatchedUser[]) => {
    setState((prev) => {
      // Notify parent context (MultiAccountContext)
      if (onUsersChange) {
        onUsersChange(users).catch(console.error);
      } else {
        // Fallback to direct storage
        saveWatchedUsers(users).catch(console.error);
      }

      return {
        ...prev,
        watchedUsers: users,
        version: prev.version + 1,
      };
    });
  }, [onUsersChange]);

  // Repo mutations
  const addRepo = useCallback((repo: WatchedRepo) => {
    setState((prev) => {
      const exists = prev.watchedRepos.some(
        (r) =>
          r.owner.toLowerCase() === repo.owner.toLowerCase() &&
          r.repo.toLowerCase() === repo.repo.toLowerCase()
      );
      if (exists) return prev;

      const updated = [...prev.watchedRepos, repo];

      // Notify parent context (MultiAccountContext)
      if (onReposChange) {
        onReposChange(updated).catch(console.error);
      } else {
        // Fallback to direct storage
        saveWatchedRepos(updated).catch(console.error);
      }

      return {
        ...prev,
        watchedRepos: updated,
        version: prev.version + 1,
      };
    });
  }, [onReposChange]);

  const removeRepo = useCallback((owner: string, repo: string) => {
    setState((prev) => {
      const updated = prev.watchedRepos.filter(
        (r) => !(r.owner === owner && r.repo === repo)
      );

      // Notify parent context (MultiAccountContext)
      if (onReposChange) {
        onReposChange(updated).catch(console.error);
      } else {
        // Fallback to direct storage
        saveWatchedRepos(updated).catch(console.error);
      }

      return {
        ...prev,
        watchedRepos: updated,
        version: prev.version + 1,
      };
    });
  }, [onReposChange]);

  const setRepos = useCallback((repos: WatchedRepo[]) => {
    setState((prev) => {
      // Notify parent context (MultiAccountContext)
      if (onReposChange) {
        onReposChange(repos).catch(console.error);
      } else {
        // Fallback to direct storage
        saveWatchedRepos(repos).catch(console.error);
      }

      return {
        ...prev,
        watchedRepos: repos,
        version: prev.version + 1,
      };
    });
  }, [onReposChange]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setState((prev) => {
      // Notify parent context (MultiAccountContext)
      if (onUsersChange && onReposChange) {
        onUsersChange([]).catch(console.error);
        onReposChange(DEFAULT_REPOS).catch(console.error);
      } else {
        // Fallback to direct storage
        saveWatchedUsers([]).catch(console.error);
        saveWatchedRepos(DEFAULT_REPOS).catch(console.error);
      }

      return {
        watchedUsers: [],
        watchedRepos: DEFAULT_REPOS,
        version: prev.version + 1,
      };
    });
  }, [onUsersChange, onReposChange]);

  const value = useMemo<FeedPreferencesContextValue>(
    () => ({
      ...state,
      isLoading,
      addUser,
      removeUser,
      setUsers,
      addRepo,
      removeRepo,
      setRepos,
      resetToDefaults,
    }),
    [state, isLoading, addUser, removeUser, setUsers, addRepo, removeRepo, setRepos, resetToDefaults]
  );

  return (
    <FeedPreferencesContext.Provider value={value}>
      {children}
    </FeedPreferencesContext.Provider>
  );
}

export function useFeedPreferences(): FeedPreferencesContextValue {
  const context = useContext(FeedPreferencesContext);
  if (!context) {
    throw new Error('useFeedPreferences must be used within a FeedPreferencesProvider');
  }
  return context;
}
