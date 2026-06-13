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
  signIn: (preferEphemeralSession?: boolean) => Promise<void>;
  demoSignIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeVerification: (result: AuthResult) => void;
  cancelVerification: () => void;
  updateTokens: (tokens: AuthTokens) => void;
}

interface AuthProviderProps extends PropsWithChildren {
  initialTokens?: AuthTokens | null;
  initialUser?: GitHubUser | null;
  onSignIn?: (tokens: AuthTokens, user: GitHubUser) => Promise<void>;
  onSignOut?: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
  initialTokens = null,
  initialUser = null,
  onSignIn,
  onSignOut,
}: AuthProviderProps): React.JSX.Element {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: !!initialTokens,
    tokens: initialTokens,
    user: initialUser,
    pendingVerification: null,
  });
  const [isLoading, setIsLoading] = useState(!initialTokens);

  // Sync auth state with MultiAccountContext-provided tokens/user
  useEffect(() => {
    setState({
      isAuthenticated: !!(initialTokens && initialUser),
      tokens: initialTokens,
      user: initialUser,
      pendingVerification: null,
    });
    setIsLoading(false);
  }, [initialTokens, initialUser]);

  const signIn = useCallback(async (preferEphemeralSession = false) => {
    try {
      // startAuthFlow opens browser, waits for completion, returns tokens
      const result = await startAuthFlow(preferEphemeralSession);

      // Notify parent context (MultiAccountContext)
      if (onSignIn) {
        await onSignIn(result.tokens, result.user);
      }

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
  }, [onSignIn]);

  const demoSignIn = useCallback(async (email: string, password: string) => {
    try {
      const result = await demoLogin(email, password);

      // Notify parent context (MultiAccountContext)
      if (onSignIn) {
        await onSignIn(result.tokens, result.user);
      }

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
  }, [onSignIn]);

  const signOut = useCallback(async () => {
    // Notify parent context (MultiAccountContext) to handle account removal
    if (onSignOut) {
      await onSignOut();
    }

    setState({
      isAuthenticated: false,
      tokens: null,
      user: null,
      pendingVerification: null,
    });
  }, [onSignOut]);

  const completeVerification = useCallback((result: AuthResult) => {
    // Notify parent context (MultiAccountContext)
    if (onSignIn) {
      onSignIn(result.tokens, result.user).catch(console.error);
    }

    setState({
      isAuthenticated: true,
      tokens: result.tokens,
      user: result.user,
      pendingVerification: null,
    });
  }, [onSignIn]);

  const updateTokens = useCallback((tokens: AuthTokens) => {
    setState(prev => ({
      ...prev,
      tokens,
      isAuthenticated: true,
    }));
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
      updateTokens,
    }),
    [cancelVerification, completeVerification, demoSignIn, isLoading, signIn, signOut, updateTokens, state],
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

/**
 * Like {@link useAuthContext} but returns `null` instead of throwing when
 * there's no provider. For leaf components (e.g. list rows) that want auth if
 * it's there but must still render in provider-less contexts like Storybook.
 */
export function useOptionalAuthContext(): AuthContextValue | null {
  return useContext(AuthContext) ?? null;
}
