import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@principal-ade/industry-theme';
import { LucideIcon } from '../components/LucideIcon';
import type { PasteStackParamList } from '../navigation/types';
import { readClipboardTarget, alertClipboardPasteResult } from '../utils/clipboardPaste';

type NavigationProp = StackNavigationProp<PasteStackParamList>;

export function PasteTabScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const handlePaste = useCallback(async () => {
    const result = await readClipboardTarget();

    if (result.status !== 'ok') {
      alertClipboardPasteResult(result.status);
      return;
    }

    const { target } = result;
    switch (target.type) {
      case 'trail':
        navigation.navigate('TrailDetail', { trailId: target.trailId });
        break;
      case 'topic':
        navigation.navigate('TopicDetail', { topicId: target.topicId });
        break;
      case 'repo':
        navigation.navigate('RepoFileCity', {
          owner: target.owner,
          name: target.name,
          fullName: target.fullName,
        });
        break;
      case 'user':
        navigation.navigate('UserProfile', { username: target.username });
        break;
    }
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Paste</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Open a GitHub, trail, or topic link from your clipboard
        </Text>
      </View>

      {/* Paste button */}
      <View style={styles.body}>
        <TouchableOpacity
          style={[styles.pasteButton, { backgroundColor: theme.colors.primary }]}
          onPress={handlePaste}
          activeOpacity={0.85}
        >
          <LucideIcon name="ClipboardPaste" size={20} color="#fff" />
          <Text style={styles.pasteButtonText}>Paste from clipboard</Text>
        </TouchableOpacity>
        <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
          Tip: double-tap the Paste tab to paste instantly.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignSelf: 'stretch',
  },
  pasteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
  },
});

export default PasteTabScreen;
