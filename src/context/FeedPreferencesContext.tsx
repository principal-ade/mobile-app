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

const FeedPreferencesContext = createContext<FeedPreferencesContextValue | undefined>(undefined);

export function FeedPreferencesProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [state, setState] = useState<FeedPreferencesState>({
    followedUsers: [],
    followedRepos: [],
    version: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Bootstrap: Load from storage on mount
  useEffect(() => {
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
  }, []);

  // User mutations
  const addUser = useCallback((user: FollowedUser) => {
    setState((prev) => {
      const exists = prev.followedUsers.some(
        (u) => u.login.toLowerCase() === user.login.toLowerCase()
      );
      if (exists) return prev;

      const updated = [...prev.followedUsers, user];
      saveFollowedUsers(updated).catch(console.error);

      return {
        ...prev,
        followedUsers: updated,
        version: prev.version + 1,
      };
    });
  }, []);

  const removeUser = useCallback((login: string) => {
    setState((prev) => {
      const updated = prev.followedUsers.filter((u) => u.login !== login);
      saveFollowedUsers(updated).catch(console.error);

      return {
        ...prev,
        followedUsers: updated,
        version: prev.version + 1,
      };
    });
  }, []);

  const setUsers = useCallback((users: FollowedUser[]) => {
    setState((prev) => {
      saveFollowedUsers(users).catch(console.error);

      return {
        ...prev,
        followedUsers: users,
        version: prev.version + 1,
      };
    });
  }, []);

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
      saveFollowedRepos(updated).catch(console.error);

      return {
        ...prev,
        followedRepos: updated,
        version: prev.version + 1,
      };
    });
  }, []);

  const removeRepo = useCallback((owner: string, repo: string) => {
    setState((prev) => {
      const updated = prev.followedRepos.filter(
        (r) => !(r.owner === owner && r.repo === repo)
      );
      saveFollowedRepos(updated).catch(console.error);

      return {
        ...prev,
        followedRepos: updated,
        version: prev.version + 1,
      };
    });
  }, []);

  const setRepos = useCallback((repos: FollowedRepo[]) => {
    setState((prev) => {
      saveFollowedRepos(repos).catch(console.error);

      return {
        ...prev,
        followedRepos: repos,
        version: prev.version + 1,
      };
    });
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setState((prev) => {
      saveFollowedUsers([]).catch(console.error);
      saveFollowedRepos(DEFAULT_REPOS).catch(console.error);

      return {
        followedUsers: [],
        followedRepos: DEFAULT_REPOS,
        version: prev.version + 1,
      };
    });
  }, []);

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
