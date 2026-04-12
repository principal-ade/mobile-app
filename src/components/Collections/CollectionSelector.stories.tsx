import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CollectionSelector } from './CollectionSelector';
import type { Collection } from '../../types/collections';

const meta: Meta<typeof CollectionSelector> = {
  title: 'Collections/CollectionSelector',
  component: CollectionSelector,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    visible: { control: 'boolean' },
    itemType: {
      control: 'select',
      options: ['repo', 'user'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockCollections: Collection[] = [
  {
    id: '1',
    name: 'Learning Resources',
    description: 'Repos I want to learn from',
    icon: 'BookMarked',
    repos: [
      {
        owner: 'facebook',
        repo: 'react',
        addedAt: '2024-03-01T10:00:00Z',
      },
      {
        owner: 'vercel',
        repo: 'next.js',
        addedAt: '2024-03-02T10:00:00Z',
      },
    ],
    users: [],
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-03-02T10:00:00Z',
  },
  {
    id: '2',
    name: 'Work Projects',
    description: 'Repositories for work',
    icon: 'Briefcase',
    repos: [
      {
        owner: 'company',
        repo: 'backend-api',
        addedAt: '2024-03-03T10:00:00Z',
      },
    ],
    users: [],
    createdAt: '2024-03-03T10:00:00Z',
    updatedAt: '2024-03-03T10:00:00Z',
  },
  {
    id: '3',
    name: 'Inspiration',
    icon: 'Star',
    repos: [
      {
        owner: 'anthropics',
        repo: 'claude-code',
        addedAt: '2024-03-04T10:00:00Z',
      },
      {
        owner: 'openai',
        repo: 'gpt-4',
        addedAt: '2024-03-05T10:00:00Z',
      },
      {
        owner: 'microsoft',
        repo: 'vscode',
        addedAt: '2024-03-06T10:00:00Z',
      },
    ],
    users: [],
    createdAt: '2024-03-04T10:00:00Z',
    updatedAt: '2024-03-06T10:00:00Z',
  },
];

export const Default: Story = {
  args: {
    visible: true,
    collections: mockCollections,
    selectedCollectionIds: [],
    itemType: 'repo',
    itemName: 'anthropics/claude-code',
    onClose: () => console.log('Close'),
    onSelectCollection: (id) => console.log('Select:', id),
    onDeselectCollection: (id) => console.log('Deselect:', id),
    onCreateCollection: (name, icon) => console.log('Create:', name, icon),
    onDone: () => console.log('Done'),
  },
};

export const WithSelections: Story = {
  args: {
    ...Default.args,
    selectedCollectionIds: ['1', '3'],
  },
};

export const EmptyCollections: Story = {
  args: {
    ...Default.args,
    collections: [],
  },
};

export const SingleCollection: Story = {
  args: {
    ...Default.args,
    collections: [mockCollections[0]],
  },
};

export const ForUser: Story = {
  args: {
    visible: true,
    collections: [
      {
        id: '1',
        name: 'Following',
        icon: 'Users',
        repos: [],
        users: [
          {
            login: 'torvalds',
            addedAt: '2024-03-01T10:00:00Z',
          },
          {
            login: 'gaearon',
            addedAt: '2024-03-02T10:00:00Z',
          },
        ],
        createdAt: '2024-03-01T10:00:00Z',
        updatedAt: '2024-03-02T10:00:00Z',
      },
      {
        id: '2',
        name: 'Tech Leaders',
        icon: 'Rocket',
        repos: [],
        users: [
          {
            login: 'dhh',
            addedAt: '2024-03-03T10:00:00Z',
          },
        ],
        createdAt: '2024-03-03T10:00:00Z',
        updatedAt: '2024-03-03T10:00:00Z',
      },
    ],
    selectedCollectionIds: [],
    itemType: 'user',
    itemName: 'kentcdodds',
    onClose: () => console.log('Close'),
    onSelectCollection: (id) => console.log('Select:', id),
    onDeselectCollection: (id) => console.log('Deselect:', id),
    onCreateCollection: (name, icon) => console.log('Create:', name, icon),
    onDone: () => console.log('Done'),
  },
};

export const LongItemName: Story = {
  args: {
    ...Default.args,
    itemName: 'very-long-organization-name/very-long-repository-name-that-is-quite-lengthy',
  },
};

export const ManyCollections: Story = {
  args: {
    ...Default.args,
    collections: [
      ...mockCollections,
      {
        id: '4',
        name: 'Open Source',
        icon: 'Sparkles',
        repos: [],
        users: [],
        createdAt: '2024-03-07T10:00:00Z',
        updatedAt: '2024-03-07T10:00:00Z',
      },
      {
        id: '5',
        name: 'Side Projects',
        icon: 'Target',
        repos: [],
        users: [],
        createdAt: '2024-03-08T10:00:00Z',
        updatedAt: '2024-03-08T10:00:00Z',
      },
      {
        id: '6',
        name: 'Archive',
        icon: 'Package',
        repos: [],
        users: [],
        createdAt: '2024-03-09T10:00:00Z',
        updatedAt: '2024-03-09T10:00:00Z',
      },
      {
        id: '7',
        name: 'Research',
        icon: 'Lightbulb',
        repos: [],
        users: [],
        createdAt: '2024-03-10T10:00:00Z',
        updatedAt: '2024-03-10T10:00:00Z',
      },
    ],
  },
};
