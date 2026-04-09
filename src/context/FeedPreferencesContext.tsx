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
  type FollowedUser,
  type FollowedRepo,
  getFollowedUsers,
  getFollowedRepos,
  saveFollowedUsers,
  saveFollowedRepos,
} from '../utils/feedStorage';

// Re-export types for convenience
export type { FollowedUser, FollowedRepo } from '../utils/feedStorage';

// Parse featured repos into structured format (default repos)
export const DEFAULT_REPOS: FollowedRepo[] = FEATURED_REPOS.map((fullName) => {
  const [owner, repo] = fullName.split('/') as [string, string];
  return { owner, repo, isFeatured: true };
});

interface FeedPreferencesState {
  followedUsers: FollowedUser[];
  followedRepos: FollowedRepo[];
  /** Incrementing counter - changes trigger dependent queries to refetch */
  version: number;
}

interface FeedPreferencesContextValue extends FeedPreferencesState {
  /** True while loading initial data from storage */
  isLoading: boolean;

  // User mutations
  addUser: (user: FollowedUser) => void;
  removeUser: (login: string) => void;
  setUsers: (users: FollowedUser[]) => void;

  // Repo mutations
  addRepo: (repo: FollowedRepo) => void;
  removeRepo: (owner: string, repo: string) => void;
  setRepos: (repos: FollowedRepo[]) => void;

  // Reset
  resetToDefaults: () => void;
}

interface FeedPreferencesProviderProps extends PropsWithChildren {
  initialUsers?: FollowedUser[];
  initialRepos?: FollowedRepo[];
  onUsersChange?: (users: FollowedUser[]) => Promise<void>;
  onReposChange?: (repos: FollowedRepo[]) => Promise<void>;
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
    followedUsers: initialUsers ?? [],
    followedRepos: initialRepos ?? DEFAULT_REPOS,
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
          getFollowedUsers(),
          getFollowedRepos(),
        ]);

        if (!isMounted) return;

        setState({
          followedUsers: savedUsers ?? [],
          followedRepos: savedRepos ?? DEFAULT_REPOS,
          version: 0,
        });
      } catch (error) {
        console.error('Failed to load feed preferences:', error);
        // Fall back to defaults
        if (isMounted) {
          setState({
            followedUsers: [],
            followedRepos: DEFAULT_REPOS,
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
  const addUser = useCallback((user: FollowedUser) => {
    setState((prev) => {
      const exists = prev.followedUsers.some(
        (u) => u.login.toLowerCase() === user.login.toLowerCase()
      );
      if (exists) return prev;

      const updated = [...prev.followedUsers, user];

      // Notify parent context (MultiAccountContext)
      if (onUsersChange) {
        onUsersChange(updated).catch(console.error);
      } else {
        // Fallback to direct storage
        saveFollowedUsers(updated).catch(console.error);
      }

      return {
        ...prev,
        followedUsers: updated,
        version: prev.version + 1,
      };
    });
  }, [onUsersChange]);

  const removeUser = useCallback((login: string) => {
    setState((prev) => {
      const updated = prev.followedUsers.filter((u) => u.login !== login);

      // Notify parent context (MultiAccountContext)
      if (onUsersChange) {
        onUsersChange(updated).catch(console.error);
      } else {
        // Fallback to direct storage
        saveFollowedUsers(updated).catch(console.error);
      }

      return {
        ...prev,
        followedUsers: updated,
        version: prev.version + 1,
      };
    });
  }, [onUsersChange]);

  const setUsers = useCallback((users: FollowedUser[]) => {
    setState((prev) => {
      // Notify parent context (MultiAccountContext)
      if (onUsersChange) {
        onUsersChange(users).catch(console.error);
      } else {
        // Fallback to direct storage
        saveFollowedUsers(users).catch(console.error);
      }

      return {
        ...prev,
        followedUsers: users,
        version: prev.version + 1,
      };
    });
  }, [onUsersChange]);

  // Repo mutations
  const addRepo = useCallback((repo: FollowedRepo) => {
    setState((prev) => {
      const exists = prev.followedRepos.some(
        (r) =>
          r.owner.toLowerCase() === repo.owner.toLowerCase() &&
          r.repo.toLowerCase() === repo.repo.toLowerCase()
      );
      if (exists) return prev;

      const updated = [...prev.followedRepos, repo];

      // Notify parent context (MultiAccountContext)
      if (onReposChange) {
        onReposChange(updated).catch(console.error);
      } else {
        // Fallback to direct storage
        saveFollowedRepos(updated).catch(console.error);
      }

      return {
        ...prev,
        followedRepos: updated,
        version: prev.version + 1,
      };
    });
  }, [onReposChange]);

  const removeRepo = useCallback((owner: string, repo: string) => {
    setState((prev) => {
      const updated = prev.followedRepos.filter(
        (r) => !(r.owner === owner && r.repo === repo)
      );

      // Notify parent context (MultiAccountContext)
      if (onReposChange) {
        onReposChange(updated).catch(console.error);
      } else {
        // Fallback to direct storage
        saveFollowedRepos(updated).catch(console.error);
      }

      return {
        ...prev,
        followedRepos: updated,
        version: prev.version + 1,
      };
    });
  }, [onReposChange]);

  const setRepos = useCallback((repos: FollowedRepo[]) => {
    setState((prev) => {
      // Notify parent context (MultiAccountContext)
      if (onReposChange) {
        onReposChange(repos).catch(console.error);
      } else {
        // Fallback to direct storage
        saveFollowedRepos(repos).catch(console.error);
      }

      return {
        ...prev,
        followedRepos: repos,
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
        saveFollowedUsers([]).catch(console.error);
        saveFollowedRepos(DEFAULT_REPOS).catch(console.error);
      }

      return {
        followedUsers: [],
        followedRepos: DEFAULT_REPOS,
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
