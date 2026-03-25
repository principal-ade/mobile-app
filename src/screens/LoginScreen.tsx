import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Button, Alert, ActivityIndicator } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '@principal-ade/industry-theme';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, useAuthRequest, exchangeCodeAsync } from 'expo-auth-session';
import { useAuth } from '../hooks/useAuth';
import { githubConfig, isGitHubConfigValid } from '../utils/config';
import { exchangeGitHubCodeForToken } from '../context/AuthContext';
import { GitHubAuthResponse } from '../types/auth';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
};

export default function LoginScreen({ navigation: _navigation }: Props) {
  const { theme } = useTheme();
  const { signInWithToken } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const redirectUri = useMemo(
    () =>
      makeRedirectUri({
        path: 'auth/callback',
      }),
    [],
  );

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: githubConfig.clientId,
      scopes: githubConfig.scopes,
      redirectUri,
      usePKCE: true,
      codeChallengeMethod: 'S256',
    },
    discovery,
  );

  const handleExchange = useCallback(
    async (code: string) => {
      try {
        setIsAuthenticating(true);
        const { token, user } = await exchangeGitHubCodeForToken(async () => {
          const tokenResponse = await exchangeCodeAsync(
            {
              clientId: githubConfig.clientId,
              redirectUri,
              code,
              // PKCE: code_verifier is automatically included by expo-auth-session
            },
            discovery,
          );

          const normalized: GitHubAuthResponse = {
            access_token: tokenResponse.accessToken ?? tokenResponse.access_token ?? '',
            scope: tokenResponse.scope ?? '',
            token_type: tokenResponse.tokenType ?? tokenResponse.token_type ?? 'bearer',
          };
          return normalized;
        });

        await signInWithToken(token, user);
      } catch (error) {
        console.error('GitHub authentication failed', error);
        Alert.alert(
          'Authentication Error',
          'We were unable to complete the GitHub sign in. Please try again.',
        );
      } finally {
        setIsAuthenticating(false);
      }
    },
    [discovery, redirectUri, signInWithToken],
  );

  useEffect(() => {
    if (!response) {
      return;
    }

    if (response.type === 'success' && response.params?.code) {
      handleExchange(response.params.code).catch(() => {
        setIsAuthenticating(false);
      });
      return;
    }

    if (response.type === 'error') {
      Alert.alert('Authentication Error', 'GitHub sign in was unsuccessful.');
    }

    setIsAuthenticating(false);
  }, [handleExchange, response]);

  const handleLogin = useCallback(async () => {
    if (!isGitHubConfigValid()) {
      Alert.alert(
        'Configuration Required',
        'GitHub OAuth client ID is missing. Update app.json with your client ID.',
      );
      return;
    }

    if (!request) {
      Alert.alert(
        'Authentication Unavailable',
        'We could not create an authentication request. Please try again later.',
      );
      return;
    }

    try {
      setIsAuthenticating(true);
      const result = await promptAsync({ useProxy: true });
      if (result.type !== 'success') {
        setIsAuthenticating(false);
      }
    } catch (error) {
      console.error('Failed to initiate GitHub OAuth', error);
      setIsAuthenticating(false);
      Alert.alert('Authentication Error', 'Unable to open the GitHub sign in page.');
    }
  }, [promptAsync, request]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <Text style={[styles.title, { color: theme.colors.text }]}>GitHub Markdown Reader</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}> 
        Sign in with GitHub to get started
      </Text>
      <View style={styles.buttonWrapper}>
        <Button title="Sign in with GitHub" onPress={handleLogin} disabled={isAuthenticating} />
      </View>
      {isAuthenticating ? (
        <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loading} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
  },
  buttonWrapper: {
    width: '100%',
    maxWidth: 260,
  },
  loading: {
    marginTop: 20,
  },
});
