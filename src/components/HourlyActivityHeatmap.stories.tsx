import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React from 'react';
import { View, Text, ScrollView as RNScrollView } from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HourlyActivityHeatmap, CommitTimestamp } from './HourlyActivityHeatmap';

// Mock authors with GitHub avatar URLs
const MOCK_AUTHORS = [
  { login: 'octocat', avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4' },
  { login: 'torvalds', avatarUrl: 'https://avatars.githubusercontent.com/u/1024025?v=4' },
  { login: 'gaearon', avatarUrl: 'https://avatars.githubusercontent.com/u/810438?v=4' },
  { login: 'sindresorhus', avatarUrl: 'https://avatars.githubusercontent.com/u/170270?v=4' },
  { login: 'tj', avatarUrl: 'https://avatars.githubusercontent.com/u/25254?v=4' },
];

// Generate mock commits at various times
const generateMockCommits = (
  count: number,
  options?: { hoursAgo?: number; spreadMinutes?: number; withAuthors?: boolean }
): CommitTimestamp[] => {
  const { hoursAgo = 0, spreadMinutes = 60, withAuthors = false } = options || {};
  const commits: CommitTimestamp[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now);
    timestamp.setHours(timestamp.getHours() - hoursAgo);
    timestamp.setMinutes(timestamp.getMinutes() - Math.floor(Math.random() * spreadMinutes));

    const author = withAuthors ? MOCK_AUTHORS[i % MOCK_AUTHORS.length] : undefined;
    commits.push({
      timestamp,
      repoId: `repo-${i % 3}`,
      authorLogin: author?.login,
      authorAvatarUrl: author?.avatarUrl,
    });
  }

  return commits;
};

// Generate commits spread across the current day with authors
const generateDayCommits = (withAuthors = false): CommitTimestamp[] => {
  const commits: CommitTimestamp[] = [];
  const now = new Date();
  const currentHour = now.getHours();
  let commitIndex = 0;

  // Generate commits for each hour of the day up to now
  for (let h = 0; h <= currentHour; h++) {
    // More commits during work hours
    const commitCount = h >= 9 && h <= 17 ? Math.floor(Math.random() * 5) + 1 : Math.floor(Math.random() * 2);

    for (let i = 0; i < commitCount; i++) {
      const timestamp = new Date(now);
      timestamp.setHours(h);
      timestamp.setMinutes(Math.floor(Math.random() * 60));
      timestamp.setSeconds(0);

      const author = withAuthors ? MOCK_AUTHORS[commitIndex % MOCK_AUTHORS.length] : undefined;
      commits.push({
        timestamp,
        repoId: `repo-${i % 5}`,
        authorLogin: author?.login,
        authorAvatarUrl: author?.avatarUrl,
      });
      commitIndex++;
    }
  }

  return commits;
};

// Frame wrapper for consistent sizing
const Frame: React.FC<{ children: React.ReactNode; height?: number }> = ({
  children,
  height = 500,
}) => (
  <SafeAreaProvider>
    <View
      style={{
        width: 320,
        height,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        overflow: 'hidden',
        padding: 16,
      }}
    >
      {children}
    </View>
  </SafeAreaProvider>
);

