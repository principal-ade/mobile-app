/**
 * The logged-out landing screen. Shown by `AppNavigator` whenever there's
 * no authenticated account — the app is now built around the signed-in
 * experience, so unauthenticated users land here instead of browsing a
 * guest feed.
 *
 * Two jobs: get the user signed in (GitHub OAuth, or the email/demo path),
 * and offer a no-account-needed "Learn about trails" detour that renders a
 * real sample trail. Auth state flips drive navigation — on a successful
 * sign-in `isAuthenticated` becomes true and the navigator swaps this stack
 * out for the main tabs automatically, so there's no manual navigation here.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useTheme } from '@principal-ade/industry-theme';

import { FileCityLogo } from '../../components/FileCityLogo';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';
import type { RootStackParamList } from '../../navigation/types';

export function WelcomeScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { signIn, demoSignIn } = useAuth();

  const [showDemoLogin, setShowDemoLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGitHubSignIn = async () => {
    await signIn();
  };

  const handleDemoSignIn = async () => {
    if (!email.trim() || !password.trim()) return;
    setIsLoading(true);
    try {
      await demoSignIn(email.trim(), password);
      setEmail('');
      setPassword('');
      setShowDemoLogin(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <View style={styles.hero}>
        <FileCityLogo
          width={120}
          height={120}
          mark="P"
          aiCard
          primary={theme.colors.primary}
          accent={theme.colors.accent}
        />
        <Text style={[styles.appName, { color: theme.colors.text }]}>
          Principal <Text style={{ color: theme.colors.primary }}>AI</Text>
        </Text>
        <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>
          Walk a codebase as a trail — markers, notes, and sign-offs on the
          paths that matter.
        </Text>
      </View>

      <View style={styles.actions}>
        {showDemoLogin ? (
          <View style={styles.demoLogin}>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.backgroundSecondary,
                },
              ]}
              placeholder="Email"
              placeholderTextColor={theme.colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!isLoading}
            />
            <TextInput
              style={[
                styles.textInput,
                {
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.backgroundSecondary,
                },
              ]}
              placeholder="Password"
              placeholderTextColor={theme.colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  backgroundColor: theme.colors.primary,
                  opacity:
                    isLoading || !email.trim() || !password.trim() ? 0.5 : 1,
                },
              ]}
              onPress={handleDemoSignIn}
              disabled={isLoading || !email.trim() || !password.trim()}
            >
              {isLoading ? (
                <LoadingSpinner size="small" color={theme.colors.background} />
              ) : (
                <Text
                  style={[
                    styles.primaryButtonText,
                    { color: theme.colors.background },
                  ]}
                >
                  Sign In
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => {
                setShowDemoLogin(false);
                setEmail('');
                setPassword('');
              }}
              disabled={isLoading}
            >
              <Text
                style={[styles.linkText, { color: theme.colors.textSecondary }]}
              >
                Back
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={handleGitHubSignIn}
            >
              <Text
                style={[
                  styles.primaryButtonText,
                  { color: theme.colors.background },
                ]}
              >
                Sign in with GitHub
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => setShowDemoLogin(true)}
            >
              <Text style={[styles.linkText, { color: theme.colors.text }]}>
                Sign in with Email
              </Text>
            </TouchableOpacity>
          </>
        )}

        <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('LearnTrails')}
        >
          <Text style={[styles.learnText, { color: theme.colors.primary }]}>
            New here? Learn about trails ›
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  appName: {
    fontSize: 30,
    fontWeight: '700',
  },
  tagline: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  actions: {
    gap: 8,
  },
  primaryButton: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  linkButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    fontSize: 16,
    fontWeight: '500',
  },
  learnText: {
    fontSize: 16,
    fontWeight: '500',
  },
  demoLogin: {
    gap: 12,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
});
