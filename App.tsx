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
        initialUsers={currentFeedPreferences?.followedUsers || []}
        initialRepos={currentFeedPreferences?.followedRepos || []}
        onUsersChange={async (users) => {
          if (activeAccount) {
            await saveAccountFeedUsers(activeAccount.userId, users);
          }
        }}
        onReposChange={async (repos) => {
          if (activeAccount) {
            await saveAccountFeedRepos(activeAccount.userId, repos);
          }
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
