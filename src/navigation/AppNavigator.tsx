import React from 'react';
import { View, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { RootStackParamList, MainTabParamList } from './types';
import AboutScreen from '../screens/AboutScreen';
import RepositoryListScreen from '../screens/RepositoryListScreen';
import DocumentScreen from '../screens/DocumentScreen';
import EmailVerificationScreen from '../screens/EmailVerificationScreen';
import FeedCustomizationScreen from '../screens/FeedCustomizationScreen';
import AddUserScreen from '../screens/AddUserScreen';
import AddRepoScreen from '../screens/AddRepoScreen';
import SwipeFeedScreen from '../screens/SwipeFeedScreen';
import FeedTabScreen from '../screens/FeedTabScreen';
import ActivityTabScreen from '../screens/ActivityTabScreen';
import SavedTabScreen from '../screens/SavedTabScreen';
import CardDetailScreen from '../screens/CardDetailScreen';
import FileCityDemoScreen from '../screens/FileCityDemoScreen';
import SearchTabScreen from '../screens/SearchTabScreen';
import RepoFileCityScreen from '../screens/RepoFileCityScreen';
import { useTheme } from '@principal-ade/industry-theme';
import { useAuth } from '../hooks/useAuth';

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
          Feed: 'feed',
          Activity: 'activity',
          Search: 'search',
          Saved: 'saved',
          About: 'about',
        },
      },
    },
  },
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function FeedIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconContainer}>
      <View style={[styles.feedIcon, { borderColor: color }]}>
        <View style={[styles.feedLine, { backgroundColor: color }]} />
        <View style={[styles.feedLine, { backgroundColor: color, width: 12 }]} />
        <View style={[styles.feedLine, { backgroundColor: color, width: 8 }]} />
      </View>
    </View>
  );
}

function SavedIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconContainer}>
      <View style={[styles.savedIcon, { borderColor: color }]}>
        <View
          style={[
            styles.savedNotch,
            {
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
}

function AboutIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconContainer}>
      <View style={[styles.aboutIcon, { borderColor: color }]}>
        <View style={[styles.infoDot, { backgroundColor: color }]} />
        <View style={[styles.infoStem, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

function ActivityIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconContainer}>
      <View style={styles.activityIcon}>
        {/* 3x3 grid representing the heatmap */}
        {[0, 1, 2].map((row) => (
          <View key={row} style={styles.activityRow}>
            {[0, 1, 2].map((col) => (
              <View
                key={col}
                style={[
                  styles.activityCell,
                  {
                    backgroundColor: color,
                    opacity: (row * 3 + col) % 3 === 0 ? 0.3 : (row + col) % 2 === 0 ? 0.6 : 1,
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function SearchIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconContainer}>
      <View style={[styles.searchIconCircle, { borderColor: color }]} />
      <View
        style={[
          styles.searchIconHandle,
          { backgroundColor: color },
        ]}
      />
    </View>
  );
}

function UserAvatarIcon({ avatarUrl, color }: { avatarUrl: string; color: string }) {
  return (
    <View style={styles.iconContainer}>
      <Image
        source={{ uri: avatarUrl }}
        style={[styles.userAvatarIcon, { borderColor: color }]}
      />
    </View>
  );
}

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
        component={FeedTabScreen}
        options={{
          tabBarIcon: ({ color }) => <FeedIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Activity"
        component={ActivityTabScreen}
        options={{
          tabBarIcon: ({ color }) => <ActivityIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchTabScreen}
        options={{
          tabBarIcon: ({ color }) => <SearchIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedTabScreen}
        options={{
          tabBarIcon: ({ color }) => <SavedIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="About"
        component={AboutScreen}
        options={{
          tabBarLabel: isAuthenticated && user ? 'You' : 'About',
          tabBarIcon: ({ color }) =>
            isAuthenticated && user ? (
              <UserAvatarIcon avatarUrl={user.avatar_url} color={color} />
            ) : (
              <AboutIcon color={color} />
            ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { theme } = useTheme();
  const { isAuthenticated, isLoading, pendingVerification } = useAuth();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer
      key={pendingVerification ? 'verification' : 'main'}
      linking={pendingVerification ? undefined : linking}
    >
      <Stack.Navigator
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
          <Stack.Screen
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
            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="EmailVerification"
              component={EmailVerificationScreen}
              options={{
                title: 'Verify Email',
                headerShown: false,
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="FileCityDemo"
              component={FileCityDemoScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="RepoFileCity"
              component={RepoFileCityScreen}
              options={{ headerShown: false }}
            />
            {isAuthenticated && (
              <>
                <Stack.Screen
                  name="RepositoryList"
                  component={RepositoryListScreen}
                  options={{ title: 'Repositories' }}
                />
                <Stack.Screen
                  name="Document"
                  component={DocumentScreen}
                  options={({ route }) => ({ title: route.params.fileName })}
                />
                <Stack.Screen
                  name="FeedCustomization"
                  component={FeedCustomizationScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="AddUser"
                  component={AddUserScreen}
                  options={{ headerShown: false, presentation: 'modal' }}
                />
                <Stack.Screen
                  name="AddRepo"
                  component={AddRepoScreen}
                  options={{ headerShown: false, presentation: 'modal' }}
                />
                <Stack.Screen
                  name="SwipeFeed"
                  component={SwipeFeedScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="CardDetail"
                  component={CardDetailScreen}
                  options={{ headerShown: false, presentation: 'modal' }}
                />
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedIcon: {
    width: 18,
    height: 16,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  feedLine: {
    height: 2,
    width: 16,
    borderRadius: 1,
  },
  savedIcon: {
    width: 14,
    height: 18,
    borderWidth: 2,
    borderRadius: 2,
    position: 'relative',
  },
  savedNotch: {
    position: 'absolute',
    bottom: -2,
    left: '50%',
    marginLeft: -4,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    transform: [{ rotate: '180deg' }],
  },
  aboutIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginBottom: 1,
  },
  infoStem: {
    width: 2,
    height: 6,
    borderRadius: 1,
  },
  userAvatarIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  activityIcon: {
    width: 18,
    height: 18,
    justifyContent: 'space-between',
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activityCell: {
    width: 5,
    height: 5,
    borderRadius: 1,
  },
  searchIconCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    position: 'absolute',
    top: 2,
    left: 2,
  },
  searchIconHandle: {
    width: 2,
    height: 8,
    borderRadius: 1,
    position: 'absolute',
    bottom: 2,
    right: 4,
    transform: [{ rotate: '45deg' }],
  },
});
