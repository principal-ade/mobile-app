import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';
import { useAuthContext } from '../context/AuthContext';
import { fetchRepoReadme } from '../services/GithubService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LucideIcon } from '../components/LucideIcon';

interface Props {
  route: {
    params: {
      owner: string;
      name: string;
      fullName: string;
    };
  };
}

export default function RepoReadmeScreen({ route }: Props) {
  const { owner, name, fullName } = route.params;
  const { theme } = useTheme();
  const { token } = useAuthContext();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [readme, setReadme] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadReadme = async () => {
      if (!token) {
        setError('Authentication required');
        setIsLoading(false);
        return;
      }

      try {
        const content = await fetchRepoReadme(token, owner, name);
        if (isMounted) {
          setReadme(content);
        }
      } catch (err) {
        console.error('Failed to load README', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load README');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadReadme();

    return () => {
      isMounted = false;
    };
  }, [owner, name, token]);

  // Detect dark mode - check if background is dark-ish
  const isDark = theme.colors.background === '#000000' ||
                 theme.colors.background === '#000' ||
                 theme.colors.background.toLowerCase().startsWith('#0') ||
                 theme.colors.background.toLowerCase().startsWith('#1');

  // Load GitHub's markdown CSS
  const htmlContent = readme ? `
    <!DOCTYPE html>
    <html data-color-mode="${isDark ? 'dark' : 'light'}" data-dark-theme="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown${isDark ? '-dark' : ''}.min.css">
        <style>
          body {
            margin: 0;
            padding: 16px;
          }
        </style>
      </head>
      <body>
        ${readme}
      </body>
    </html>
  ` : '';

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loaderContainer}>
          <LoadingSpinner size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading README...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
          {error.includes('No README') && (
            <Text style={[styles.errorHint, { color: theme.colors.textSecondary }]}>
              This repository doesn't have a README file.
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surface,
            paddingTop: insets.top,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <LucideIcon name="ChevronLeft" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.repoName, { color: theme.colors.text }]} numberOfLines={1}>
            {fullName}
          </Text>
          <Text style={[styles.readmeLabel, { color: theme.colors.textSecondary }]}>
            README
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* README Content */}
      <WebView
        source={{ html: htmlContent }}
        style={{ flex: 1, backgroundColor: isDark ? '#0d1117' : '#ffffff' }}
        showsVerticalScrollIndicator={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 8,
  },
  headerRight: {
    width: 44,
  },
  repoName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  readmeLabel: {
    fontSize: 13,
    marginTop: 2,
  },
});
