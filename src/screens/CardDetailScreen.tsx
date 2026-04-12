import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import { useTheme } from '@principal-ade/industry-theme';
import { MobileRepoCard } from '../components/ActivityFeed/MobileRepoCard';
import type { FeedStackParamList } from '../navigation/types';
import type { RepoActivitySummary } from '../types/activity';

type NavigationProp = StackNavigationProp<FeedStackParamList, 'CardDetail'>;
type ScreenRouteProp = RouteProp<FeedStackParamList, 'CardDetail'>;

export function CardDetailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const { height } = useWindowDimensions();

  const { summary: serializedSummary } = route.params;

  // Convert serialized summary back to proper types
  const summary: RepoActivitySummary = {
    ...serializedSummary,
    latestCommitAt: new Date(serializedSummary.latestCommitAt),
  };

  // Reserve space for the bottom close button
  const closeButtonHeight = 50 + insets.bottom;
  const cardHeight = height - closeButtonHeight;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* MobileRepoCard fills the screen above the button */}
      <MobileRepoCard
        summary={summary}
        containerHeight={cardHeight}
        skipTopInset
      />

      {/* Close button at bottom */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[
          styles.closeButton,
          {
            backgroundColor: theme.colors.surface,
            paddingBottom: insets.bottom + 12,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.closeText, { color: theme.colors.text }]}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CardDetailScreen;
