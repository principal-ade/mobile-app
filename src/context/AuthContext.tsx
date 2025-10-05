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

import { AuthState, GitHubAuthResponse } from '../types/auth';
import { GitHubUser } from '../types/github';
import { deleteToken, getToken, saveToken } from '../utils/authStorage';

interface AuthContextValue extends AuthState {
  isLoading: boolean;
  signInWithToken: (token: string, user: GitHubUser) => Promise<void>;
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

function mapGitHubAuthResponse(response: GitHubAuthResponse): string {
  if (response.access_token) {
    return response.access_token;
  }

  const maybeToken = (response as unknown as { accessToken?: string }).accessToken;
  if (maybeToken) {
    return maybeToken;
  }

  throw new Error('GitHub token missing from response');
}

export function AuthProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    token: null,
    user: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const storedToken = await getToken();
        if (!storedToken) {
          return;
        }

        const user = await fetchGitHubUser(storedToken);
        if (!isMounted) {
          return;
        }

        setState({
          isAuthenticated: true,
          token: storedToken,
          user,
        });
      } catch (error) {
        console.error('Failed to restore authentication state', error);
        Alert.alert('Authentication Error', 'Please sign in with GitHub again.');
        await deleteToken();
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

  const signInWithToken = useCallback(async (token: string, user: GitHubUser) => {
    await saveToken(token);
    setState({
      isAuthenticated: true,
      token,
      user,
    });
  }, []);

  const signOut = useCallback(async () => {
    await deleteToken();
    setState({
      isAuthenticated: false,
      token: null,
      user: null,
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isLoading,
      signInWithToken,
      signOut,
    }),
    [isLoading, signInWithToken, signOut, state],
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

export async function exchangeGitHubCodeForToken(
  exchange: () => Promise<GitHubAuthResponse>,
): Promise<{ token: string; user: GitHubUser }> {
  const response = await exchange();
  const token = mapGitHubAuthResponse(response);
  const user = await fetchGitHubUser(token);

  return { token, user };
}
