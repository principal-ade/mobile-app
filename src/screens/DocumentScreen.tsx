import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '@principal-ade/industry-theme';
import { useAuth } from '../hooks/useAuth';
import { fetchMarkdownFileContent } from '../services/GithubService';

type DocumentScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Document'>;
type DocumentScreenRouteProp = RouteProp<RootStackParamList, 'Document'>;

interface Props {
  navigation: DocumentScreenNavigationProp;
  route: DocumentScreenRouteProp;
}

export default function DocumentScreen({ navigation: _navigation, route }: Props) {
  const { theme } = useTheme();
  const { token } = useAuth();
  const { owner, repo, path, fileName } = route.params;
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!token) {
        setError('Missing authentication token. Please sign in again.');
        setIsLoading(false);
        return;
      }

      try {
        const data = await fetchMarkdownFileContent(token, owner, repo, path);
        if (isMounted) {
          setContent(data);
        }
      } catch (err) {
        console.error('Failed to load markdown content', err);
        if (isMounted) {
          setError('Unable to load document content.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [owner, path, repo, token]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <View style={styles.header}> 
        <Text style={[styles.title, { color: theme.colors.text }]}>{fileName}</Text>
        <Text style={[styles.path, { color: theme.colors.textSecondary }]}>
          {owner}/{repo}/{path}
        </Text>
      </View>
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error ? (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={{ color: theme.colors.text }}>{content}</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  path: {
    fontSize: 13,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
});
