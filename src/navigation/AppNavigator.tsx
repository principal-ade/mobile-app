import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import {
  RootStackParamList,
  MainTabParamList,
  TrailsStackParamList,
  RecentStackParamList,
  WatchStackParamList,
  PasteStackParamList,
  BookmarksStackParamList,
  AboutStackParamList,
} from './types';
import AboutScreen from '../screens/AboutScreen';
import RepositoryListScreen from '../screens/RepositoryListScreen';
import DocumentScreen from '../screens/DocumentScreen';
import EmailVerificationScreen from '../screens/EmailVerificationScreen';
import FeedCustomizationScreen from '../screens/FeedCustomizationScreen';
import AddUserScreen from '../screens/AddUserScreen';
import AddRepoScreen from '../screens/AddRepoScreen';
import TrailsTabScreen from '../screens/TrailsTabScreen';
import RecentTabScreen from '../screens/RecentTabScreen';
import WatchTabScreen from '../screens/WatchTabScreen';
import UserActivityScreen from '../screens/UserActivityScreen';
import { BookmarkedTopicsTrailsScreen } from '../screens/BookmarkedTopicsTrailsScreen';
import CommitDetailScreen from '../screens/CommitDetailScreen';
import { PasteTabScreen } from '../screens/PasteTabScreen';
import { SavedCardsScreen } from '../screens/SavedCardsScreen';
import { RepoFileCityScreen } from '../screens/RepoFileCityScreen';
import { TrailDetailScreen } from '../screens/TrailDetailScreen';
import { TopicDetailScreen } from '../screens/TopicDetailScreen';
import RepoReadmeScreen from '../screens/RepoReadmeScreen';
import TourFileCityScreen from '../screens/TourFileCityScreen';
import { UserProfileScreenContainer } from '../screens/UserProfileScreenContainer';
import { OrganizationScreenContainer } from '../screens/OrganizationScreenContainer';
import { useTheme } from '@principal-ade/industry-theme';
import { useAuth } from '../hooks/useAuth';
import { useMultiAccount } from '../context/MultiAccountContext';
import { LucideIcon } from '../components/LucideIcon';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { readClipboardTarget, alertClipboardPasteResult } from '../utils/clipboardPaste';
import { RecentViewChooser } from '../components/Trails/RecentViewChooser';

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
          Trails: {
            path: 'trails',
            screens: {
              TrailsHome: '',
              RepoFileCity: 'repo/:owner/:name',
              RepoReadme: 'repo/:owner/:name/readme',
              TourFileCity: 'tour/:owner/:name',
              UserProfile: 'user/:username',
              Organization: 'org/:orgLogin',
            },
          },
          Recent: {
            path: 'recent',
            screens: {
              RecentHome: '',
              RepoFileCity: 'repo/:owner/:name',
              RepoReadme: 'repo/:owner/:name/readme',
              TourFileCity: 'tour/:owner/:name',
              UserProfile: 'user/:username',
              Organization: 'org/:orgLogin',
            },
          },
          Paste: {
            path: 'paste',
            screens: {
              PasteHome: '',
              TrailDetail: 'trail/:trailId',
              TopicDetail: 'topic/:topicId',
              RepoFileCity: 'repo/:owner/:name',
              RepoReadme: 'repo/:owner/:name/readme',
              TourFileCity: 'tour/:owner/:name',
              UserProfile: 'user/:username',
              Organization: 'org/:orgLogin',
            },
          },
          Bookmarks: {
            path: 'bookmarks',
            screens: {
              BookmarksHome: '',
              TrailDetail: 'trail/:trailId',
              TopicDetail: 'topic/:topicId',
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
const TrailsStack = createStackNavigator<TrailsStackParamList>();
const RecentStack = createStackNavigator<RecentStackParamList>();
const WatchStack = createStackNavigator<WatchStackParamList>();
const PasteStack = createStackNavigator<PasteStackParamList>();
const BookmarksStack = createStackNavigator<BookmarksStackParamList>();
const AboutStack = createStackNavigator<AboutStackParamList>();


function UserAvatarIcon({ avatarUrl, color }: { avatarUrl: string; color: string }) {
  return (
    <Image
      source={{ uri: avatarUrl }}
      style={[styles.userAvatarIcon, { borderColor: color }]}
    />
  );
}

// Trails Stack Navigator
function TrailsStackNavigator() {
  const { theme } = useTheme();

  return (
    <TrailsStack.Navigator
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
      <TrailsStack.Screen
        name="TrailsHome"
        component={TrailsTabScreen}
        options={{ headerShown: false }}
      />
      <TrailsStack.Screen
        name="TrailDetail"
        component={TrailDetailScreen}
        options={{ title: 'Trail' }}
      />
      <TrailsStack.Screen
        name="RepoFileCity"
        component={RepoFileCityScreen}
        options={{ headerShown: false }}
      />
      <TrailsStack.Screen
        name="RepoReadme"
        component={RepoReadmeScreen}
        options={{ headerShown: false }}
      />
      <TrailsStack.Screen
        name="TourFileCity"
        component={TourFileCityScreen}
        options={{ headerShown: false }}
      />
      <TrailsStack.Screen
        name="UserProfile"
        component={UserProfileScreenContainer}
        options={({ route }) => ({ title: `@${route.params.username}`, headerShown: false })}
      />
      <TrailsStack.Screen
        name="Organization"
        component={OrganizationScreenContainer}
        options={({ route }) => ({ title: route.params.orgLogin, headerShown: false })}
      />
      <TrailsStack.Screen
        name="CommitDetail"
        component={CommitDetailScreen}
        options={{ headerShown: false }}
      />
    </TrailsStack.Navigator>
  );
}

// Recent Stack Navigator
function RecentStackNavigator() {
  const { theme } = useTheme();

  return (
    <RecentStack.Navigator
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
      <RecentStack.Screen
        name="RecentHome"
        component={RecentTabScreen}
        options={{ headerShown: false }}
      />
      <RecentStack.Screen
        name="TrailDetail"
        component={TrailDetailScreen}
        options={{ title: 'Trail' }}
      />
      <RecentStack.Screen
        name="RepoFileCity"
        component={RepoFileCityScreen}
        options={{ headerShown: false }}
      />
      <RecentStack.Screen
        name="RepoReadme"
        component={RepoReadmeScreen}
        options={{ headerShown: false }}
      />
      <RecentStack.Screen
        name="TourFileCity"
        component={TourFileCityScreen}
        options={{ headerShown: false }}
      />
      <RecentStack.Screen
        name="UserProfile"
        component={UserProfileScreenContainer}
        options={({ route }) => ({ title: `@${route.params.username}`, headerShown: false })}
      />
      <RecentStack.Screen
        name="Organization"
        component={OrganizationScreenContainer}
        options={({ route }) => ({ title: route.params.orgLogin, headerShown: false })}
      />
      <RecentStack.Screen
        name="CommitDetail"
        component={CommitDetailScreen}
        options={{ headerShown: false }}
      />
    </RecentStack.Navigator>
  );
}

// Watch Stack Navigator — currently unused; kept in case we resurrect the Watch tab.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        name="UserActivity"
        component={UserActivityScreen}
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
      <WatchStack.Screen
        name="CommitDetail"
        component={CommitDetailScreen}
        options={{ headerShown: false }}
      />
    </WatchStack.Navigator>
  );
}

