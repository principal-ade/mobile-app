import type { Meta, StoryObj } from '@storybook/react-native';
import { OrganizationScreen } from './OrganizationScreen';
import type { OrganizationInfo, OrgMember } from './OrganizationScreen';
import type { GitHubRepository } from '../types/github';

const meta: Meta<typeof OrganizationScreen> = {
  title: 'Screens/OrganizationScreen',
  component: OrganizationScreen,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof OrganizationScreen>;

// Mock data
const mockOrganization: OrganizationInfo = {
  login: 'facebook',
  name: 'Meta Platforms, Inc.',
  description: 'We are working to build community through open source technology. NB: members must have two-factor auth.',
  avatar_url: 'https://avatars.githubusercontent.com/u/69631?v=4',
  html_url: 'https://github.com/facebook',
  blog: 'https://opensource.fb.com',
  location: 'Menlo Park, California',
  email: 'opensource@fb.com',
  twitter_username: 'fbOpenSource',
  public_repos: 189,
  public_gists: 0,
  followers: 0,
  created_at: '2009-04-02T03:35:22Z',
};

const mockReactOrg: OrganizationInfo = {
  login: 'reactjs',
  name: 'React',
  description: 'React is a JavaScript library for building user interfaces.',
  avatar_url: 'https://avatars.githubusercontent.com/u/6412038?v=4',
  html_url: 'https://github.com/reactjs',
  blog: 'https://reactjs.org',
  location: null,
  email: null,
  twitter_username: 'reactjs',
  public_repos: 45,
  public_gists: 0,
  followers: 0,
  created_at: '2014-01-14T20:09:17Z',
};

const mockRepositories: GitHubRepository[] = [
  {
    id: 10270250,
    name: 'react',
    full_name: 'facebook/react',
    owner: {
      login: 'facebook',
      avatar_url: 'https://avatars.githubusercontent.com/u/69631?v=4',
    },
    description: 'The library for web and native user interfaces.',
    private: false,
    fork: false,
    stargazers_count: 228000,
    updated_at: '2024-03-15T10:30:00Z',
    html_url: 'https://github.com/facebook/react',
    language: 'JavaScript',
  },
  {
    id: 29028775,
    name: 'react-native',
    full_name: 'facebook/react-native',
    owner: {
      login: 'facebook',
      avatar_url: 'https://avatars.githubusercontent.com/u/69631?v=4',
    },
    description: 'A framework for building native applications using React',
    private: false,
    fork: false,
    stargazers_count: 118000,
    updated_at: '2024-03-14T15:20:00Z',
    html_url: 'https://github.com/facebook/react-native',
    language: 'C++',
  },
  {
    id: 146573305,
    name: 'create-react-app',
    full_name: 'facebook/create-react-app',
    owner: {
      login: 'facebook',
      avatar_url: 'https://avatars.githubusercontent.com/u/69631?v=4',
    },
    description: 'Set up a modern web app by running one command.',
    private: false,
    fork: false,
    stargazers_count: 102000,
    updated_at: '2024-03-13T09:15:00Z',
    html_url: 'https://github.com/facebook/create-react-app',
    language: 'JavaScript',
  },
  {
    id: 13991453,
    name: 'jest',
    full_name: 'facebook/jest',
    owner: {
      login: 'facebook',
      avatar_url: 'https://avatars.githubusercontent.com/u/69631?v=4',
    },
    description: 'Delightful JavaScript Testing.',
    private: false,
    fork: false,
    stargazers_count: 44000,
    updated_at: '2024-03-12T14:45:00Z',
    html_url: 'https://github.com/facebook/jest',
    language: 'TypeScript',
  },
  {
    id: 62117275,
    name: 'relay',
    full_name: 'facebook/relay',
    owner: {
      login: 'facebook',
      avatar_url: 'https://avatars.githubusercontent.com/u/69631?v=4',
    },
    description: 'Relay is a JavaScript framework for building data-driven React applications.',
    private: false,
    fork: false,
    stargazers_count: 18000,
    updated_at: '2024-03-11T11:30:00Z',
    html_url: 'https://github.com/facebook/relay',
    language: 'Rust',
  },
];

const mockMembers: OrgMember[] = [
  {
    id: 810438,
    login: 'gaearon',
    avatar_url: 'https://avatars.githubusercontent.com/u/810438?v=4',
  },
  {
    id: 1045023,
    login: 'sophiebits',
    avatar_url: 'https://avatars.githubusercontent.com/u/1045023?v=4',
  },
  {
    id: 3624098,
    login: 'sebmarkbage',
    avatar_url: 'https://avatars.githubusercontent.com/u/3624098?v=4',
  },
  {
    id: 1863771,
    login: 'acdlite',
    avatar_url: 'https://avatars.githubusercontent.com/u/1863771?v=4',
  },
  {
    id: 6412038,
    login: 'zpao',
    avatar_url: 'https://avatars.githubusercontent.com/u/6412038?v=4',
  },
  {
    id: 1714878,
    login: 'poteto',
    avatar_url: 'https://avatars.githubusercontent.com/u/1714878?v=4',
  },
  {
    id: 29597,
    login: 'vjeux',
    avatar_url: 'https://avatars.githubusercontent.com/u/29597?v=4',
  },
  {
    id: 2440089,
    login: 'rickhanlonii',
    avatar_url: 'https://avatars.githubusercontent.com/u/2440089?v=4',
  },
  {
    id: 1215767,
    login: 'kassens',
    avatar_url: 'https://avatars.githubusercontent.com/u/1215767?v=4',
  },
];

export const Loading: Story = {
  args: {
    loading: true,
  },
};

export const FacebookOrg: Story = {
  args: {
    organization: mockOrganization,
    repositories: mockRepositories,
    members: mockMembers,
    onClose: () => console.log('Close pressed'),
    onRepoPress: (owner, name, fullName) => console.log('Repo pressed:', fullName),
    onMemberPress: (username) => console.log('Member pressed:', username),
  },
};

export const ReactOrg: Story = {
  args: {
    organization: mockReactOrg,
    repositories: mockRepositories.slice(0, 3),
    members: mockMembers.slice(0, 6),
    onClose: () => console.log('Close pressed'),
    onRepoPress: (owner, name, fullName) => console.log('Repo pressed:', fullName),
    onMemberPress: (username) => console.log('Member pressed:', username),
  },
};

export const NoDescription: Story = {
  args: {
    organization: {
      ...mockOrganization,
      description: null,
      twitter_username: null,
    },
    repositories: mockRepositories.slice(0, 2),
    members: mockMembers.slice(0, 4),
    onClose: () => console.log('Close pressed'),
    onRepoPress: (owner, name, fullName) => console.log('Repo pressed:', fullName),
    onMemberPress: (username) => console.log('Member pressed:', username),
  },
};

export const EmptyRepos: Story = {
  args: {
    organization: mockOrganization,
    repositories: [],
    members: mockMembers,
    onClose: () => console.log('Close pressed'),
    onRepoPress: (owner, name, fullName) => console.log('Repo pressed:', fullName),
    onMemberPress: (username) => console.log('Member pressed:', username),
  },
};

export const EmptyMembers: Story = {
  args: {
    organization: mockOrganization,
    repositories: mockRepositories,
    members: [],
    onClose: () => console.log('Close pressed'),
    onRepoPress: (owner, name, fullName) => console.log('Repo pressed:', fullName),
    onMemberPress: (username) => console.log('Member pressed:', username),
  },
};

export const SmallOrg: Story = {
  args: {
    organization: {
      login: 'tailwindlabs',
      name: 'Tailwind Labs',
      description: 'Makers of Tailwind CSS.',
      avatar_url: 'https://avatars.githubusercontent.com/u/67109815?v=4',
      html_url: 'https://github.com/tailwindlabs',
      blog: 'https://tailwindcss.com',
      location: null,
      email: null,
      twitter_username: 'tailwindcss',
      public_repos: 24,
      public_gists: 0,
      followers: 0,
      created_at: '2020-06-30T18:01:33Z',
    },
    repositories: [
      {
        id: 145149982,
        name: 'tailwindcss',
        full_name: 'tailwindlabs/tailwindcss',
        owner: {
          login: 'tailwindlabs',
          avatar_url: 'https://avatars.githubusercontent.com/u/67109815?v=4',
        },
        description: 'A utility-first CSS framework for rapid UI development.',
        private: false,
        fork: false,
        stargazers_count: 81000,
        updated_at: '2024-03-15T10:30:00Z',
        html_url: 'https://github.com/tailwindlabs/tailwindcss',
        language: 'TypeScript',
      },
    ],
    members: mockMembers.slice(0, 3),
    onClose: () => console.log('Close pressed'),
    onRepoPress: (owner, name, fullName) => console.log('Repo pressed:', fullName),
    onMemberPress: (username) => console.log('Member pressed:', username),
  },
};
