import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '@a24z/industry-theme';
import { useAuth } from '../hooks/useAuth';

type RepositoryListScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'RepositoryList'
>;

interface Props {
  navigation: RepositoryListScreenNavigationProp;
}

export default function RepositoryListScreen({ navigation: _navigation }: Props) {
  const { theme } = useTheme();
  const { user, signOut } = useAuth();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <Text style={[styles.text, { color: theme.colors.text }]}>Welcome, {user?.name ?? user?.login}!</Text>
      <Text style={[styles.caption, { color: theme.colors.textSecondary }]}>GitHub OAuth connected.</Text>
      <Button title="Sign out" onPress={signOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 18,
  },
  caption: {
    marginVertical: 12,
  },
});
