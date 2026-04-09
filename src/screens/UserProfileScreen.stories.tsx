import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React from 'react';
import { View } from 'react-native';
import { UserProfileScreen, HourlyActivityGroup } from './UserProfileScreen';
import { DailyContribution } from '../components/ContributionCalendar';

// Generate hourly activity groups for last 24 hours
const generateHourlyActivity = (pattern: 'active' | 'moderate' | 'light'): HourlyActivityGroup[] => {
  const activity: HourlyActivityGroup[] = [];
  const now = new Date();
  const repos = [
    { name: 'awesome-react', owner: 'facebook', avatar: 'https://avatars.githubusercontent.com/u/69631?v=4' },
    { name: 'typescript-utils', owner: 'microsoft', avatar: 'https://avatars.githubusercontent.com/u/6154722?v=4' },
    { name: 'mobile-app', owner: 'vercel', avatar: 'https://avatars.githubusercontent.com/u/14985020?v=4' },
    { name: 'api-server', owner: 'anthropics', avatar: 'https://avatars.githubusercontent.com/u/102195149?v=4' },
  ];

  const hoursToGenerate = pattern === 'active' ? 12 : pattern === 'moderate' ? 8 : 4;

  for (let i = 0; i < hoursToGenerate; i++) {
    const hoursAgo = i * 2; // Every 2 hours
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

    const commits = Array.from({ length: commitCount }, (_, idx) => ({
      sha: `sha${i}${idx}`,
      message: `feat: implement feature ${idx + 1}`,
      additions: Math.floor(Math.random() * 50) + 10,
      deletions: Math.floor(Math.random() * 20),
    }));

    const totalAdditions = commits.reduce((sum, c) => sum + c.additions, 0);
    const totalDeletions = commits.reduce((sum, c) => sum + c.deletions, 0);

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
      commits,
      commitCount,
      totalAdditions,
      totalDeletions,
    });
  }

  return activity;
};

