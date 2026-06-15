import './src/utils/localStorage'; // Polyfill localStorage for React Native
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, iceTangerineDarkTheme } from '@principal-ade/industry-theme';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { CollectionsProvider } from './src/context/CollectionsContext';
import { RecentTrailsViewProvider } from './src/context/RecentTrailsViewContext';
import { MultiAccountProvider, useMultiAccount } from './src/context/MultiAccountContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import type { PropsWithChildren } from 'react';
import type { GitHubUser } from './src/types/github';

/**
 * Bridge component that connects MultiAccountContext to AuthContext.
 * Provides account-specific data to child contexts.
 */
function MultiAccountAwareProviders({ children }: PropsWithChildren) {
  const {
    activeAccount,
    currentTokens,
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
      <CollectionsProvider>
        <RecentTrailsViewProvider>
          {children}
        </RecentTrailsViewProvider>
      </CollectionsProvider>
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
