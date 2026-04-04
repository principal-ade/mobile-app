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
  clearPendingAuth,
  AuthTokens,
} from '../utils/authStorage';
import { startAuthFlow, demoLogin, AuthResult, EmailVerificationRequiredError } from '../services/AuthService';

interface AuthState {
  isAuthenticated: boolean;
  tokens: AuthTokens | null;
  user: GitHubUser | null;
  pendingVerification: {
    email: string;
    state: string;
  } | null;
}

interface AuthContextValue extends AuthState {
  isLoading: boolean;
  token: string | null; // Convenience accessor for GitHub token
  signIn: () => Promise<void>;
  demoSignIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeVerification: (result: AuthResult) => void;
  cancelVerification: () => void;
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
    pendingVerification: null,
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
          pendingVerification: null,
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
        pendingVerification: null,
      });
    } catch (error) {
      // Check if email verification is required
      if (error instanceof EmailVerificationRequiredError) {
        setState(prev => ({
          ...prev,
          pendingVerification: {
            email: error.email,
            state: error.state,
          },
        }));
        return;
      }

      console.error('Sign in failed:', error);
      Alert.alert(
        'Sign In Failed',
        error instanceof Error ? error.message : 'Unable to sign in. Please try again.',
      );
    }
  }, []);

  const demoSignIn = useCallback(async (email: string, password: string) => {
    try {
      const result = await demoLogin(email, password);
      setState({
        isAuthenticated: true,
        tokens: result.tokens,
        user: result.user,
        pendingVerification: null,
      });
    } catch (error) {
      console.error('Demo sign in failed:', error);
      Alert.alert(
        'Sign In Failed',
        error instanceof Error ? error.message : 'Unable to sign in. Please try again.',
      );
    }
  }, []);

  const signOut = useCallback(async () => {
    await deleteTokens();
    await clearPendingAuth();
    setState({
      isAuthenticated: false,
      tokens: null,
      user: null,
      pendingVerification: null,
    });
  }, []);

  const completeVerification = useCallback((result: AuthResult) => {
    setState({
      isAuthenticated: true,
      tokens: result.tokens,
      user: result.user,
      pendingVerification: null,
    });
  }, []);

  const cancelVerification = useCallback(async () => {
    await clearPendingAuth();
    setState(prev => ({
      ...prev,
      pendingVerification: null,
    }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isLoading,
      token: state.tokens?.githubAccessToken ?? null,
      signIn,
      demoSignIn,
      signOut,
      completeVerification,
      cancelVerification,
    }),
    [cancelVerification, completeVerification, demoSignIn, isLoading, signIn, signOut, state],
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
