import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React from 'react';
import { View } from 'react-native';
import { ActivityFeedScreen } from './ActivityFeedScreen';
import type { RepoActivitySummary, ActivityCommit } from '../types/activity';

// Create commits at specific hours for testing grouping
const createCommitAtHour = (
  index: number,
  hoursAgo: number,
  repoOwner: string,
  repoName: string,
  overrides?: Partial<ActivityCommit>
): ActivityCommit => {
  const date = new Date();
  date.setHours(date.getHours() - hoursAgo);
  date.setMinutes(Math.floor(Math.random() * 60));

  return {
    repoOwner,
    repoName,
    sha: `sha${index}${hoursAgo}${repoOwner}${repoName}`.slice(0, 40),
    message: `feat: implement feature ${index + 1} for ${repoName}`,
    author: 'developer',
    authorLogin: 'developer',
    authorEmail: 'dev@example.com',
    authorAvatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4',
    date: date.toISOString(),
    additions: Math.floor(Math.random() * 100) + 10,
    deletions: Math.floor(Math.random() * 50),
    ...overrides,
  };
};

// Create summaries that span multiple hours
const createTestSummaries = (): RepoActivitySummary[] => {
  const repos = [
    { owner: 'anthropics', repo: 'claude-code', description: 'Claude Code CLI' },
    { owner: 'facebook', repo: 'react', description: 'A JavaScript library for building UIs' },
    { owner: 'vercel', repo: 'next.js', description: 'The React Framework' },
  ];

  return repos.map(({ owner, repo, description }) => {
    // Create commits spread across multiple hours
    const commits = [
      createCommitAtHour(0, 0, owner, repo), // Current hour
      createCommitAtHour(1, 0, owner, repo), // Current hour
      createCommitAtHour(2, 1, owner, repo), // 1 hour ago
      createCommitAtHour(3, 2, owner, repo), // 2 hours ago
      createCommitAtHour(4, 3, owner, repo), // 3 hours ago
    ];

    return {
      owner,
      repo,
      fullName: `${owner}/${repo}`,
      commits,
      latestCommitAt: new Date(commits[0]!.date),
      commitCount: commits.length,
      description,
    };
  });
};

const MobileFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View
    style={{
      width: 375,
      height: 812,
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 8,
      overflow: 'hidden',
    }}
  >
    {children}
  </View>
);

const meta: Meta<typeof ActivityFeedScreen> = {
  title: 'Screens/ActivityFeedScreen',
  component: ActivityFeedScreen,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ActivityFeedScreen>;

export const Default: Story = {
  render: () => (
    <MobileFrame>
      <ActivityFeedScreen summaries={createTestSummaries()} />
    </MobileFrame>
  ),
};

export const Loading: Story = {
  render: () => (
    <MobileFrame>
      <ActivityFeedScreen summaries={[]} loading={true} />
    </MobileFrame>
  ),
};

export const Error: Story = {
  render: () => (
    <MobileFrame>
      <ActivityFeedScreen
        summaries={[]}
        error="Failed to load activity. Please check your connection."
      />
    </MobileFrame>
  ),
};

export const Empty: Story = {
  render: () => (
    <MobileFrame>
      <ActivityFeedScreen summaries={[]} />
    </MobileFrame>
  ),
};

export const SingleRepo: Story = {
  render: () => {
    const commits = [
      createCommitAtHour(0, 0, 'anthropics', 'claude-code'),
      createCommitAtHour(1, 0, 'anthropics', 'claude-code'),
      createCommitAtHour(2, 1, 'anthropics', 'claude-code'),
    ];

    return (
      <MobileFrame>
        <ActivityFeedScreen
          summaries={[
            {
              owner: 'anthropics',
              repo: 'claude-code',
              fullName: 'anthropics/claude-code',
              commits,
              latestCommitAt: new Date(commits[0]!.date),
              commitCount: commits.length,
              description: 'Claude Code CLI',
            },
          ]}
        />
      </MobileFrame>
    );
  },
};

export const ManyCards: Story = {
  render: () => {
    // Create many commits across many hours
    const repos = [
      'anthropics/claude-code',
      'facebook/react',
      'vercel/next.js',
      'microsoft/vscode',
      'golang/go',
    ];

    const summaries: RepoActivitySummary[] = repos.map((fullName) => {
      const [owner, repo] = fullName.split('/') as [string, string];
      const commits: ActivityCommit[] = [];

      // Create commits for hours 0-8
      for (let hour = 0; hour < 8; hour++) {
        const numCommits = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < numCommits; i++) {
          commits.push(createCommitAtHour(commits.length, hour, owner, repo));
        }
      }

      return {
        owner,
        repo,
        fullName,
        commits,
        latestCommitAt: new Date(commits[0]!.date),
        commitCount: commits.length,
      };
    });

    return (
      <MobileFrame>
        <ActivityFeedScreen summaries={summaries} />
      </MobileFrame>
    );
  },
};
