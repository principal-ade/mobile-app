import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { DailyActivityHeatmap, CommitTimestamp } from './DailyActivityHeatmap';

const MOCK_AUTHORS = [
  { login: 'octocat', avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4' },
  { login: 'torvalds', avatarUrl: 'https://avatars.githubusercontent.com/u/1024025?v=4' },
  { login: 'gaearon', avatarUrl: 'https://avatars.githubusercontent.com/u/810438?v=4' },
  { login: 'sindresorhus', avatarUrl: 'https://avatars.githubusercontent.com/u/170270?v=4' },
];

const generateMockCommits = (options?: {
  daysAgo?: number[];
  quarters?: ('Night' | 'Morning' | 'Afternoon' | 'Evening')[];
  commitsPerBlock?: number;
}): CommitTimestamp[] => {
  const { daysAgo = [0, 1, 2, 3, 4, 5, 6], quarters = ['Night', 'Morning', 'Afternoon', 'Evening'], commitsPerBlock = 3 } = options || {};
  const commits: CommitTimestamp[] = [];
  const now = new Date();

  daysAgo.forEach((days) => {
    quarters.forEach((quarter) => {
      const commitCount = Math.floor(Math.random() * commitsPerBlock) + 1;
      for (let i = 0; i < commitCount; i++) {
        const timestamp = new Date(now);
        timestamp.setDate(timestamp.getDate() - days);

        // Set hour based on quarter
        const hourOffset = quarter === 'Night' ? 3 : quarter === 'Morning' ? 9 : quarter === 'Afternoon' ? 15 : 21;
        timestamp.setHours(hourOffset, Math.floor(Math.random() * 60), 0, 0);

        const author = MOCK_AUTHORS[Math.floor(Math.random() * MOCK_AUTHORS.length)];
        commits.push({
          timestamp,
          repoId: 'test/repo',
          authorLogin: author.login,
          authorAvatarUrl: author.avatarUrl,
        });
      }
    });
  });

  return commits;
};

const generateBusyWeek = (): CommitTimestamp[] => {
  const commits: CommitTimestamp[] = [];
  const now = new Date();

  for (let days = 0; days < 7; days++) {
    const dayDate = new Date(now);
    dayDate.setDate(dayDate.getDate() - days);

    const quarters: ('Night' | 'Morning' | 'Afternoon' | 'Evening')[] = ['Night', 'Morning', 'Afternoon', 'Evening'];
    quarters.forEach((quarter) => {
      const hourOffset = quarter === 'Night' ? 3 : quarter === 'Morning' ? 9 : quarter === 'Afternoon' ? 15 : 21;

      // More commits during work hours
      const commitCount = quarter === 'Morning' || quarter === 'Afternoon'
        ? Math.floor(Math.random() * 8) + 3
        : Math.floor(Math.random() * 3);

      for (let i = 0; i < commitCount; i++) {
        const timestamp = new Date(dayDate);
        timestamp.setHours(hourOffset, Math.floor(Math.random() * 60), 0, 0);
        const author = MOCK_AUTHORS[Math.floor(Math.random() * MOCK_AUTHORS.length)];
        commits.push({
          timestamp,
          repoId: 'test/repo',
          authorLogin: author.login,
          authorAvatarUrl: author.avatarUrl,
        });
      }
    });
  }

  return commits;
};

const generateQuietWeek = (): CommitTimestamp[] => {
  const commits: CommitTimestamp[] = [];
  const now = new Date();

  // Only a few commits spread across the week
  for (let i = 0; i < 5; i++) {
    const days = Math.floor(Math.random() * 7);
    const timestamp = new Date(now);
    timestamp.setDate(timestamp.getDate() - days);
    timestamp.setHours(10 + Math.floor(Math.random() * 6), Math.floor(Math.random() * 60), 0, 0);

    const author = MOCK_AUTHORS[Math.floor(Math.random() * MOCK_AUTHORS.length)];
    commits.push({
      timestamp,
      repoId: 'test/repo',
      authorLogin: author.login,
      authorAvatarUrl: author.avatarUrl,
    });
  }

  return commits;
};

const Frame: React.FC<{ children: React.ReactNode; width?: number }> = ({
  children,
  width = 360,
}) => (
  <NavigationContainer>
    <SafeAreaProvider>
      <View
        style={{
          width,
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          overflow: 'hidden',
          backgroundColor: '#fff',
        }}
      >
        {children}
      </View>
    </SafeAreaProvider>
  </NavigationContainer>
);

const meta: Meta<typeof DailyActivityHeatmap> = {
  title: 'Components/DailyActivityHeatmap',
  component: DailyActivityHeatmap,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DailyActivityHeatmap>;

export const Empty: Story = {
  render: () => (
    <Frame>
      <DailyActivityHeatmap commits={[]} />
    </Frame>
  ),
};

export const FewCommits: Story = {
  render: () => (
    <Frame>
      <DailyActivityHeatmap commits={generateQuietWeek()} />
    </Frame>
  ),
};

export const BusyWeek: Story = {
  render: () => (
    <Frame>
      <DailyActivityHeatmap commits={generateBusyWeek()} />
    </Frame>
  ),
};

export const SelectiveDays: Story = {
  render: () => (
    <Frame>
      <DailyActivityHeatmap
        commits={generateMockCommits({
          daysAgo: [0, 2, 4, 6],
          quarters: ['Morning', 'Afternoon'],
        })}
      />
    </Frame>
  ),
};

export const NightOwl: Story = {
  render: () => (
    <Frame>
      <DailyActivityHeatmap
        commits={generateMockCommits({
          daysAgo: [0, 1, 2, 3, 4, 5, 6],
          quarters: ['Night', 'Evening'],
          commitsPerBlock: 5,
        })}
      />
    </Frame>
  ),
};

export const MorningPerson: Story = {
  render: () => (
    <Frame>
      <DailyActivityHeatmap
        commits={generateMockCommits({
          daysAgo: [0, 1, 2, 3, 4, 5, 6],
          quarters: ['Morning'],
          commitsPerBlock: 6,
        })}
      />
    </Frame>
  ),
};

export const Interactive: Story = {
  render: () => {
    const InteractiveDemo = () => {
      const [selected, setSelected] = React.useState<string | null>(null);

      return (
        <Frame>
          <View style={{ padding: 16 }}>
            <Text style={{ marginBottom: 16, fontSize: 14, color: '#333' }}>
              Click any block to see selection. Selected: {selected || 'none'}
            </Text>
            <DailyActivityHeatmap
              commits={generateBusyWeek()}
              onBlockClick={(date, quarter, count) => {
                const label = `${date.toLocaleDateString()} ${quarter}`;
                console.log(`Clicked: ${label}, ${count} commits`);
                setSelected(label);
              }}
            />
          </View>
        </Frame>
      );
    };

    return <InteractiveDemo />;
  },
};

export const DarkMode: Story = {
  render: () => (
    <View style={{ backgroundColor: '#1a1a1a', padding: 16, borderRadius: 8 }}>
      <Frame width={360}>
        <View style={{ backgroundColor: '#1a1a1a' }}>
          <DailyActivityHeatmap commits={generateBusyWeek()} />
        </View>
      </Frame>
    </View>
  ),
};

export const WideContainer: Story = {
  render: () => (
    <Frame width={500}>
      <DailyActivityHeatmap commits={generateBusyWeek()} />
    </Frame>
  ),
};

export const NarrowContainer: Story = {
  render: () => (
    <Frame width={280}>
      <DailyActivityHeatmap commits={generateBusyWeek()} />
    </Frame>
  ),
};