// Paste Stack Navigator
function PasteStackNavigator() {
  const { theme } = useTheme();

  return (
    <PasteStack.Navigator
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
      <PasteStack.Screen
        name="PasteHome"
        component={PasteTabScreen}
        options={{ headerShown: false }}
      />
      <PasteStack.Screen
        name="TrailDetail"
        component={TrailDetailScreen}
        options={{ title: 'Trail' }}
      />
      <PasteStack.Screen
        name="TopicDetail"
        component={TopicDetailScreen}
        options={{ title: 'Topic' }}
      />
      <PasteStack.Screen
        name="RepoFileCity"
        component={RepoFileCityScreen}
        options={{ headerShown: false }}
      />
      <PasteStack.Screen
        name="RepoReadme"
        component={RepoReadmeScreen}
        options={{ headerShown: false }}
      />
      <PasteStack.Screen
        name="TourFileCity"
        component={TourFileCityScreen}
        options={{ headerShown: false }}
      />
      <PasteStack.Screen
        name="UserProfile"
        component={UserProfileScreenContainer}
        options={({ route }) => ({ title: `@${route.params.username}`, headerShown: false })}
      />
      <PasteStack.Screen
        name="Organization"
        component={OrganizationScreenContainer}
        options={({ route }) => ({ title: route.params.orgLogin, headerShown: false })}
      />
      <PasteStack.Screen
        name="CommitDetail"
        component={CommitDetailScreen}
        options={{ headerShown: false }}
      />
    </PasteStack.Navigator>
  );
}