// Generate 5 months of mock contribution data
const generateMockContributions = (pattern: 'active' | 'moderate' | 'light' | 'sporadic'): DailyContribution[] => {
  const contributions: DailyContribution[] = [];
  const today = new Date();
  const daysToGenerate = 150; // 5 months

  for (let i = 0; i < daysToGenerate; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    let count = 0;
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    switch (pattern) {
      case 'active':
        // Very active developer (5-20 contributions most days)
        count = isWeekend
          ? Math.random() > 0.6 ? Math.floor(Math.random() * 8) + 2 : 0
          : Math.floor(Math.random() * 15) + 5;
        break;
      case 'moderate':
        // Moderately active (2-10 contributions, some gaps)
        count = Math.random() > 0.3
          ? Math.floor(Math.random() * 8) + 2
          : 0;
        break;
      case 'light':
        // Light activity (0-5 contributions, many gaps)
        count = Math.random() > 0.5
          ? Math.floor(Math.random() * 5)
          : 0;
        break;
      case 'sporadic':
        // Very sporadic (occasional bursts)
        count = Math.random() > 0.8
          ? Math.floor(Math.random() * 12) + 3
          : 0;
        break;
    }

    contributions.push({ date: dateStr, count });
  }

  return contributions.reverse(); // Oldest to newest
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

const meta: Meta<typeof UserProfileScreen> = {
  title: 'Screens/UserProfileScreen',
  component: UserProfileScreen,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    name: { control: 'text' },
    username: { control: 'text' },
    bio: { control: 'text' },
    location: { control: 'text' },
    website: { control: 'text' },
    isFollowing: { control: 'boolean' },
    onFollowPress: { action: 'follow pressed' },
    onMessagePress: { action: 'message pressed' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MobileFrame>
      <UserProfileScreen
        avatarUrl="https://avatars.githubusercontent.com/u/1?v=4"
        name="Sarah Chen"
        username="sarahchen"
        bio="Full-stack developer passionate about open source and building delightful user experiences. Coffee enthusiast and occasional blogger."
        location="San Francisco, CA"
        website="https://sarahchen.dev"
        stats={{
          repositories: 42,
          followers: 1234,
          following: 89,
        }}
        isFollowing={false}
        recentActivity={generateHourlyActivity('moderate')}
        contributions={generateMockContributions('moderate')}
      />
    </MobileFrame>
  ),
};

export const Following: Story = {
  render: () => (
    <MobileFrame>
      <UserProfileScreen
        avatarUrl="https://avatars.githubusercontent.com/u/1?v=4"
        name="Sarah Chen"
        username="sarahchen"
        bio="Full-stack developer passionate about open source and building delightful user experiences. Coffee enthusiast and occasional blogger."
        location="San Francisco, CA"
        website="https://sarahchen.dev"
        stats={{
          repositories: 42,
          followers: 1234,
          following: 89,
        }}
        isFollowing={true}
        recentActivity={generateHourlyActivity('moderate')}
        contributions={generateMockContributions('moderate')}
      />
    </MobileFrame>
  ),
};

export const MinimalProfile: Story = {
  render: () => (
    <MobileFrame>
      <UserProfileScreen
        avatarUrl="https://avatars.githubusercontent.com/u/2?v=4"
        name="Alex Rivera"
        username="alexrivera"
        stats={{
          repositories: 8,
          followers: 156,
          following: 45,
        }}
        isFollowing={false}
        contributions={generateMockContributions('light')}
      />
    </MobileFrame>
  ),
};

export const PopularDeveloper: Story = {
  render: () => (
    <MobileFrame>
      <UserProfileScreen
        avatarUrl="https://avatars.githubusercontent.com/u/3?v=4"
        name="Jordan Taylor"
        username="jtaylor"
        bio="Open source maintainer | Speaker | TypeScript & React enthusiast | Building tools for developers"
        location="Seattle, WA"
        website="https://jordantaylor.io"
        stats={{
          repositories: 127,
          followers: 12543,
          following: 234,
        }}
        isFollowing={true}
        contributions={generateMockContributions('active')}
        recentActivity={generateHourlyActivity('active')}
      />
    </MobileFrame>
  ),
};

export const NewUser: Story = {
  render: () => (
    <MobileFrame>
      <UserProfileScreen
        avatarUrl="https://avatars.githubusercontent.com/u/4?v=4"
        name="Casey Morgan"
        username="cmorgan"
        bio="Just getting started with coding! Learning JavaScript and Python."
        location="Austin, TX"
        stats={{
          repositories: 2,
          followers: 3,
          following: 12,
        }}
        isFollowing={false}
        contributions={generateMockContributions('sporadic')}
        recentActivity={generateHourlyActivity('light')}
      />
    </MobileFrame>
  ),
};

export const LongBio: Story = {
  render: () => (
    <MobileFrame>
      <UserProfileScreen
        avatarUrl="https://avatars.githubusercontent.com/u/5?v=4"
        name="Morgan Lee"
        username="morganlee"
        bio="Senior Software Engineer with 10+ years of experience in distributed systems, cloud architecture, and DevOps. Passionate about mentoring, technical writing, and contributing to open source. Currently working on making cloud infrastructure more accessible to developers."
        location="Remote"
        website="https://morganlee.tech"
        stats={{
          repositories: 85,
          followers: 3421,
          following: 156,
        }}
        isFollowing={false}
        contributions={generateMockContributions('active')}
      />
    </MobileFrame>
  ),
};

export const NoWebsite: Story = {
  render: () => (
    <MobileFrame>
      <UserProfileScreen
        avatarUrl="https://avatars.githubusercontent.com/u/6?v=4"
        name="Riley Park"
        username="rileypark"
        bio="Mobile developer building React Native apps"
        location="New York, NY"
        stats={{
          repositories: 23,
          followers: 567,
          following: 78,
        }}
        isFollowing={false}
        contributions={generateMockContributions('moderate')}
      />
    </MobileFrame>
  ),
};
