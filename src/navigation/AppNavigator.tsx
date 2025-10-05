import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';
import LoginScreen from '../screens/LoginScreen';
import RepositoryListScreen from '../screens/RepositoryListScreen';
import DocumentScreen from '../screens/DocumentScreen';
import { useTheme } from '@a24z/industry-theme';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { theme } = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
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
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