// Bookmarked Stack Navigator
function BookmarksStackNavigator() {
  const { theme } = useTheme();

  return (
    <BookmarksStack.Navigator
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
      <BookmarksStack.Screen
        name="BookmarksHome"
        component={BookmarkedTopicsTrailsScreen}
        options={{ headerShown: false }}
      />
      <BookmarksStack.Screen
        name="TrailDetail"
        component={TrailDetailScreen}
        options={{ title: 'Trail' }}
      />
      <BookmarksStack.Screen
        name="TopicDetail"
        component={TopicDetailScreen}
        options={{ title: 'Topic' }}
      />
      <BookmarksStack.Screen
        name="RepoFileCity"
        component={RepoFileCityScreen}
        options={{ headerShown: false }}
      />
      <BookmarksStack.Screen
        name="RepoReadme"
        component={RepoReadmeScreen}
        options={{ headerShown: false }}
      />
      <BookmarksStack.Screen
        name="TourFileCity"
        component={TourFileCityScreen}
        options={{ headerShown: false }}
      />
      <BookmarksStack.Screen
        name="UserProfile"
        component={UserProfileScreenContainer}
        options={({ route }) => ({ title: `@${route.params.username}`, headerShown: false })}
      />
      <BookmarksStack.Screen
        name="CommitDetail"
        component={CommitDetailScreen}
        options={{ headerShown: false }}
      />
    </BookmarksStack.Navigator>
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
          <AboutStack.Screen
            name="UserProfile"
            component={UserProfileScreenContainer}
            options={({ route }) => ({ title: `@${route.params.username}`, headerShown: false })}
          />
        </>
      )}
    </AboutStack.Navigator>
  );
}

// Track last tap time for double-tap detection on Paste and About tabs
let lastPasteTabTap = 0;
let lastAboutTabTap = 0;
const DOUBLE_TAP_DELAY = 300; // milliseconds

function MainTabs() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();
  const [recentViewChooserVisible, setRecentViewChooserVisible] = useState(false);

  return (
    <>
    <Tab.Navigator
      initialRouteName="Trails"
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
        name="Trails"
        component={TrailsStackNavigator}
        options={{
          tabBarLabel: 'Inbox',
          tabBarIcon: ({ color }) => <LucideIcon name="Inbox" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Bookmarks"
        component={BookmarksStackNavigator}
        options={{
          tabBarIcon: ({ color }) => <LucideIcon name="Bookmark" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Paste"
        component={PasteStackNavigator}
        options={{
          tabBarLabel: 'Paste',
          tabBarIcon: ({ color }) => <LucideIcon name="ClipboardPaste" size={24} color={color} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: async (e) => {
            const now = Date.now();
            const timeSinceLastTap = now - lastPasteTabTap;

            if (timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 0) {
              // Double tap detected - paste from clipboard instead of navigating.
              // Shares readClipboardTarget with the Paste screen's button so both
              // resolve and navigate identically.
              e.preventDefault();
              lastPasteTabTap = 0; // Reset

              const result = await readClipboardTarget();

              if (result.status !== 'ok') {
                alertClipboardPasteResult(result.status);
                return;
              }

              const { target } = result;
              switch (target.type) {
                case 'trail':
                  navigation.navigate('Paste', {
                    screen: 'TrailDetail',
                    params: { trailId: target.trailId },
                  });
                  break;
                case 'topic':
                  navigation.navigate('Paste', {
                    screen: 'TopicDetail',
                    params: { topicId: target.topicId },
                  });
                  break;
                case 'repo':
                  navigation.navigate('Paste', {
                    screen: 'RepoFileCity',
                    params: {
                      owner: target.owner,
                      name: target.name,
                      fullName: target.fullName,
                    },
                  });
                  break;
                case 'user':
                  navigation.navigate('Paste', {
                    screen: 'UserProfile',
                    params: { username: target.username },
                  });
                  break;
              }
            } else {
              // Single tap - allow default navigation
              lastPasteTabTap = now;
            }
          },
        })}
      />
      <Tab.Screen
        name="Recent"
        component={RecentStackNavigator}
        options={{
          tabBarLabel: 'Recent',
          tabBarIcon: ({ color }) => <LucideIcon name="Clock" size={24} color={color} />,
        }}
        listeners={{
          // Long-press the Recent tab to switch between list and card views.
          tabLongPress: () => setRecentViewChooserVisible(true),
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
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (!isAuthenticated || !user) return;

            const now = Date.now();
            const timeSinceLastTap = now - lastAboutTabTap;

            if (timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 0) {
              // Double tap detected - navigate to user profile
              e.preventDefault();
              lastAboutTabTap = 0; // Reset

              navigation.navigate('About', {
                screen: 'UserProfile',
                params: {
                  username: user.login,
                },
              });
            } else {
              // Single tap - allow default navigation
              lastAboutTabTap = now;
            }
          },
        })}
      />
    </Tab.Navigator>
    <RecentViewChooser
      visible={recentViewChooserVisible}
      onClose={() => setRecentViewChooserVisible(false)}
    />
    </>
  );
}

export default function AppNavigator() {
  const { theme } = useTheme();
  const { isLoading, pendingVerification } = useAuth();
  const { activeAccountId } = useMultiAccount();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer
      key={pendingVerification ? 'verification' : `main-${activeAccountId}`}
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
