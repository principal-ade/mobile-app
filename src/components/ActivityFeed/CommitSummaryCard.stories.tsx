import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CommitSummaryCard } from './CommitSummaryCard';
import type { RepoActivitySummary, ActivityCommit } from '../../types/activity';

// Mock commit data generator
const createMockCommit = (
  index: number,
  repoOwner: string,
  repoName: string,
  overrides?: Partial<ActivityCommit>
): ActivityCommit => {
  const date = new Date();
  date.setHours(date.getHours() - index);

  return {
    repoOwner,
    repoName,
    sha: `abc${index}def${index}ghi${index}jkl${index}mno${index}pqr${index}stu${index}`,
    message: `feat: implement feature ${index + 1} with improvements`,
    author: 'octocat',
    authorLogin: 'octocat',
    authorEmail: 'octocat@github.com',
    authorAvatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4',
    date: date.toISOString(),
    additions: Math.floor(Math.random() * 100) + 10,
    deletions: Math.floor(Math.random() * 50),
    ...overrides,
  };
};

// Mock repo summary generator
const createMockSummary = (
  owner: string,
  repo: string,
  commitCount: number,
  overrides?: Partial<RepoActivitySummary>
): RepoActivitySummary => {
  const commits = Array.from({ length: commitCount }, (_, i) =>
    createMockCommit(i, owner, repo)
  );

  return {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    commits,
    latestCommitAt: new Date(commits[0]?.date ?? Date.now()),
    commitCount,
    description: 'A sample repository for testing',
    ...overrides,
  };
};

const DEFAULT_HEIGHT = 667;

