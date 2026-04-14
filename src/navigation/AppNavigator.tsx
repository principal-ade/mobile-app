import React from 'react';
import { View, StyleSheet, Image, Alert } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import {
  RootStackParamList,
  MainTabParamList,
  FeedStackParamList,
  WatchStackParamList,
  SearchStackParamList,
  StarredStackParamList,
  AboutStackParamList,
} from './types';
import AboutScreen from '../screens/AboutScreen';
import RepositoryListScreen from '../screens/RepositoryListScreen';
import DocumentScreen from '../screens/DocumentScreen';
import EmailVerificationScreen from '../screens/EmailVerificationScreen';
import FeedCustomizationScreen from '../screens/FeedCustomizationScreen';
import AddUserScreen from '../screens/AddUserScreen';
import AddRepoScreen from '../screens/AddRepoScreen';
import SwipeFeedScreen from '../screens/SwipeFeedScreen';
import FeedTabScreen from '../screens/FeedTabScreen';
import WatchTabScreen from '../screens/WatchTabScreen';
import StarredTabScreen from '../screens/StarredTabScreen';
import CardDetailScreen from '../screens/CardDetailScreen';
import SearchTabScreen from '../screens/SearchTabScreen';
import { SavedCardsScreen } from '../screens/SavedCardsScreen';
import RepoFileCityScreen from '../screens/RepoFileCityScreen';
import RepoReadmeScreen from '../screens/RepoReadmeScreen';
import TourFileCityScreen from '../screens/TourFileCityScreen';
import { UserProfileScreenContainer } from '../screens/UserProfileScreenContainer';
import { OrganizationScreenContainer } from '../screens/OrganizationScreenContainer';
import { useTheme } from '@principal-ade/industry-theme';
import { useAuth } from '../hooks/useAuth';
import { LucideIcon } from '../components/LucideIcon';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { parseGitHubUrl } from '../utils/githubUrlParser';
import { saveClickedResult } from '../utils/searchStorage';

const prefix = Linking.createURL('/');

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix, 'principal-ai://'],
  config: {
    screens: {
      EmailVerification: {
        path: 'auth/verify',
        parse: {
          state: (state: string) => state,
          email: (email: string) => decodeURIComponent(email),
        },
      },
      MainTabs: {
        screens: {
          Feed: {
            path: 'feed',
            screens: {
              FeedHome: '',
              SwipeFeed: 'swipe',
              CardDetail: 'card/:owner/:repo',
              SavedCards: 'saved',
              RepoFileCity: 'repo/:owner/:name',
              RepoReadme: 'repo/:owner/:name/readme',
              TourFileCity: 'tour/:owner/:name',
              UserProfile: 'user/:username',
              Organization: 'org/:orgLogin',
            },
          },
          Watch: {
            path: 'watch',
            screens: {
              WatchHome: '',
              RepoFileCity: 'repo/:owner/:name',
              RepoReadme: 'repo/:owner/:name/readme',
              TourFileCity: 'tour/:owner/:name',
              UserProfile: 'user/:username',
              Organization: 'org/:orgLogin',
            },
          },
          Search: {
            path: 'search',
            screens: {
              SearchHome: '',
              RepoFileCity: 'repo/:owner/:name',
              RepoReadme: 'repo/:owner/:name/readme',
              TourFileCity: 'tour/:owner/:name',
              UserProfile: 'user/:username',
              Organization: 'org/:orgLogin',
            },
          },
          Starred: {
            path: 'starred',
            screens: {
              StarredHome: '',
              RepoFileCity: 'repo/:owner/:name',
              RepoReadme: 'repo/:owner/:name/readme',
              TourFileCity: 'tour/:owner/:name',
              UserProfile: 'user/:username',
            },
          },
          About: {
            path: 'about',
            screens: {
              AboutHome: '',
              RepositoryList: 'repositories',
              Document: 'document/:owner/:repo',
              FeedCustomization: 'customize',
              AddUser: 'add-user',
              AddRepo: 'add-repo',
            },
          },
        },
      },
    },
  },
};

const RootStack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const FeedStack = createStackNavigator<FeedStackParamList>();
const WatchStack = createStackNavigator<WatchStackParamList>();
const SearchStack = createStackNavigator<SearchStackParamList>();
const StarredStack = createStackNavigator<StarredStackParamList>();
const AboutStack = createStackNavigator<AboutStackParamList>();


function UserAvatarIcon({ avatarUrl, color }: { avatarUrl: string; color: string }) {
  return (
    <Image
      source={{ uri: avatarUrl }}
      style={[styles.userAvatarIcon, { borderColor: color }]}
    />
  );
}

