import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemeProvider, useTheme } from '@principal-ade/industry-theme';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ContributionCalendar, type DailyContribution } from './ContributionCalendar';
import { iceTangerineDarkTheme } from '../themes/iceTangerineDark';

// Generate mock contribution data
const generateMockContributions = (days: number = 150): DailyContribution[] => {
  const contributions: DailyContribution[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Generate random contribution count with some patterns
    const count = Math.random() > 0.3 ? Math.floor(Math.random() * 20) : 0;

    contributions.push({
      date: dateStr,
      count,
    });
  }

  return contributions;
};

// Wrapper that mimics the RepoFileCityScreen header
const HeaderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        {/* Heatmap background */}
        <View style={styles.headerBackground}>
          <View style={styles.headerCalendarWrapper}>
            {children}
          </View>
        </View>

        {/* Header content overlay */}
        <View style={styles.headerContent}>
          <Text style={[styles.repoName, { color: theme.colors.text }]}>
            facebook/react
          </Text>
          <Text style={[styles.repoDescription, { color: theme.colors.textSecondary }]}>
            Sample repository to test contribution calendar in header
          </Text>
        </View>
      </View>

      {/* Body content */}
      <View style={styles.body}>
        <Text style={{ color: theme.colors.textTertiary, textAlign: 'center' }}>
          Body content area
        </Text>
      </View>
    </View>
  );
};

const ContributionCalendarWithTheme: React.FC<React.ComponentProps<typeof ContributionCalendar>> = (props) => (
  <SafeAreaProvider>
    <ThemeProvider theme={iceTangerineDarkTheme}>
      <ContributionCalendar {...props} />
    </ThemeProvider>
  </SafeAreaProvider>
);

const ContributionCalendarInHeader: React.FC<React.ComponentProps<typeof ContributionCalendar>> = (props) => (
  <SafeAreaProvider>
    <ThemeProvider theme={iceTangerineDarkTheme}>
      <HeaderWrapper>
        <ContributionCalendar {...props} />
      </HeaderWrapper>
    </ThemeProvider>
  </SafeAreaProvider>
);

const meta: Meta<typeof ContributionCalendar> = {
  title: 'Components/ContributionCalendar',
  component: ContributionCalendar,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof ContributionCalendar>;

export const Default: Story = {
  render: (args) => <ContributionCalendarWithTheme {...args} />,
  args: {
    contributions: generateMockContributions(150),
    months: 5,
    showLabels: true,
    loading: false,
  },
};

export const ThreeMonths: Story = {
  render: (args) => <ContributionCalendarWithTheme {...args} />,
  args: {
    contributions: generateMockContributions(90),
    months: 3,
    showLabels: true,
    loading: false,
  },
};

export const NoLabels: Story = {
  render: (args) => <ContributionCalendarWithTheme {...args} />,
  args: {
    contributions: generateMockContributions(150),
    months: 5,
    showLabels: false,
    loading: false,
  },
};

export const Loading: Story = {
  render: (args) => <ContributionCalendarWithTheme {...args} />,
  args: {
    contributions: [],
    months: 5,
    showLabels: true,
    loading: true,
  },
};

export const WithMaxHeight: Story = {
  render: (args) => <ContributionCalendarWithTheme {...args} />,
  args: {
    contributions: generateMockContributions(180),
    months: 5,
    showLabels: false,
    loading: false,
    maxHeight: 200,
  },
};

export const InHeaderContext: Story = {
  render: (args) => <ContributionCalendarInHeader {...args} />,
  args: {
    contributions: generateMockContributions(180),
    months: 5,
    showLabels: false,
    loading: false,
    maxHeight: 200,
  },
};

export const InHeaderLoading: Story = {
  render: (args) => <ContributionCalendarInHeader {...args} />,
  args: {
    contributions: [],
    months: 5,
    showLabels: false,
    loading: true,
    maxHeight: 200,
  },
};

// Fixed height wrapper for testing
const FixedHeightWrapper: React.FC<{ children: React.ReactNode; height: number }> = ({ children, height }) => (
  <SafeAreaProvider>
    <ThemeProvider theme={iceTangerineDarkTheme}>
      <View style={{ height, backgroundColor: '#1a1a1a', padding: 16 }}>
        {children}
      </View>
    </ThemeProvider>
  </SafeAreaProvider>
);

export const FixedHeight200px: Story = {
  render: (args) => (
    <FixedHeightWrapper height={200}>
      <ContributionCalendar {...args} />
    </FixedHeightWrapper>
  ),
  args: {
    contributions: generateMockContributions(180),
    months: 5,
    showLabels: false,
    loading: false,
  },
};

export const FixedHeight150px: Story = {
  render: (args) => (
    <FixedHeightWrapper height={150}>
      <ContributionCalendar {...args} />
    </FixedHeightWrapper>
  ),
  args: {
    contributions: generateMockContributions(180),
    months: 5,
    showLabels: false,
    loading: false,
  },
};

export const FixedHeight100px: Story = {
  render: (args) => (
    <FixedHeightWrapper height={100}>
      <ContributionCalendar {...args} />
    </FixedHeightWrapper>
  ),
  args: {
    contributions: generateMockContributions(180),
    months: 5,
    showLabels: false,
    loading: false,
  },
};

export const SmallDataset: Story = {
  render: (args) => (
    <FixedHeightWrapper height={200}>
      <ContributionCalendar {...args} />
    </FixedHeightWrapper>
  ),
  args: {
    contributions: generateMockContributions(30), // Only 1 month worth
    months: 1,
    showLabels: false,
    loading: false,
  },
};

export const VerySmallDataset: Story = {
  render: (args) => (
    <FixedHeightWrapper height={200}>
      <ContributionCalendar {...args} />
    </FixedHeightWrapper>
  ),
  args: {
    contributions: generateMockContributions(14), // Only 2 weeks worth
    months: 1,
    showLabels: false,
    loading: false,
  },
};

// Grid Layout Stories
export const Grid14x14: Story = {
  render: (args) => (
    <SafeAreaProvider>
      <ThemeProvider theme={iceTangerineDarkTheme}>
        <View style={{ width: 400, height: 400, backgroundColor: '#1a1a1a', padding: 16 }}>
          <ContributionCalendar {...args} />
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  ),
  args: {
    contributions: generateMockContributions(196), // 14 x 14 = 196 days
    showLabels: false,
    loading: false,
    layout: 'grid',
    gridColumns: 14,
    gridRows: 14,
  },
};

export const GridInHeader: Story = {
  render: (args) => (
    <SafeAreaProvider>
      <ThemeProvider theme={iceTangerineDarkTheme}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={{
            height: 200,
            position: 'relative',
            backgroundColor: '#1a1a1a',
            padding: 16,
          }}>
            <ContributionCalendar {...args} />
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#fff' }}>FileCity would go here with transparent background</Text>
          </View>
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  ),
  args: {
    contributions: generateMockContributions(196),
    showLabels: false,
    loading: false,
    layout: 'grid',
    gridColumns: 14,
    gridRows: 14,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 100,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: -16,
    right: -16,
    bottom: 0,
    opacity: 0.3,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  headerCalendarWrapper: {
    width: '100%',
    height: '100%',
  },
  headerContent: {
    zIndex: 1,
    paddingTop: 8,
  },
  repoName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  repoDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
