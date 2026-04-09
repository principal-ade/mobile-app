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
import SearchTabScreen from '../screens/SearchTabScreen';
import RepoFileCityScreen from '../screens/RepoFileCityScreen';
import TourFileCityScreen from '../screens/TourFileCityScreen';
import { useTheme } from '@principal-ade/industry-theme';
import { useAuth } from '../hooks/useAuth';
import { LucideIcon } from '../components/LucideIcon';

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


function UserAvatarIcon({ avatarUrl, color }: { avatarUrl: string; color: string }) {
  return (
    <Image
      source={{ uri: avatarUrl }}
      style={[styles.userAvatarIcon, { borderColor: color }]}
    />
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
          tabBarIcon: ({ color }) => <LucideIcon name="List" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Activity"
        component={ActivityTabScreen}
        options={{
          tabBarIcon: ({ color }) => <LucideIcon name="Grid3x3" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchTabScreen}
        options={{
          tabBarIcon: ({ color }) => <LucideIcon name="Search" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedTabScreen}
        options={{
          tabBarIcon: ({ color }) => <LucideIcon name="Bookmark" size={24} color={color} />,
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
              <LucideIcon name="Info" size={24} color={color} />
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
              name="RepoFileCity"
              component={RepoFileCityScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="TourFileCity"
              component={TourFileCityScreen}
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
  userAvatarIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
});