// Feed Stack Navigator
function FeedStackNavigator() {
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();

  return (
    <FeedStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <FeedStack.Screen
        name="FeedHome"
        component={FeedTabScreen}
        options={{ headerShown: false }}
      />
      {isAuthenticated && (
        <>
          <FeedStack.Screen
            name="SwipeFeed"
            component={SwipeFeedScreen}
            options={{ headerShown: false }}
          />
          <FeedStack.Screen
            name="CardDetail"
            component={CardDetailScreen}
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <FeedStack.Screen
            name="SavedCards"
            component={SavedCardsScreen}
            options={{ title: 'Saved Cards' }}
          />
          <FeedStack.Screen
            name="FeedCustomization"
            component={FeedCustomizationScreen}
            options={{ headerShown: false }}
          />
          <FeedStack.Screen
            name="AddUser"
            component={AddUserScreen}
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <FeedStack.Screen
            name="AddRepo"
            component={AddRepoScreen}
            options={{ headerShown: false, presentation: 'modal' }}
          />
        </>
      )}
      <FeedStack.Screen
        name="RepoFileCity"
        component={RepoFileCityScreen}
        options={{ headerShown: false }}
      />
      <FeedStack.Screen
        name="RepoReadme"
        component={RepoReadmeScreen}
        options={{ headerShown: false }}
      />
      <FeedStack.Screen
        name="TourFileCity"
        component={TourFileCityScreen}
        options={{ headerShown: false }}
      />
      <FeedStack.Screen
        name="UserProfile"
        component={UserProfileScreenContainer}
        options={({ route }) => ({ title: `@${route.params.username}`, headerShown: false })}
      />
      <FeedStack.Screen
        name="Organization"
        component={OrganizationScreenContainer}
        options={({ route }) => ({ title: route.params.orgLogin, headerShown: false })}
      />
    </FeedStack.Navigator>
  );
}

// Watch Stack Navigator
function WatchStackNavigator() {
  const { theme } = useTheme();

  return (
    <WatchStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <WatchStack.Screen
        name="WatchHome"
        component={WatchTabScreen}
        options={{ headerShown: false }}
      />
      <WatchStack.Screen
        name="RepoFileCity"
        component={RepoFileCityScreen}
        options={{ headerShown: false }}
      />
      <WatchStack.Screen
        name="RepoReadme"
        component={RepoReadmeScreen}
        options={{ headerShown: false }}
      />
      <WatchStack.Screen
        name="TourFileCity"
        component={TourFileCityScreen}
        options={{ headerShown: false }}
      />
      <WatchStack.Screen
        name="UserProfile"
        component={UserProfileScreenContainer}
        options={({ route }) => ({ title: `@${route.params.username}`, headerShown: false })}
      />
      <WatchStack.Screen
        name="Organization"
        component={OrganizationScreenContainer}
        options={({ route }) => ({ title: route.params.orgLogin, headerShown: false })}
      />
    </WatchStack.Navigator>
  );
}

// Search Stack Navigator
function SearchStackNavigator() {
  const { theme } = useTheme();

  return (
    <SearchStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <SearchStack.Screen
        name="SearchHome"
        component={SearchTabScreen}
        options={{ headerShown: false }}
      />
      <SearchStack.Screen
        name="RepoFileCity"
        component={RepoFileCityScreen}
        options={{ headerShown: false }}
      />
      <SearchStack.Screen
        name="RepoReadme"
        component={RepoReadmeScreen}
        options={{ headerShown: false }}
      />
      <SearchStack.Screen
        name="TourFileCity"
        component={TourFileCityScreen}
        options={{ headerShown: false }}
      />
      <SearchStack.Screen
        name="UserProfile"
        component={UserProfileScreenContainer}
        options={({ route }) => ({ title: `@${route.params.username}`, headerShown: false })}
      />
      <SearchStack.Screen
        name="Organization"
        component={OrganizationScreenContainer}
        options={({ route }) => ({ title: route.params.orgLogin, headerShown: false })}
      />
    </SearchStack.Navigator>
  );
}

// Starred Stack Navigator
function StarredStackNavigator() {
  const { theme } = useTheme();

  return (
    <StarredStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <StarredStack.Screen
        name="StarredHome"
        component={StarredTabScreen}
        options={{ headerShown: false }}
      />
      <StarredStack.Screen
        name="RepoFileCity"
        component={RepoFileCityScreen}
        options={{ headerShown: false }}
      />
      <StarredStack.Screen
        name="RepoReadme"
        component={RepoReadmeScreen}
        options={{ headerShown: false }}
      />
      <StarredStack.Screen
        name="TourFileCity"
        component={TourFileCityScreen}
        options={{ headerShown: false }}
      />
      <StarredStack.Screen
        name="UserProfile"
        component={UserProfileScreenContainer}
        options={({ route }) => ({ title: `@${route.params.username}`, headerShown: false })}
      />
    </StarredStack.Navigator>
  );
}

