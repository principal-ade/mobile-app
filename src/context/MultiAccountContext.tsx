/**
 * MultiAccountContext
 *
 * Orchestrates multi-account support by managing account registry,
 * active account switching, and providing account-scoped data to child contexts.
 */

import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { AccountInfo, AccountRegistry } from '../types/account';
import type { AuthTokens } from '../utils/authStorage';
import type { WatchedUser, WatchedRepo } from '../utils/feedStorage';
import type { GitHubUser } from '../types/github';
import {
  getAccountRegistry,
  saveAccountRegistry,
  getAccountTokens,
  saveAccountTokens,
  getAccountFeedUsers,
  saveAccountFeedUsers,
  getAccountFeedRepos,
  saveAccountFeedRepos,
  deleteAccountData,
} from '../utils/accountStorage';
import { migrateLegacyAccount } from '../utils/accountMigration';

export interface AccountFeedPreferences {
  followedUsers: WatchedUser[];
  followedRepos: WatchedRepo[];
}

interface MultiAccountContextValue {
  // Account management
  accounts: AccountInfo[];
  activeAccount: AccountInfo | null;
  activeAccountId: number | null;

  // Loading states
  isLoading: boolean;
  isSwitching: boolean;

  // Operations
  switchAccount: (userId: number) => Promise<void>;
  addAccount: (tokens: AuthTokens, user: GitHubUser) => Promise<void>;
  removeAccount: (userId: number) => Promise<void>;

  // Current account data (for child contexts)
  currentTokens: AuthTokens | null;
  currentFeedPreferences: AccountFeedPreferences | null;
}

const MultiAccountContext = createContext<MultiAccountContextValue | undefined>(undefined);

export function MultiAccountProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [registry, setRegistry] = useState<AccountRegistry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  // Current account data (loaded from storage)
  const [currentTokens, setCurrentTokens] = useState<AuthTokens | null>(null);
  const [currentFeedPreferences, setCurrentFeedPreferences] = useState<AccountFeedPreferences | null>(null);

  // Load account-specific data from storage
  const loadAccountData = useCallback(async (userId: number) => {
    const [tokens, users, repos] = await Promise.all([
      getAccountTokens(userId),
      getAccountFeedUsers(userId),
      getAccountFeedRepos(userId),
    ]);

    setCurrentTokens(tokens);
    setCurrentFeedPreferences({
      followedUsers: users,
      followedRepos: repos,
    });
  }, []);

  // Bootstrap: migrate legacy, load registry, load active account data
  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        // 1. Migrate legacy data if needed
        await migrateLegacyAccount();

        // 2. Load registry
        const loadedRegistry = await getAccountRegistry();
        if (!loadedRegistry) {
          // No accounts yet
          if (isMounted) {
            setIsLoading(false);
          }
          return;
        }

        if (isMounted) {
          setRegistry(loadedRegistry);
        }

        // 3. Load active account data
        if (loadedRegistry.activeAccountId) {
          await loadAccountData(loadedRegistry.activeAccountId);
        }
      } catch (error) {
        console.error('Multi-account bootstrap failed:', error);
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
  }, [loadAccountData]);

  // Switch active account
  const switchAccount = useCallback(
    async (userId: number) => {
      if (!registry) return;

      // Check if account exists
      const accountExists = registry.accounts.some((a) => a.userId === userId);
      if (!accountExists) {
        console.error(`Account ${userId} not found in registry`);
        return;
      }

      // Don't switch if already active
      if (registry.activeAccountId === userId) {
        return;
      }

      setIsSwitching(true);
      try {
        // 1. Load new account data
        await loadAccountData(userId);

        // 2. Update registry
        const updatedRegistry: AccountRegistry = {
          ...registry,
          activeAccountId: userId,
        };
        await saveAccountRegistry(updatedRegistry);
        setRegistry(updatedRegistry);
      } catch (error) {
        console.error('Account switch failed:', error);
        throw error;
      } finally {
        setIsSwitching(false);
      }
    },
    [registry, loadAccountData]
  );

  // Add new account
  const addAccount = useCallback(
    async (tokens: AuthTokens, user: GitHubUser) => {
      const newAccount: AccountInfo = {
        userId: user.id,
        login: user.login,
        name: user.name,
        avatarUrl: user.avatar_url,
        addedAt: new Date().toISOString(),
      };

      // Check if account already exists
      const existingAccount = registry?.accounts.find((a) => a.userId === user.id);
      if (existingAccount) {
        // Account already exists, just switch to it and update tokens
        console.log('Account already exists, switching to it:', user.login);
        await saveAccountTokens(user.id, tokens);
        await switchAccount(user.id);

        // Don't throw error, just notify via console
        // The UI will update to show the account is already added
        return;
      }

      // Save tokens
      await saveAccountTokens(user.id, tokens);

      // Initialize feed preferences with empty arrays
      await saveAccountFeedUsers(user.id, []);
      await saveAccountFeedRepos(user.id, []);

      // Update registry
      const updatedRegistry: AccountRegistry = {
        accounts: [...(registry?.accounts || []), newAccount],
        activeAccountId: user.id,
      };

      await saveAccountRegistry(updatedRegistry);
      setRegistry(updatedRegistry);

      // Load new account data
      await loadAccountData(user.id);
    },
    [registry, loadAccountData, switchAccount]
  );

  // Remove account
  const removeAccount = useCallback(
    async (userId: number) => {
      if (!registry) return;

      // Delete account data
      await deleteAccountData(userId);

      // Update registry
      const updatedAccounts = registry.accounts.filter((a) => a.userId !== userId);

      // Determine new active account
      const newActiveId =
        registry.activeAccountId === userId
          ? updatedAccounts[0]?.userId || null
          : registry.activeAccountId;

      const updatedRegistry: AccountRegistry = {
        accounts: updatedAccounts,
        activeAccountId: newActiveId,
      };

      await saveAccountRegistry(updatedRegistry);
      setRegistry(updatedRegistry);

      // Load new active account if changed
      if (newActiveId && newActiveId !== registry.activeAccountId) {
        await loadAccountData(newActiveId);
      } else if (!newActiveId) {
        // No accounts left
        setCurrentTokens(null);
        setCurrentFeedPreferences(null);
      }
    },
    [registry, loadAccountData]
  );

  const value = useMemo<MultiAccountContextValue>(
    () => ({
      accounts: registry?.accounts || [],
      activeAccount: registry?.accounts.find((a) => a.userId === registry.activeAccountId) || null,
      activeAccountId: registry?.activeAccountId || null,
      isLoading,
      isSwitching,
      switchAccount,
      addAccount,
      removeAccount,
      currentTokens,
      currentFeedPreferences,
    }),
    [
      registry,
      isLoading,
      isSwitching,
      switchAccount,
      addAccount,
      removeAccount,
      currentTokens,
      currentFeedPreferences,
    ]
  );

  return <MultiAccountContext.Provider value={value}>{children}</MultiAccountContext.Provider>;
}

export function useMultiAccount(): MultiAccountContextValue {
  const context = useContext(MultiAccountContext);
  if (!context) {
    throw new Error('useMultiAccount must be used within a MultiAccountProvider');
  }
  return context;
}
