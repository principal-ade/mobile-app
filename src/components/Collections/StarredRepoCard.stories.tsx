import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { StarredRepoCard } from './StarredRepoCard';

const meta: Meta<typeof StarredRepoCard> = {
  title: 'Collections/StarredRepoCard',
  component: StarredRepoCard,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    isInCollection: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockRepo = {
  owner: 'anthropics',
  name: 'claude-code',
  full_name: 'anthropics/claude-code',
  owner_avatar_url: 'https://avatars.githubusercontent.com/u/12345?v=4',
  description: 'Official CLI tool for Claude - AI-powered coding assistance',
  stargazers_count: 12547,
  language: 'TypeScript',
  topics: ['ai', 'cli', 'developer-tools', 'typescript', 'anthropic'],
};

export const Default: Story = {
  args: {
    repo: mockRepo,
    isInCollection: false,
  },
};

export const InCollection: Story = {
  args: {
    repo: mockRepo,
    isInCollection: true,
  },
};

export const NoTopics: Story = {
  args: {
    repo: {
      ...mockRepo,
      topics: [],
    },
    isInCollection: false,
  },
};

export const NoDescription: Story = {
  args: {
    repo: {
      ...mockRepo,
      description: null,
    },
    isInCollection: false,
  },
};

export const NoLanguage: Story = {
  args: {
    repo: {
      ...mockRepo,
      language: null,
    },
    isInCollection: false,
  },
};

export const HighStarCount: Story = {
  args: {
    repo: {
      ...mockRepo,
      owner: 'facebook',
      name: 'react',
      full_name: 'facebook/react',
      owner_avatar_url: 'https://avatars.githubusercontent.com/u/69631?v=4',
      description: 'A declarative, efficient, and flexible JavaScript library for building user interfaces.',
      stargazers_count: 234567,
      language: 'JavaScript',
      topics: ['react', 'javascript', 'ui', 'framework'],
    },
    isInCollection: false,
  },
};

export const LowStarCount: Story = {
  args: {
    repo: {
      ...mockRepo,
      stargazers_count: 42,
    },
    isInCollection: false,
  },
};

export const LongName: Story = {
  args: {
    repo: {
      ...mockRepo,
      name: 'very-long-repository-name-that-should-be-truncated',
      full_name: 'organization-with-long-name/very-long-repository-name-that-should-be-truncated',
    },
    isInCollection: false,
  },
};

export const LongDescription: Story = {
  args: {
    repo: {
      ...mockRepo,
      description:
        'This is a very long description that goes on and on and should be truncated after two lines to maintain a clean card layout. It contains a lot of information about the repository that might not all fit in the available space.',
    },
    isInCollection: false,
  },
};

export const ManyTopics: Story = {
  args: {
    repo: {
      ...mockRepo,
      topics: [
        'javascript',
        'typescript',
        'react',
        'node',
        'web',
        'frontend',
        'backend',
        'fullstack',
      ],
    },
    isInCollection: false,
  },
};

export const PythonRepo: Story = {
  args: {
    repo: {
      ...mockRepo,
      name: 'django',
      full_name: 'django/django',
      description: 'The Web framework for perfectionists with deadlines.',
      language: 'Python',
      topics: ['python', 'web', 'framework', 'django'],
      stargazers_count: 78954,
    },
    isInCollection: false,
  },
};

export const RustRepo: Story = {
  args: {
    repo: {
      ...mockRepo,
      name: 'rust',
      full_name: 'rust-lang/rust',
      description: 'Empowering everyone to build reliable and efficient software.',
      language: 'Rust',
      topics: ['rust', 'systems-programming', 'compiler'],
      stargazers_count: 95678,
    },
    isInCollection: false,
  },
};

export const GoRepo: Story = {
  args: {
    repo: {
      ...mockRepo,
      name: 'kubernetes',
      full_name: 'kubernetes/kubernetes',
      description: 'Production-Grade Container Orchestration',
      language: 'Go',
      topics: ['go', 'kubernetes', 'containers', 'orchestration'],
      stargazers_count: 108543,
    },
    isInCollection: false,
  },
};