// About Stack Navigator
function AboutStackNavigator() {
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();

  return (
    <AboutStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <AboutStack.Screen
        name="AboutHome"
        component={AboutScreen}
        options={{ headerShown: false }}
      />
      {isAuthenticated && (
        <>
          <AboutStack.Screen
            name="RepositoryList"
            component={RepositoryListScreen}
            options={{ title: 'Repositories' }}
          />
          <AboutStack.Screen
            name="Document"
            component={DocumentScreen}
            options={({ route }) => ({ title: route.params.fileName })}
          />
          <AboutStack.Screen
            name="FeedCustomization"
            component={FeedCustomizationScreen}
            options={{ headerShown: false }}
          />
          <AboutStack.Screen
            name="AddUser"
            component={AddUserScreen}
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <AboutStack.Screen
            name="AddRepo"
            component={AddRepoScreen}
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <AboutStack.Screen
            name="SavedCards"
            component={SavedCardsScreen}
            options={{ title: 'Saved Cards' }}
          />
        </>
      )}
    </AboutStack.Navigator>
  );
}

// Track last tap time for double-tap detection on Search tab
let lastSearchTabTap = 0;
const DOUBLE_TAP_DELAY = 300; // milliseconds

function MainTabs() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingBottom: insets.bottom > 0 ? insets.bottom - 8 : 8,
          paddingTop: 8,
          height: 56 + (insets.bottom > 0 ? insets.bottom - 8 : 8),
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedStackNavigator}
        options={{
          tabBarIcon: ({ color }) => <LucideIcon name="List" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Watch"
        component={WatchStackNavigator}
        options={{
          tabBarIcon: ({ color }) => <LucideIcon name="Grid3x3" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchStackNavigator}
        options={{
          tabBarIcon: ({ color }) => <LucideIcon name="Search" size={24} color={color} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: async (e) => {
            const now = Date.now();
            const timeSinceLastTap = now - lastSearchTabTap;

            if (timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 0) {
              // Double tap detected - prevent default navigation
              e.preventDefault();
              lastSearchTabTap = 0; // Reset

              try {
                const clipboardContent = await Clipboard.getStringAsync();

                if (!clipboardContent?.trim()) {
                  Alert.alert('Clipboard Empty', 'No content found in clipboard');
                  return;
                }

                const parseResult = parseGitHubUrl(clipboardContent.trim());

                if (parseResult.type === 'invalid') {
                  Alert.alert('Invalid URL', 'Clipboard does not contain a valid GitHub URL');
                  return;
                }

                // Navigate to the appropriate screen
                if (parseResult.type === 'repo') {
                  const fullName = `${parseResult.owner}/${parseResult.repo}`;

                  await saveClickedResult({
                    type: 'repo',
                    id: fullName,
                    name: parseResult.repo,
                    owner: parseResult.owner,
                    avatarUrl: `https://github.com/${parseResult.owner}.png`,
                  });

                  navigation.navigate('Search', {
                    screen: 'RepoFileCity',
                    params: {
                      owner: parseResult.owner,
                      name: parseResult.repo,
                      fullName,
                    },
                  });
                } else if (parseResult.type === 'user') {
                  await saveClickedResult({
                    type: 'user',
                    id: parseResult.username,
                    name: parseResult.username,
                    login: parseResult.username,
                    avatarUrl: `https://github.com/${parseResult.username}.png`,
                  });

                  navigation.navigate('Search', {
                    screen: 'UserProfile',
                    params: {
                      username: parseResult.username,
                    },
                  });
                }
              } catch {
                Alert.alert('Error', 'Failed to read from clipboard');
              }
            } else {
              // Single tap - allow default navigation
              lastSearchTabTap = now;
            }
          },
        })}
      />
      <Tab.Screen
        name="Starred"
        component={StarredStackNavigator}
        options={{
          tabBarIcon: ({ color }) => <LucideIcon name="Star" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="About"
        component={AboutStackNavigator}
        options={{
          tabBarLabel: isAuthenticated && user ? 'You' : 'About',
          tabBarIcon: ({ color }) =>
            isAuthenticated && user ? (
              <UserAvatarIcon avatarUrl={user.avatar_url} color={color} />
            ) : (
              <LucideIcon name="Info" size={24} color={color} />
            ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { theme } = useTheme();
  const { isLoading, pendingVerification } = useAuth();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer
      key={pendingVerification ? 'verification' : 'main'}
      linking={pendingVerification ? undefined : linking}
    >
      <RootStack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {pendingVerification ? (
          <RootStack.Screen
            name="EmailVerification"
            component={EmailVerificationScreen}
            initialParams={{
              state: pendingVerification.state,
              email: pendingVerification.email,
            }}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <RootStack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <RootStack.Screen
              name="EmailVerification"
              component={EmailVerificationScreen}
              options={{
                title: 'Verify Email',
                headerShown: false,
                presentation: 'modal',
              }}
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
});