// Wrapper to simulate mobile device size with SafeAreaProvider
const MobileFrame: React.FC<{ children: React.ReactNode; height?: number }> = ({
  children,
  height = DEFAULT_HEIGHT,
}) => (
  <SafeAreaProvider>
    <View
      style={{
        width: 375,
        height,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  </SafeAreaProvider>
);

// Interactive wrapper to show swipe feedback
const SwipeDemo: React.FC<{ summary: RepoActivitySummary; swipeDisabled?: boolean }> = ({
  summary,
  swipeDisabled = false,
}) => {
  const [lastAction, setLastAction] = useState<string | null>(null);

  return (
    <View style={styles.demoContainer}>
      <MobileFrame>
        <CommitSummaryCard
          summary={summary}
          containerHeight={DEFAULT_HEIGHT}
          onPress={() => setLastAction('Tapped!')}
          onSwipeLeft={() => setLastAction('Marked as seen (swipe left or up)')}
          onSwipeRight={() => setLastAction('Saved (swipe right)')}
          swipeDisabled={swipeDisabled}
        />
      </MobileFrame>
      {lastAction && (
        <View style={styles.actionBadge}>
          <Text style={styles.actionText}>{lastAction}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  demoContainer: {
    alignItems: 'center',
  },
  actionBadge: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

const meta: Meta<typeof CommitSummaryCard> = {
  title: 'ActivityFeed/CommitSummaryCard',
  component: CommitSummaryCard,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof CommitSummaryCard>;

export const SingleCommit: Story = {
  render: () => <SwipeDemo summary={createMockSummary('octocat', 'hello-world', 1)} />,
};

export const MultipleCommits: Story = {
  render: () => <SwipeDemo summary={createMockSummary('octocat', 'hello-world', 5)} />,
};

export const ManyCommits: Story = {
  render: () => <SwipeDemo summary={createMockSummary('facebook', 'react', 10)} />,
};

export const SwipeDisabled: Story = {
  render: () => (
    <SwipeDemo summary={createMockSummary('octocat', 'hello-world', 3)} swipeDisabled />
  ),
};

export const MultipleAuthors: Story = {
  render: () => {
    const summary = createMockSummary('microsoft', 'vscode', 5);
    const authors = [
      { author: 'octocat', login: 'octocat', avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4' },
      { author: 'torvalds', login: 'torvalds', avatarUrl: 'https://avatars.githubusercontent.com/u/1024025?v=4' },
      { author: 'defunkt', login: 'defunkt', avatarUrl: 'https://avatars.githubusercontent.com/u/2?v=4' },
      { author: 'mojombo', login: 'mojombo', avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4' },
      { author: 'wycats', login: 'wycats', avatarUrl: 'https://avatars.githubusercontent.com/u/4?v=4' },
    ];
    summary.commits = summary.commits.map((commit, i) => ({
      ...commit,
      author: authors[i % authors.length]!.author,
      authorLogin: authors[i % authors.length]!.login,
      authorAvatarUrl: authors[i % authors.length]!.avatarUrl,
    }));
    return <SwipeDemo summary={summary} />;
  },
};

export const LongCommitMessage: Story = {
  render: () => {
    const summary = createMockSummary('octocat', 'hello-world', 2);
    summary.commits[0] = {
      ...summary.commits[0]!,
      message:
        'feat(auth): implement comprehensive user authentication system with OAuth2, SAML, and OpenID Connect support including multi-factor authentication, session management, and automatic token refresh mechanisms for improved security and user experience across all platforms',
    };
    return <SwipeDemo summary={summary} />;
  },
};

export const LongRepoName: Story = {
  render: () => (
    <SwipeDemo
      summary={createMockSummary(
        'organization-with-long-name',
        'super-long-repository-name-that-might-overflow',
        3
      )}
    />
  ),
};

export const RealRepo: Story = {
  render: () => (
    <SwipeDemo
      summary={{
        owner: 'anthropics',
        repo: 'claude-code',
        fullName: 'anthropics/claude-code',
        commits: [
          {
            repoOwner: 'anthropics',
            repoName: 'claude-code',
            sha: 'a1b2c3d4e5f6g7h8i9j0',
            message: 'feat: Add support for multi-turn conversations with context preservation',
            author: 'anthropic-eng',
            authorLogin: 'anthropic-eng',
            authorEmail: 'eng@anthropic.com',
            authorAvatarUrl: 'https://avatars.githubusercontent.com/u/76263028?v=4',
            date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            additions: 156,
            deletions: 23,
          },
          {
            repoOwner: 'anthropics',
            repoName: 'claude-code',
            sha: 'b2c3d4e5f6g7h8i9j0k1',
            message: 'fix: Resolve edge case in file path resolution on Windows',
            author: 'contributor',
            authorLogin: 'contributor',
            authorEmail: 'dev@example.com',
            authorAvatarUrl: 'https://avatars.githubusercontent.com/u/1234567?v=4',
            date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            additions: 12,
            deletions: 8,
          },
        ],
        latestCommitAt: new Date(),
        commitCount: 2,
        description: 'Claude Code CLI tool',
      }}
    />
  ),
};

export const StaticNoSwipe: Story = {
  name: 'Static (No Swipe)',
  render: () => (
    <MobileFrame>
      <CommitSummaryCard
        summary={createMockSummary('octocat', 'hello-world', 3)}
        containerHeight={DEFAULT_HEIGHT}
        swipeDisabled
      />
    </MobileFrame>
  ),
};

// Test that simulates the exact transition from "next card" to "current card"
const TransitionTest: React.FC = () => {
  const [swipeDisabled, setSwipeDisabled] = useState(true);
  const [key, setKey] = useState(0);
  const summary = createMockSummary('octocat', 'hello-world', 3);

  return (
    <View style={styles.demoContainer}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <View
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            backgroundColor: swipeDisabled ? '#FF9500' : '#34C759',
            borderRadius: 6,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>
            {swipeDisabled ? 'Next Card (disabled)' : 'Current Card (active)'}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <View
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            backgroundColor: '#007AFF',
            borderRadius: 6,
          }}
          onTouchEnd={() => setSwipeDisabled((d) => !d)}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>
            Toggle swipeDisabled
          </Text>
        </View>
        <View
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            backgroundColor: '#007AFF',
            borderRadius: 6,
          }}
          onTouchEnd={() => setKey((k) => k + 1)}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Remount</Text>
        </View>
        <View
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            backgroundColor: '#FF3B30',
            borderRadius: 6,
          }}
          onTouchEnd={() => {
            // Simulate exact transition: disabled -> enabled (same instance)
            setSwipeDisabled(false);
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>
            Simulate Transition
          </Text>
        </View>
      </View>

      <MobileFrame>
        <CommitSummaryCard
          key={key}
          summary={summary}
          containerHeight={DEFAULT_HEIGHT}
          swipeDisabled={swipeDisabled}
          skipRemoteContent
          onSwipeLeft={() => console.log('swipe left')}
          onSwipeRight={() => console.log('swipe right')}
        />
      </MobileFrame>

      <Text style={{ marginTop: 12, color: '#666', fontSize: 12 }}>
        Watch the logo when clicking "Simulate Transition" - this mimics{'\n'}
        what happens when the top card is swiped away.
      </Text>
    </View>
  );
};

export const SwipeDisabledTransition: Story = {
  name: 'Disabled → Active Transition',
  render: () => <TransitionTest />,
};

// Test the card stack behavior
const CardStackTest: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const cards = [
    createMockSummary('facebook', 'react', 3),
    createMockSummary('microsoft', 'vscode', 2),
    createMockSummary('google', 'material-design', 4),
  ];

  const visibleCards = cards.slice(currentIndex, currentIndex + 2);

  return (
    <View style={styles.demoContainer}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <View
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            backgroundColor: '#007AFF',
            borderRadius: 6,
          }}
          onTouchEnd={() => setCurrentIndex((i) => Math.min(i + 1, cards.length - 1))}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>
            Next Card (swipe away)
          </Text>
        </View>
        <View
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            backgroundColor: '#FF9500',
            borderRadius: 6,
          }}
          onTouchEnd={() => setCurrentIndex(0)}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Reset</Text>
        </View>
      </View>

      <Text style={{ marginBottom: 8, color: '#666' }}>
        Index: {currentIndex} | Visible: {visibleCards.map((c) => c.repo).join(', ')}
      </Text>

      <MobileFrame>
        <View style={{ flex: 1, position: 'relative' }}>
          {visibleCards.map((card, index) => {
            const isCurrentCard = index === 0;
            return (
              <View
                key={card.fullName}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: visibleCards.length - index,
                }}
              >
                <CommitSummaryCard
                  summary={card}
                  containerHeight={DEFAULT_HEIGHT}
                  swipeDisabled={!isCurrentCard}
                  skipRemoteContent
                />
              </View>
            );
          })}
        </View>
      </MobileFrame>

      <Text style={{ marginTop: 12, color: '#666', fontSize: 12 }}>
        Click "Next Card" to simulate swiping away the top card.{'\n'}
        Watch the logo on the card underneath.
      </Text>
    </View>
  );
};

export const CardStackTransition: Story = {
  render: () => <CardStackTest />,
};
