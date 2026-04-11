import './src/utils/localStorage'; // Polyfill localStorage for React Native
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@principal-ade/industry-theme';
import { iceTangerineDarkTheme } from './src/themes/iceTangerineDark';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { FeedPreferencesProvider } from './src/context/FeedPreferencesContext';
import { MultiAccountProvider, useMultiAccount } from './src/context/MultiAccountContext';
import { saveAccountFeedUsers, saveAccountFeedRepos } from './src/utils/accountStorage';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import type { PropsWithChildren } from 'react';
import type { GitHubUser } from './src/types/github';
import type { WatchedUser, WatchedRepo } from './src/utils/feedStorage';
import { watchUser, unwatchUser, watchRepo, unwatchRepo } from './src/services/FeedApiService';
import { useRef, useEffect } from 'react';

/**
 * Bridge component that connects MultiAccountContext to AuthContext and FeedPreferencesContext
 * Provides account-specific data to child contexts
 */
function MultiAccountAwareProviders({ children }: PropsWithChildren) {
  const {
    activeAccount,
    currentTokens,
    currentFeedPreferences,
    addAccount,
    removeAccount,
  } = useMultiAccount();

  // Track previous state to detect changes for server sync
  const prevUsersRef = useRef<WatchedUser[]>([]);
  const prevReposRef = useRef<WatchedRepo[]>([]);

  // Initialize previous state when feed preferences load
  useEffect(() => {
    if (currentFeedPreferences) {
      prevUsersRef.current = currentFeedPreferences.followedUsers || [];
      prevReposRef.current = currentFeedPreferences.followedRepos || [];
    }
  }, [currentFeedPreferences]);

  // Convert AccountInfo to GitHubUser format
  const user: GitHubUser | null = activeAccount
    ? {
        id: activeAccount.userId,
        login: activeAccount.login,
        name: activeAccount.name,
        avatar_url: activeAccount.avatarUrl,
        html_url: `https://github.com/${activeAccount.login}`,
      }
    : null;

  return (
    <AuthProvider
      initialTokens={currentTokens}
      initialUser={user}
      onSignIn={addAccount}
      onSignOut={async () => {
        if (activeAccount) {
          await removeAccount(activeAccount.userId);
        }
      }}
    >
      <FeedPreferencesProvider
        initialUsers={currentFeedPreferences?.followedUsers}
        initialRepos={currentFeedPreferences?.followedRepos}
        onUsersChange={async (users) => {
          if (!activeAccount) return;

          // Save to local storage
          await saveAccountFeedUsers(activeAccount.userId, users);

          // Sync with server if we have a token
          if (currentTokens?.githubAccessToken) {
            const token = currentTokens.githubAccessToken;
            const prevUsers = prevUsersRef.current;

            // Find additions (in new but not in old)
            const prevLogins = new Set(prevUsers.map(u => u.login.toLowerCase()));
            const newUsers = users.filter(u => !prevLogins.has(u.login.toLowerCase()));

            // Find removals (in old but not in new)
            const currentLogins = new Set(users.map(u => u.login.toLowerCase()));
            const removedUsers = prevUsers.filter(u => !currentLogins.has(u.login.toLowerCase()));

            // Sync additions with server
            for (const user of newUsers) {
              try {
                await watchUser(token, user.login);
              } catch (error) {
                console.error(`Failed to watch user ${user.login}:`, error);
                // Continue with other operations even if one fails
              }
            }

            // Sync removals with server
            for (const user of removedUsers) {
              try {
                await unwatchUser(token, user.login);
              } catch (error) {
                console.error(`Failed to unwatch user ${user.login}:`, error);
                // Continue with other operations even if one fails
              }
            }
          }

          // Update previous state
          prevUsersRef.current = users;
        }}
        onReposChange={async (repos) => {
          if (!activeAccount) return;

          // Save to local storage
          await saveAccountFeedRepos(activeAccount.userId, repos);

          // Sync with server if we have a token
          if (currentTokens?.githubAccessToken) {
            const token = currentTokens.githubAccessToken;
            const prevRepos = prevReposRef.current;

            // Find additions (in new but not in old)
            const prevRepoIds = new Set(
              prevRepos.map(r => `${r.owner.toLowerCase()}/${r.repo.toLowerCase()}`)
            );
            const newRepos = repos.filter(
              r => !prevRepoIds.has(`${r.owner.toLowerCase()}/${r.repo.toLowerCase()}`)
            );

            // Find removals (in old but not in new)
            const currentRepoIds = new Set(
              repos.map(r => `${r.owner.toLowerCase()}/${r.repo.toLowerCase()}`)
            );
            const removedRepos = prevRepos.filter(
              r => !currentRepoIds.has(`${r.owner.toLowerCase()}/${r.repo.toLowerCase()}`)
            );

            // Sync additions with server
            for (const repo of newRepos) {
              try {
                await watchRepo(token, repo.owner, repo.repo);
              } catch (error) {
                console.error(`Failed to watch repo ${repo.owner}/${repo.repo}:`, error);
                // Continue with other operations even if one fails
              }
            }

            // Sync removals with server
            for (const repo of removedRepos) {
              try {
                await unwatchRepo(token, repo.owner, repo.repo);
              } catch (error) {
                console.error(`Failed to unwatch repo ${repo.owner}/${repo.repo}:`, error);
                // Continue with other operations even if one fails
              }
            }
          }

          // Update previous state
          prevReposRef.current = repos;
        }}
      >
        {children}
      </FeedPreferencesProvider>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={iceTangerineDarkTheme}>
        <MultiAccountProvider>
          <MultiAccountAwareProviders>
            <AppNavigator />
          </MultiAccountAwareProviders>
        </MultiAccountProvider>
        <StatusBar style="light" />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
