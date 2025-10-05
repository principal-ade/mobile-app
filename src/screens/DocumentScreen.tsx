import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '@a24z/industry-theme';

type DocumentScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Document'>;
type DocumentScreenRouteProp = RouteProp<RootStackParamList, 'Document'>;

interface Props {
  navigation: DocumentScreenNavigationProp;
  route: DocumentScreenRouteProp;
}

export default function DocumentScreen({ navigation: _navigation, route }: Props) {
  const { theme } = useTheme();
  const { owner, repo, path, fileName } = route.params;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.text, { color: theme.colors.text }]}>
        Document: {fileName}
      </Text>
      <Text style={[styles.subtext, { color: theme.colors.textSecondary }]}>
        {owner}/{repo}/{path}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtext: {
    fontSize: 14,
  },
});
