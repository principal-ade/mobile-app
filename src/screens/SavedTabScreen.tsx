import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTheme } from '@principal-ade/industry-theme';
import { useAuth } from '../hooks/useAuth';
import { SavedCardsScreen } from './SavedCardsScreen';
import type { MainTabParamList } from '../navigation/types';

type NavigationProp = BottomTabNavigationProp<MainTabParamList>;

function BookmarkIcon({ color, size = 64 }: { color: string; size?: number }) {
  const width = size * 0.6;
  const height = size * 0.8;
  const notchSize = size * 0.2;

  return (
    <View
      style={{
        width,
        height,
        borderWidth: 3,
        borderColor: color,
        borderRadius: 4,
        position: 'relative',
      }}
    >
      <View
        style={{
          position: 'absolute',
          bottom: -3,
          left: '50%',
          marginLeft: -notchSize / 2,
          width: 0,
          height: 0,
          borderLeftWidth: notchSize / 2,
          borderRightWidth: notchSize / 2,
          borderBottomWidth: notchSize / 2,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
          transform: [{ rotate: '180deg' }],
        }}
      />
    </View>
  );
}

/**
 * Saved tab wrapper that shows:
 * - SavedCardsScreen for authenticated users
 * - Sign-in prompt for guests
 */
export default function SavedTabScreen() {
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  if (isAuthenticated) {
    return <SavedCardsScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <BookmarkIcon color={theme.colors.textSecondary} size={64} />
        </View>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Save cards for later
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Sign in to save activity cards and access them anytime.
        </Text>
        <TouchableOpacity
          style={[styles.signInButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('About', { screen: 'AboutHome' })}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  signInButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
