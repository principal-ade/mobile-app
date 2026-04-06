import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { SwipeFeedScreen } from './SwipeFeedScreen';
import type { CommitActivityCard } from '../services/FeedApiService';

// Mock commit data generator
const createMockCards = (): CommitActivityCard[] => {
  const repos = [
    { owner: 'anthropics', repo: 'claude-code' },
    { owner: 'facebook', repo: 'react' },
    { owner: 'vercel', repo: 'next.js' },
    { owner: 'microsoft', repo: 'typescript' },
    { owner: 'golang', repo: 'go' },
  ];

  const authors = [
    { login: 'octocat', avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4' },
    { login: 'torvalds', avatarUrl: 'https://avatars.githubusercontent.com/u/1024025?v=4' },
    { login: 'defunkt', avatarUrl: 'https://avatars.githubusercontent.com/u/2?v=4' },
  ];

  return repos.map(({ owner, repo }, repoIndex) => {
    const numCommits = Math.floor(Math.random() * 3) + 1;
    const now = new Date();
    const hour = now.getUTCHours();

    const commits = Array.from({ length: numCommits }, (_, i) => {
      const date = new Date(now);
      date.setHours(date.getHours() - repoIndex);
      date.setMinutes(i * 15);

      return {
        sha: `sha${repoIndex}${i}`.padEnd(40, '0'),
        message: `feat: implement feature ${i + 1} with improvements`,
        author: authors[i % authors.length]!,
        committedAt: date.toISOString(),
        url: `https://github.com/${owner}/${repo}/commit/sha${repoIndex}${i}`,
      };
    });

    return {
      itemId: `${now.toISOString().slice(0, 10)}:${hour}:${owner}/${repo}`,
      repo: { owner, name: repo },
      hour,
      hourBucket: now.toISOString(),
      commits,
      commitCount: commits.length,
      latestCommitAt: commits[0]!.committedAt,
    };
  });
};

const DEFAULT_HEIGHT = 812;

const MobileFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SafeAreaProvider>
    <NavigationContainer>
      <View style={styles.frame}>
        {children}
      </View>
    </NavigationContainer>
  </SafeAreaProvider>
);

// Wrapper with refresh capability
const SwipeFeedStory: React.FC = () => {
  const [cards, setCards] = useState(createMockCards);
  const [key, setKey] = useState(0);

  const handleRefresh = useCallback(async () => {
    setCards(createMockCards());
    setKey((k) => k + 1);
  }, []);

  return (
    <SwipeFeedScreen
      key={key}
      initialCards={cards}
      isGuest
      onRefresh={handleRefresh}
    />
  );
};

const LoadingState: React.FC = () => (
  <View style={styles.centerContainer}>
    <Text style={styles.loadingText}>Loading your feed...</Text>
  </View>
);

const ErrorState: React.FC = () => (
  <View style={styles.centerContainer}>
    <Text style={styles.errorText}>Failed to load feed</Text>
    <TouchableOpacity style={styles.retryButton}>
      <Text style={styles.retryText}>Try Again</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  frame: {
    width: 375,
    height: DEFAULT_HEIGHT,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  retryText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

const meta: Meta = {
  title: 'Screens/SwipeFeedScreen',
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <MobileFrame>
      <SwipeFeedStory />
    </MobileFrame>
  ),
};

export const Loading: Story = {
  render: () => (
    <MobileFrame>
      <LoadingState />
    </MobileFrame>
  ),
};

export const Error: Story = {
  render: () => (
    <MobileFrame>
      <ErrorState />
    </MobileFrame>
  ),
};
