import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { MobileRepoCard } from './MobileRepoCard';
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

const meta: Meta<typeof MobileRepoCard> = {
  title: 'ActivityFeed/MobileRepoCard',
  component: MobileRepoCard,
  decorators: [
    (Story) => (
      <NavigationContainer>
        <Story />
      </NavigationContainer>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof MobileRepoCard>;

export const SingleCommit: Story = {
  render: () => (
    <MobileFrame>
      <MobileRepoCard summary={createMockSummary('octocat', 'hello-world', 1)} containerHeight={DEFAULT_HEIGHT} />
    </MobileFrame>
  ),
};

export const MultipleCommits: Story = {
  render: () => (
    <MobileFrame>
      <MobileRepoCard summary={createMockSummary('octocat', 'hello-world', 5)} containerHeight={DEFAULT_HEIGHT} />
    </MobileFrame>
  ),
};

export const ManyCommits: Story = {
  render: () => (
    <MobileFrame>
      <MobileRepoCard summary={createMockSummary('facebook', 'react', 10)} containerHeight={DEFAULT_HEIGHT} />
    </MobileFrame>
  ),
};

export const LongRepoName: Story = {
  render: () => (
    <MobileFrame>
      <MobileRepoCard
        summary={createMockSummary(
          'organization-with-long-name',
          'super-long-repository-name-that-might-overflow',
          3
        )}
        containerHeight={DEFAULT_HEIGHT}
      />
    </MobileFrame>
  ),
};

export const LongCommitMessages: Story = {
  render: () => {
    const summary = createMockSummary('octocat', 'hello-world', 3);
    summary.commits = summary.commits.map((commit, i) => ({
      ...commit,
      message: `feat(core): implement comprehensive user authentication system with OAuth2, SAML, and OpenID Connect support including multi-factor authentication, session management, and token refresh mechanisms - part ${i + 1}`,
    }));
    return (
      <MobileFrame>
        <MobileRepoCard summary={summary} containerHeight={DEFAULT_HEIGHT} />
      </MobileFrame>
    );
  },
};

export const HighAdditions: Story = {
  render: () => {
    const summary = createMockSummary('octocat', 'new-project', 2);
    summary.commits = summary.commits.map((commit) => ({
      ...commit,
      additions: 500,
      deletions: 10,
    }));
    return (
      <MobileFrame>
        <MobileRepoCard summary={summary} containerHeight={DEFAULT_HEIGHT} />
      </MobileFrame>
    );
  },
};

export const HighDeletions: Story = {
  render: () => {
    const summary = createMockSummary('octocat', 'cleanup-repo', 2);
    summary.commits = summary.commits.map((commit) => ({
      ...commit,
      additions: 10,
      deletions: 300,
    }));
    return (
      <MobileFrame>
        <MobileRepoCard summary={summary} containerHeight={DEFAULT_HEIGHT} />
      </MobileFrame>
    );
  },
};

export const TallerContainer: Story = {
  render: () => (
    <MobileFrame height={900}>
      <MobileRepoCard summary={createMockSummary('github', 'linguist', 5)} containerHeight={900} />
    </MobileFrame>
  ),
};

export const MultipleAuthors: Story = {
  render: () => {
    const summary = createMockSummary('microsoft', 'vscode', 4);
    const authors = [
      { author: 'octocat', avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4' },
      { author: 'torvalds', avatarUrl: 'https://avatars.githubusercontent.com/u/1024025?v=4' },
      { author: 'defunkt', avatarUrl: 'https://avatars.githubusercontent.com/u/2?v=4' },
      { author: 'mojombo', avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4' },
    ];
    summary.commits = summary.commits.map((commit, i) => ({
      ...commit,
      author: authors[i % authors.length]!.author,
      authorAvatarUrl: authors[i % authors.length]!.avatarUrl,
    }));
    return (
      <MobileFrame>
        <MobileRepoCard summary={summary} containerHeight={DEFAULT_HEIGHT} />
      </MobileFrame>
    );
  },
};

export const RealRepo: Story = {
  render: () => (
    <MobileFrame>
      <MobileRepoCard
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
        containerHeight={DEFAULT_HEIGHT}
      />
    </MobileFrame>
  ),
};
