import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '@a24z/industry-theme';

type RepositoryListScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'RepositoryList'
>;

interface Props {
  navigation: RepositoryListScreenNavigationProp;
}

export default function RepositoryListScreen({ navigation: _navigation }: Props) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.text, { color: theme.colors.text }]}>
        Repository List Screen
      </Text>
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
});
