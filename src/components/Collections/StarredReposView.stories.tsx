import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { StarredReposView } from './StarredReposView';
import type { StarredRepo, Collection } from '../../types/collections';

const meta: Meta<typeof StarredReposView> = {
  title: 'Collections/StarredReposView',
  component: StarredReposView,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    isLoading: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockRepos: StarredRepo[] = [
  {
    owner: 'anthropics',
    name: 'claude-code',
    full_name: 'anthropics/claude-code',
    owner_avatar_url: 'https://avatars.githubusercontent.com/u/12345?v=4',
    description: 'Official CLI tool for Claude - AI-powered coding assistance',
    stargazers_count: 12547,
    language: 'TypeScript',
    topics: ['ai', 'cli', 'developer-tools', 'typescript'],
  },
  {
    owner: 'facebook',
    name: 'react',
    full_name: 'facebook/react',
    owner_avatar_url: 'https://avatars.githubusercontent.com/u/69631?v=4',
    description: 'A declarative, efficient, and flexible JavaScript library for building user interfaces.',
    stargazers_count: 234567,
    language: 'JavaScript',
    topics: ['react', 'javascript', 'ui', 'framework'],
  },
  {
    owner: 'vercel',
    name: 'next.js',
    full_name: 'vercel/next.js',
    owner_avatar_url: 'https://avatars.githubusercontent.com/u/14985020?v=4',
    description: 'The React Framework for Production',
    stargazers_count: 125890,
    language: 'TypeScript',
    topics: ['react', 'nextjs', 'framework', 'ssr'],
  },
  {
    owner: 'django',
    name: 'django',
    full_name: 'django/django',
    owner_avatar_url: 'https://avatars.githubusercontent.com/u/27804?v=4',
    description: 'The Web framework for perfectionists with deadlines.',
    stargazers_count: 78954,
    language: 'Python',
    topics: ['python', 'web', 'framework', 'django'],
  },
  {
    owner: 'rust-lang',
    name: 'rust',
    full_name: 'rust-lang/rust',
    owner_avatar_url: 'https://avatars.githubusercontent.com/u/5430905?v=4',
    description: 'Empowering everyone to build reliable and efficient software.',
    stargazers_count: 95678,
    language: 'Rust',
    topics: ['rust', 'systems-programming', 'compiler'],
  },
  {
    owner: 'kubernetes',
    name: 'kubernetes',
    full_name: 'kubernetes/kubernetes',
    owner_avatar_url: 'https://avatars.githubusercontent.com/u/13629408?v=4',
    description: 'Production-Grade Container Orchestration',
    stargazers_count: 108543,
    language: 'Go',
    topics: ['go', 'kubernetes', 'containers', 'orchestration'],
  },
  {
    owner: 'microsoft',
    name: 'vscode',
    full_name: 'microsoft/vscode',
    owner_avatar_url: 'https://avatars.githubusercontent.com/u/6154722?v=4',
    description: 'Visual Studio Code',
    stargazers_count: 162341,
    language: 'TypeScript',
    topics: ['editor', 'typescript', 'electron'],
  },
  {
    owner: 'tensorflow',
    name: 'tensorflow',
    full_name: 'tensorflow/tensorflow',
    owner_avatar_url: 'https://avatars.githubusercontent.com/u/15658638?v=4',
    description: 'An Open Source Machine Learning Framework for Everyone',
    stargazers_count: 185234,
    language: 'Python',
    topics: ['machine-learning', 'deep-learning', 'tensorflow'],
  },
];

const mockCollections: Collection[] = [
  {
    id: '1',
    name: 'Learning Resources',
    icon: 'BookMarked',
    repos: [
      {
        owner: 'facebook',
        repo: 'react',
        addedAt: '2024-03-01T10:00:00Z',
      },
    ],
    users: [],
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-03-01T10:00:00Z',
  },
  {
    id: '2',
    name: 'AI Tools',
    icon: 'Code',
    repos: [
      {
        owner: 'anthropics',
        repo: 'claude-code',
        addedAt: '2024-03-04T10:00:00Z',
      },
      {
        owner: 'tensorflow',
        repo: 'tensorflow',
        addedAt: '2024-03-05T10:00:00Z',
      },
    ],
    users: [],
    createdAt: '2024-03-04T10:00:00Z',
    updatedAt: '2024-03-05T10:00:00Z',
  },
];

export const Default: Story = {
  args: {
    repos: mockRepos,
    collections: mockCollections,
    isLoading: false,
    onRefresh: () => console.log('Refresh'),
    onRepoPress: (repo) => console.log('Repo pressed:', repo.full_name),
    onAddRepoToCollection: (repoId, collectionIds) =>
      console.log('Add repo:', repoId, 'to collections:', collectionIds),
    onRemoveRepoFromCollection: (repoId, collectionId) =>
      console.log('Remove repo:', repoId, 'from collection:', collectionId),
    onCreateCollection: (name, icon) => console.log('Create collection:', name, icon),
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    repos: [],
    isLoading: true,
  },
};

export const EmptyState: Story = {
  args: {
    ...Default.args,
    repos: [],
    isLoading: false,
  },
};

export const FewRepos: Story = {
  args: {
    ...Default.args,
    repos: mockRepos.slice(0, 3),
  },
};

export const NoCollections: Story = {
  args: {
    ...Default.args,
    collections: [],
  },
};

export const SingleRepo: Story = {
  args: {
    ...Default.args,
    repos: [mockRepos[0]],
  },
};

export const ManyRepos: Story = {
  args: {
    ...Default.args,
    repos: [
      ...mockRepos,
      ...mockRepos.map((repo, index) => ({
        ...repo,
        id: repo.id + 100 + index,
        name: `${repo.name}-fork-${index}`,
        full_name: `forked/${repo.name}-${index}`,
      })),
    ],
  },
};

export const AllReposInCollections: Story = {
  args: {
    repos: mockRepos,
    collections: [
      {
        id: '1',
        name: 'All Repos',
        icon: 'Folder',
        repos: mockRepos.map((repo) => ({
          owner: repo.owner,
          repo: repo.name,
          addedAt: '2024-03-01T10:00:00Z',
        })),
        users: [],
        createdAt: '2024-03-01T10:00:00Z',
        updatedAt: '2024-03-01T10:00:00Z',
      },
    ],
    isLoading: false,
  },
};

export const MixedLanguages: Story = {
  args: {
    ...Default.args,
    repos: mockRepos.filter((repo) =>
      ['TypeScript', 'Python', 'Rust', 'Go'].includes(repo.language || '')
    ),
  },
};

export const JavaScriptOnly: Story = {
  args: {
    ...Default.args,
    repos: mockRepos.filter((repo) => repo.language === 'JavaScript'),
  },
};

export const TypeScriptOnly: Story = {
  args: {
    ...Default.args,
    repos: mockRepos.filter((repo) => repo.language === 'TypeScript'),
  },
};

export const HighlyStarredRepos: Story = {
  args: {
    ...Default.args,
    repos: mockRepos.filter((repo) => repo.stargazers_count > 100000),
  },
};
