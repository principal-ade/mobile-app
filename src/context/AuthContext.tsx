import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Alert } from 'react-native';

import { GitHubUser } from '../types/github';
import {
  getTokens,
  deleteTokens,
  AuthTokens,
} from '../utils/authStorage';
import { startAuthFlow } from '../services/AuthService';

interface AuthState {
  isAuthenticated: boolean;
  tokens: AuthTokens | null;
  user: GitHubUser | null;
}

interface AuthContextValue extends AuthState {
  isLoading: boolean;
  token: string | null; // Convenience accessor for GitHub token
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/json',
      Authorization: `token ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch GitHub user');
  }

  return (await response.json()) as GitHubUser;
}

export function AuthProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    tokens: null,
    user: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Bootstrap: restore session from stored tokens
  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const storedTokens = await getTokens();
        if (!storedTokens) {
          return;
        }

        // Validate token by fetching user
        const user = await fetchGitHubUser(storedTokens.githubAccessToken);
        if (!isMounted) {
          return;
        }

        setState({
          isAuthenticated: true,
          tokens: storedTokens,
          user,
        });
      } catch (error) {
        console.error('Failed to restore authentication state', error);
        await deleteTokens();
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

  const signIn = useCallback(async () => {
    try {
      // startAuthFlow opens browser, waits for completion, returns tokens
      const result = await startAuthFlow();
      setState({
        isAuthenticated: true,
        tokens: result.tokens,
        user: result.user,
      });
    } catch (error) {
      console.error('Sign in failed:', error);
      Alert.alert(
        'Sign In Failed',
        error instanceof Error ? error.message : 'Unable to sign in. Please try again.',
      );
    }
  }, []);

  const signOut = useCallback(async () => {
    await deleteTokens();
    setState({
      isAuthenticated: false,
      tokens: null,
      user: null,
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isLoading,
      token: state.tokens?.githubAccessToken ?? null,
      signIn,
      signOut,
    }),
    [isLoading, signIn, signOut, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
}
