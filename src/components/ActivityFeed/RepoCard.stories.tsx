import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { RepoCard } from './RepoCard';

const meta: Meta<typeof RepoCard> = {
  title: 'ActivityFeed/RepoCard',
  component: RepoCard,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    repoFullName: { control: 'text' },
    description: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockCommits = [
  {
    sha: 'abc123',
    message: 'feat: Add activity feed component with swipeable cards',
    author: {
      login: 'griever',
      avatarUrl: 'https://avatars.githubusercontent.com/u/1234567?v=4',
    },
    date: '2 hours ago',
  },
  {
    sha: 'def456',
    message: 'fix: Resolve navigation issue on iOS',
    author: {
      login: 'contributor',
      avatarUrl: 'https://avatars.githubusercontent.com/u/7654321?v=4',
    },
    date: '5 hours ago',
  },
];

export const Default: Story = {
  args: {
    repoFullName: 'principal-ade/mobile-app',
    description: 'Mobile app for browsing GitHub activity with File City visualizations',
    commits: mockCommits,
  },
};

export const WithFileCity: Story = {
  args: {
    repoFullName: 'anthropics/claude-code',
    description: 'Claude Code CLI tool',
    commits: mockCommits,
    fileCityUrl: 'https://picsum.photos/400/200',
  },
};

export const SingleCommit: Story = {
  args: {
    repoFullName: 'facebook/react',
    description: 'A declarative, efficient, and flexible JavaScript library for building user interfaces',
    commits: [mockCommits[0]],
  },
};

export const NoDescription: Story = {
  args: {
    repoFullName: 'torvalds/linux',
    commits: mockCommits,
  },
};

export const LongCommitMessage: Story = {
  args: {
    repoFullName: 'vercel/next.js',
    description: 'The React Framework',
    commits: [
      {
        sha: 'xyz789',
        message: 'refactor(core): Completely rewrite the routing system to support parallel routes, intercepting routes, and the new app directory structure with improved performance',
        author: {
          login: 'developer',
          avatarUrl: 'https://avatars.githubusercontent.com/u/9999999?v=4',
        },
        date: '1 hour ago',
      },
    ],
  },
};
