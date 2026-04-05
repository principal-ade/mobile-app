import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SwipeCard } from '../components/ActivityFeed/SwipeCard';
import type { RepoActivitySummary, ActivityCommit } from '../types/activity';

// Mock commit data generator
const createMockCommit = (
  index: number,
  hoursAgo: number,
  repoOwner: string,
  repoName: string,
  author: { name: string; avatar: string }
): ActivityCommit => {
  const date = new Date();
  date.setHours(date.getHours() - hoursAgo);
  date.setMinutes(Math.floor(Math.random() * 60));

  return {
    repoOwner,
    repoName,
    sha: `sha${index}${hoursAgo}${repoOwner}`.slice(0, 40).padEnd(40, '0'),
    message: `feat: implement feature ${index + 1} with improvements and bug fixes`,
    author: author.name,
    authorLogin: author.name,
    authorEmail: `${author.name}@example.com`,
    authorAvatarUrl: author.avatar,
    date: date.toISOString(),
    additions: Math.floor(Math.random() * 100) + 10,
    deletions: Math.floor(Math.random() * 50),
  };
};

const authors = [
  { name: 'octocat', avatar: 'https://avatars.githubusercontent.com/u/583231?v=4' },
  { name: 'torvalds', avatar: 'https://avatars.githubusercontent.com/u/1024025?v=4' },
  { name: 'defunkt', avatar: 'https://avatars.githubusercontent.com/u/2?v=4' },
];

const createMockCards = (): RepoActivitySummary[] => {
  const repos = [
    { owner: 'anthropics', repo: 'claude-code' },
    { owner: 'facebook', repo: 'react' },
    { owner: 'vercel', repo: 'next.js' },
    { owner: 'microsoft', repo: 'typescript' },
    { owner: 'golang', repo: 'go' },
  ];

  return repos.map(({ owner, repo }, repoIndex) => {
    const numCommits = Math.floor(Math.random() * 4) + 1;
    const commits = Array.from({ length: numCommits }, (_, i) =>
      createMockCommit(i, repoIndex, owner, repo, authors[i % authors.length]!)
    );

    return {
      owner,
      repo,
      fullName: `${owner}/${repo}`,
      commits,
      latestCommitAt: new Date(commits[0]!.date),
      commitCount: commits.length,
    };
  });
};

const DEFAULT_HEIGHT = 812;

const MobileFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SafeAreaProvider>
    <View style={styles.frame}>
      {children}
    </View>
  </SafeAreaProvider>
);

// Mock SwipeFeedScreen for Storybook (doesn't use real API)
const MockSwipeFeedScreen: React.FC = () => {
  const [cards] = useState(createMockCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  const currentCard = cards[currentIndex];
  const nextCard = cards[currentIndex + 1];

  const handleSwipeLeft = () => {
    setLastAction('Marked as seen');
    setCurrentIndex((prev) => prev + 1);
    setCanUndo(true);
  };

  const handleSwipeRight = () => {
    setLastAction('Saved!');
    setCurrentIndex((prev) => prev + 1);
    setCanUndo(true);
  };

  const handlePress = () => {
    setLastAction('Tapped - would open detail view');
  };

  const handleSwipeDown = () => {
    if (currentIndex > 0 && canUndo) {
      setCurrentIndex((prev) => prev - 1);
      setLastAction('Undid last action (swipe down)');
      setCanUndo(false);
    }
  };

  // Empty state
  if (!currentCard || currentIndex >= cards.length) {
    return (
      <View style={styles.centerContainer}>
        {/* Checkmark icon */}
        <View style={styles.emptyIconContainer}>
          <View style={styles.checkmark} />
        </View>
        <Text style={styles.emptyTitle}>You're all caught up!</Text>
        <Text style={styles.emptySubtitle}>No more activity cards to review.</Text>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => setCurrentIndex(0)}
        >
          <Text style={styles.resetButtonText}>Reset Demo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Drag handle */}
      <View style={styles.dragHandleContainer}>
        <View style={styles.dragHandle} />
      </View>

      {/* Card Stack */}
      <View style={styles.cardContainer}>
        {/* Next card (underneath) */}
        {nextCard && (
          <View style={styles.nextCard}>
            <SwipeCard
              key={nextCard.fullName + (currentIndex + 1)}
              summary={nextCard}
              containerHeight={DEFAULT_HEIGHT}
              swipeDisabled
            />
          </View>
        )}

        {/* Current card (on top) */}
        <View style={styles.currentCard}>
          <SwipeCard
            key={currentCard.fullName + currentIndex}
            summary={currentCard}
            containerHeight={DEFAULT_HEIGHT}
            onPress={handlePress}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onSwipeDown={canUndo ? handleSwipeDown : undefined}
          />
        </View>
      </View>

      {/* Bottom action bar */}
      <View style={styles.actionBar}>
        {/* Swipe hints */}
        <View style={styles.hintRow}>
          <Text style={styles.hintTextLeft}>← ↑ Seen</Text>
          {canUndo ? (
            <Text style={styles.hintTextUndo}>↓ Undo</Text>
          ) : (
            <Text style={styles.hintTextCenter}>Swipe</Text>
          )}
          <Text style={styles.hintTextRight}>Save →</Text>
        </View>
      </View>

      {/* Action feedback */}
      {lastAction && (
        <View style={styles.actionFeedback}>
          <Text style={styles.actionFeedbackText}>{lastAction}</Text>
        </View>
      )}
    </View>
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
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#000',
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 8,
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#444',
  },
  cardContainer: {
    flex: 1,
    position: 'relative',
  },
  nextCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  currentCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  actionBar: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  hintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  hintTextLeft: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  hintTextCenter: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  hintTextRight: {
    color: '#34C759',
    fontSize: 13,
    fontWeight: '600',
  },
  hintTextUndo: {
    color: '#FF9500',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  checkmark: {
    width: 24,
    height: 14,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: '#34C759',
    transform: [{ rotate: '-45deg' }, { translateY: -4 }],
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  resetButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  actionFeedback: {
    position: 'absolute',
    bottom: 160,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  actionFeedbackText: {
    color: '#fff',
    fontSize: 14,
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
      <MockSwipeFeedScreen />
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
