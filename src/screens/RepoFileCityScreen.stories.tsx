import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ThemeProvider, iceTangerineDarkTheme } from '@principal-ade/industry-theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RepoFileCityScreen } from './RepoFileCityScreen';
import { AuthProvider } from '../context/AuthContext';
import CommitDetailScreen from './CommitDetailScreen';
import type { FeedStackParamList } from '../navigation/types';

const Stack = createStackNavigator<FeedStackParamList>();

// Mock user for auth context
const mockUser = {
  id: 583231,
  login: 'octocat',
  name: 'The Octocat',
  avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
  html_url: 'https://github.com/octocat',
};

// Mock tokens for auth context
const mockTokens = {
  githubAccessToken: 'mock-github-access-token',
  workosAccessToken: 'mock-workos-access-token',
  refreshToken: 'mock-refresh-token',
};

// Wrapper component that provides all necessary context
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
              <Stack.Screen
                name="CommitDetail"
                component={CommitDetailScreen}
              />
            </Stack.Navigator>
          </NavigationContainer>
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