const meta: Meta<typeof HourlyActivityHeatmap> = {
  title: 'Components/HourlyActivityHeatmap',
  component: HourlyActivityHeatmap,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof HourlyActivityHeatmap>;

export const Empty: Story = {
  render: () => (
    <Frame>
      <HourlyActivityHeatmap commits={[]} />
    </Frame>
  ),
};

export const FewCommits: Story = {
  render: () => (
    <Frame>
      <HourlyActivityHeatmap commits={generateMockCommits(5, { hoursAgo: 0, spreadMinutes: 30 })} />
    </Frame>
  ),
};

export const ActiveDay: Story = {
  render: () => (
    <Frame height={600}>
      <HourlyActivityHeatmap commits={generateDayCommits()} />
    </Frame>
  ),
};

export const BusyHour: Story = {
  render: () => (
    <Frame>
      <HourlyActivityHeatmap
        commits={generateMockCommits(20, { hoursAgo: 0, spreadMinutes: 60 })}
      />
    </Frame>
  ),
};

export const WithSelectedBlock: Story = {
  render: () => {
    const commits = generateMockCommits(10, { hoursAgo: 0, spreadMinutes: 30 });
    const selectedTime = new Date();
    selectedTime.setMinutes(Math.floor(selectedTime.getMinutes() / 10) * 10, 0, 0);

    return (
      <Frame>
        <HourlyActivityHeatmap
          commits={commits}
          selectedBlock={selectedTime.toISOString()}
        />
      </Frame>
    );
  },
};

export const WithActiveHour: Story = {
  render: () => {
    const commits = generateDayCommits();
    const now = new Date();
    const activeHourKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours() - 1}`;

    return (
      <Frame height={600}>
        <HourlyActivityHeatmap
          commits={commits}
          activeHourKey={activeHourKey}
        />
      </Frame>
    );
  },
};

export const Interactive: Story = {
  render: () => {
    const InteractiveDemo = () => {
      const [selectedBlock, setSelectedBlock] = React.useState<string | null>(null);
      const commits = generateDayCommits();

      return (
        <Frame height={600}>
          <HourlyActivityHeatmap
            commits={commits}
            selectedBlock={selectedBlock}
            onBlockClick={(startTime, _endTime, count) => {
              console.log(`Clicked block: ${startTime.toISOString()}, ${count} commits`);
              setSelectedBlock(startTime.toISOString());
            }}
          />
        </Frame>
      );
    };

    return <InteractiveDemo />;
  },
};

export const TallContainer: Story = {
  render: () => (
    <Frame height={800}>
      <HourlyActivityHeatmap commits={generateDayCommits()} />
    </Frame>
  ),
};

export const CompactContainer: Story = {
  render: () => (
    <Frame height={300}>
      <HourlyActivityHeatmap commits={generateMockCommits(10, { hoursAgo: 0, spreadMinutes: 120 })} />
    </Frame>
  ),
};

export const WithAuthorFilter: Story = {
  render: () => (
    <Frame height={600}>
      <HourlyActivityHeatmap
        commits={generateDayCommits(true)}
        selectedAuthorLogins={['octocat', 'torvalds']}
      />
    </Frame>
  ),
};

export const AuthorFilterInteractive: Story = {
  render: () => {
    const InteractiveDemo = () => {
      const [filter, setFilter] = React.useState<string[] | null>(null);
      const commits = React.useMemo(() => generateDayCommits(true), []);

      return (
        <View style={{ alignItems: 'center' }}>
          <Frame height={600}>
            <HourlyActivityHeatmap
              commits={commits}
              selectedAuthorLogins={filter}
            />
          </Frame>
          <View style={{ marginTop: 12, padding: 8, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
            <Text style={{ fontSize: 12, color: '#666' }}>
              Filter: {filter ? filter.join(', ') : 'All'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Text
                style={{ color: 'blue' }}
                onPress={() => setFilter(['octocat'])}
              >
                octocat
              </Text>
              <Text
                style={{ color: 'blue' }}
                onPress={() => setFilter(null)}
              >
                clear
              </Text>
            </View>
          </View>
        </View>
      );
    };

    return <InteractiveDemo />;
  },
};

export const ManyAuthors: Story = {
  render: () => {
    // Generate commits with many authors to test scrolling
    const commits: CommitTimestamp[] = [];
    const now = new Date();
    const manyAuthors = [
      ...MOCK_AUTHORS,
      { login: 'defunkt', avatarUrl: 'https://avatars.githubusercontent.com/u/2?v=4' },
      { login: 'mojombo', avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4' },
      { login: 'wycats', avatarUrl: 'https://avatars.githubusercontent.com/u/4?v=4' },
    ];

    for (let i = 0; i < 30; i++) {
      const timestamp = new Date(now);
      timestamp.setMinutes(timestamp.getMinutes() - Math.floor(Math.random() * 300));
      const author = manyAuthors[i % manyAuthors.length];
      commits.push({
        timestamp,
        authorLogin: author?.login,
        authorAvatarUrl: author?.avatarUrl,
      });
    }

    return (
      <Frame height={600}>
        <HourlyActivityHeatmap commits={commits} />
      </Frame>
    );
  },
};

// Isolated ScrollView tests
const TestChip: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <View
    style={{
      height: 36,
      paddingHorizontal: 16,
      borderRadius: 18,
      backgroundColor: color,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    }}
  >
    <Text style={{ color: '#fff', fontWeight: '600' }}>{label}</Text>
  </View>
);

export const ScrollViewTestRN: Story = {
  name: 'ScrollView Test (RN)',
  render: () => (
    <SafeAreaProvider>
      <View style={{ width: 320, padding: 16 }}>
        <Text style={{ marginBottom: 8 }}>React Native ScrollView:</Text>
        <View style={{ height: 50, backgroundColor: '#f0f0f0', borderRadius: 8 }}>
          <RNScrollView
            horizontal
            showsHorizontalScrollIndicator
            style={{ flex: 1 }}
            contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 8 }}
          >
            {['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'].map((label, i) => (
              <TestChip key={label} label={label} color={`hsl(${i * 40}, 70%, 50%)`} />
            ))}
          </RNScrollView>
        </View>
      </View>
    </SafeAreaProvider>
  ),
};

export const ScrollViewTestGH: Story = {
  name: 'ScrollView Test (GestureHandler)',
  render: () => (
    <SafeAreaProvider>
      <View style={{ width: 320, padding: 16 }}>
        <Text style={{ marginBottom: 8 }}>Gesture Handler ScrollView:</Text>
        <View style={{ height: 50, backgroundColor: '#f0f0f0', borderRadius: 8 }}>
          <GHScrollView
            horizontal
            showsHorizontalScrollIndicator
            style={{ flex: 1 }}
            contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 8 }}
          >
            {['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'].map((label, i) => (
              <TestChip key={label} label={label} color={`hsl(${i * 40}, 70%, 50%)`} />
            ))}
          </GHScrollView>
        </View>
      </View>
    </SafeAreaProvider>
  ),
};

export const ScrollViewTestNative: Story = {
  name: 'ScrollView Test (native div)',
  render: () => (
    <SafeAreaProvider>
      <View style={{ width: 320, padding: 16 }}>
        <Text style={{ marginBottom: 8 }}>Native div overflow-x scroll:</Text>
        <div
          style={{
            height: 50,
            backgroundColor: '#f0f0f0',
            borderRadius: 8,
            overflowX: 'scroll',
            overflowY: 'hidden',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 8,
            paddingRight: 8,
          }}
        >
          {['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'].map((label, i) => (
            <div
              key={label}
              style={{
                height: 36,
                paddingLeft: 16,
                paddingRight: 16,
                borderRadius: 18,
                backgroundColor: `hsl(${i * 40}, 70%, 50%)`,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 8,
                flexShrink: 0,
              }}
            >
              <span style={{ color: '#fff', fontWeight: 600 }}>{label}</span>
            </div>
          ))}
        </div>
      </View>
    </SafeAreaProvider>
  ),
};
