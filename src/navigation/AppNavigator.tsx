import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList, MainTabParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import AboutScreen from '../screens/AboutScreen';
import RepositoryListScreen from '../screens/RepositoryListScreen';
import DocumentScreen from '../screens/DocumentScreen';
import { useTheme } from '@principal-ade/industry-theme';
import { useAuth } from '../hooks/useAuth';

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

function MainTabs() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

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
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => <FeedIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="About"
        component={AboutScreen}
        options={{
          tabBarIcon: ({ color }) => <AboutIcon color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { theme } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="MainTabs"
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
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
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
});
