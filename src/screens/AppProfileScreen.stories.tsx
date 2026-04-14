import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProfileScreen, HourlyActivityGroup } from './AppProfileScreen';

// Generate hourly activity groups for last 24 hours
const generateHourlyActivity = (pattern: 'active' | 'moderate' | 'light'): HourlyActivityGroup[] => {
  const activity: HourlyActivityGroup[] = [];
  const now = new Date();
  const repos = [
    { name: 'awesome-react', owner: 'facebook', avatar: 'https://avatars.githubusercontent.com/u/69631?v=4' },
    { name: 'typescript-utils', owner: 'microsoft', avatar: 'https://avatars.githubusercontent.com/u/6154722?v=4' },
    { name: 'mobile-app', owner: 'vercel', avatar: 'https://avatars.githubusercontent.com/u/14985020?v=4' },
  ];

  const hoursToGenerate = pattern === 'active' ? 12 : pattern === 'moderate' ? 8 : 4;

  for (let i = 0; i < hoursToGenerate; i++) {
    const hoursAgo = i * 2;
    if (hoursAgo >= 24) break;

    const hourDate = new Date(now);
    hourDate.setHours(hourDate.getHours() - hoursAgo, 0, 0, 0);
    const hour = hourDate.getHours();
    const repoData = repos[Math.floor(Math.random() * repos.length)];

    const commitCount = pattern === 'active'
      ? Math.floor(Math.random() * 15) + 5
      : pattern === 'moderate'
      ? Math.floor(Math.random() * 8) + 2
      : Math.floor(Math.random() * 3) + 1;

    const dateStr = hourDate.toISOString().split('T')[0];
    const hourStr = hour.toString().padStart(2, '0');

    activity.push({
      id: `${dateStr}:${hourStr}:${repoData.name}`,
      repo: `${repoData.owner}/${repoData.name}`,
      repoOwner: repoData.owner,
      repoOwnerAvatar: repoData.avatar,
      hour,
      hourBucket: hourDate.toISOString(),
      hoursAgo,
      commitCount,
    });
  }

  return activity;
};

const MobileFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SafeAreaProvider
    initialMetrics={{
      frame: { x: 0, y: 0, width: 375, height: 812 },
      insets: { top: 44, left: 0, right: 0, bottom: 34 },
    }}
  >
    <View style={{ flex: 1 }}>
      {children}
    </View>
  </SafeAreaProvider>
);

const meta: Meta<typeof AppProfileScreen> = {
  title: 'Screens/AppProfileScreen',
  component: AppProfileScreen,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    name: { control: 'text' },
    login: { control: 'text' },
    description: { control: 'text' },
    externalUrl: { control: 'text' },
    onClose: { action: 'close pressed' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const DependabotApp: Story = {
  render: () => (
    <MobileFrame>
      <AppProfileScreen
        avatarUrl="https://avatars.githubusercontent.com/in/29110?v=4"
        name="Dependabot"
        login="dependabot"
        description="Automated dependency updates built into GitHub. Keep your dependencies secure and up-to-date."
        externalUrl="https://github.com/dependabot"
        createdAt="2019-05-23T08:00:00Z"
        recentActivity={generateHourlyActivity('moderate')}
      />
    </MobileFrame>
  ),
};

export const OpenCodeAgent: Story = {
  render: () => (
    <MobileFrame>
      <AppProfileScreen
        avatarUrl="https://avatars.githubusercontent.com/u/144584325?v=4"
        name="OpenCode Agent"
        login="opencode-agent"
        description="AI-powered code review and development assistant. Helps teams write better code faster."
        externalUrl="https://opencode.ai"
        createdAt="2023-09-15T10:30:00Z"
        recentActivity={generateHourlyActivity('active')}
      />
    </MobileFrame>
  ),
};

export const GitHubActions: Story = {
  render: () => (
    <MobileFrame>
      <AppProfileScreen
        avatarUrl="https://avatars.githubusercontent.com/in/15368?v=4"
        name="GitHub Actions"
        login="github-actions"
        description="Automate your workflow from idea to production. Build, test, and deploy your code right from GitHub."
        externalUrl="https://github.com/features/actions"
        createdAt="2018-10-16T00:00:00Z"
        recentActivity={generateHourlyActivity('active')}
      />
    </MobileFrame>
  ),
};

export const RenovateBot: Story = {
  render: () => (
    <MobileFrame>
      <AppProfileScreen
        avatarUrl="https://avatars.githubusercontent.com/in/2740?v=4"
        name="Renovate"
        login="renovate"
        description="Automated dependency updates. Multi-platform and multi-language. Keep all your dependencies up-to-date."
        externalUrl="https://www.mend.io/renovate/"
        createdAt="2017-07-14T12:00:00Z"
        recentActivity={generateHourlyActivity('moderate')}
      />
    </MobileFrame>
  ),
};

export const MinimalApp: Story = {
  render: () => (
    <MobileFrame>
      <AppProfileScreen
        avatarUrl="https://avatars.githubusercontent.com/in/12345?v=4"
        name="Simple Bot"
        login="simple-bot"
        createdAt="2024-01-01T00:00:00Z"
      />
    </MobileFrame>
  ),
};

export const NoActivity: Story = {
  render: () => (
    <MobileFrame>
      <AppProfileScreen
        avatarUrl="https://avatars.githubusercontent.com/in/67890?v=4"
        name="Quiet App"
        login="quiet-app"
        description="A GitHub App that runs silently in the background, monitoring your repositories for security issues."
        externalUrl="https://example.com"
        createdAt="2023-06-10T15:30:00Z"
        recentActivity={[]}
      />
    </MobileFrame>
  ),
};

export const Loading: Story = {
  render: () => (
    <MobileFrame>
      <AppProfileScreen loading={true} />
    </MobileFrame>
  ),
};

export const LongDescription: Story = {
  render: () => (
    <MobileFrame>
      <AppProfileScreen
        avatarUrl="https://avatars.githubusercontent.com/in/11111?v=4"
        name="CodeQL Analysis"
        login="codeql"
        description="Discover vulnerabilities across a codebase with CodeQL, our industry-leading semantic code analysis engine. CodeQL lets you query code as though it were data. Write a query to find all variants of a vulnerability, eradicating it forever. Then share your query to help others do the same."
        externalUrl="https://codeql.github.com"
        createdAt="2019-09-18T00:00:00Z"
        recentActivity={generateHourlyActivity('light')}
      />
    </MobileFrame>
  ),
};
