import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ThemeProvider } from '@principal-ade/industry-theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RepoFileCityScreen } from './RepoFileCityScreen';
import { iceTangerineDarkTheme } from '../themes/iceTangerineDark';
import { AuthProvider } from '../context/AuthContext';
import { FeedPreferencesProvider } from '../context/FeedPreferencesContext';
import type { RootStackParamList } from '../navigation/types';

const Stack = createStackNavigator<RootStackParamList>();

// Mock user for auth context
const mockUser = {
  login: 'octocat',
  name: 'The Octocat',
  email: 'octocat@github.com',
  avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4',
  bio: 'GitHub mascot',
  company: 'GitHub',
  location: 'San Francisco',
  publicRepos: 8,
  followers: 1000,
  following: 0,
};

// Mock tokens for auth context
const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  githubToken: 'mock-github-token',
  expiresAt: Date.now() + 3600000,
};

// Wrapper component that provides all necessary context and navigation
const RepoFileCityScreenWrapper = ({
  owner,
  name,
}: {
  owner: string;
  name: string;
}) => {
  return (
    <SafeAreaProvider>
      <ThemeProvider theme={iceTangerineDarkTheme}>
        <AuthProvider initialTokens={mockTokens} initialUser={mockUser}>
          <FeedPreferencesProvider>
            <NavigationContainer>
              <Stack.Navigator
                screenOptions={{
                  headerShown: false,
                }}
              >
                <Stack.Screen
                  name="RepoFileCity"
                  component={RepoFileCityScreen}
                  initialParams={{
                    owner,
                    name,
                    fullName: `${owner}/${name}`,
                  }}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </FeedPreferencesProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

const meta: Meta<typeof RepoFileCityScreenWrapper> = {
  title: 'Screens/RepoFileCityScreen',
  component: RepoFileCityScreenWrapper,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof RepoFileCityScreenWrapper>;

export const ReactRepository: Story = {
  args: {
    owner: 'facebook',
    name: 'react',
  },
};

export const ReactNativeRepository: Story = {
  args: {
    owner: 'facebook',
    name: 'react-native',
  },
};

export const TypeScriptRepository: Story = {
  args: {
    owner: 'microsoft',
    name: 'TypeScript',
  },
};

export const ClaudeCodeRepository: Story = {
  args: {
    owner: 'anthropics',
    name: 'claude-code',
  },
};

export const SmallRepository: Story = {
  args: {
    owner: 'octocat',
    name: 'Hello-World',
  },
};

export const VueRepository: Story = {
  args: {
    owner: 'vuejs',
    name: 'core',
  },
};
