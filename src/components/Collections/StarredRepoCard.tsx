import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';
import type { StarredRepo } from '../../types/collections';

export interface StarredRepoCardProps {
  repo: StarredRepo;
  collectionCount?: number;
  onAddToCollection?: () => void;
  onPress?: () => void;
}

export function StarredRepoCard({
  repo,
  collectionCount = 0,
  onAddToCollection,
  onPress,
}: StarredRepoCardProps) {
  const { theme } = useTheme();

  const handleActionPress = () => {
    if (onAddToCollection) {
      onAddToCollection();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        <Image
          source={{ uri: repo.owner_avatar_url }}
          style={styles.ownerAvatar}
        />
        <View style={styles.repoInfo}>
          <Text style={[styles.repoName, { color: theme.colors.text }]} numberOfLines={1}>
            {repo.name}
          </Text>
          <Text style={[styles.ownerName, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {repo.owner}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.addButton,
            collectionCount > 0
              ? { backgroundColor: theme.colors.surfaceVariant }
              : { backgroundColor: theme.colors.primary },
          ]}
          onPress={handleActionPress}
        >
          <Text
            style={[
              styles.addButtonText,
              { color: collectionCount > 0 ? theme.colors.text : theme.colors.onPrimary },
            ]}
          >
            {collectionCount > 0 ? collectionCount.toString() : '+'}
          </Text>
        </TouchableOpacity>
      </View>

      {repo.description && (
        <Text style={[styles.description, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {repo.description}
        </Text>
      )}

      <View style={styles.metadata}>
        <View style={styles.metadataRow}>
          {repo.language && (
            <View style={styles.languageTag}>
              <View style={[styles.languageDot, { backgroundColor: getLanguageColor(repo.language) }]} />
              <Text style={[styles.languageText, { color: theme.colors.textSecondary }]}>
                {repo.language}
              </Text>
            </View>
          )}
          <View style={styles.starCount}>
            <Text style={[styles.starIcon, { color: theme.colors.textSecondary }]}>★</Text>
            <Text style={[styles.starText, { color: theme.colors.textSecondary }]}>
              {formatStarCount(repo.stargazers_count)}
            </Text>
          </View>
        </View>

        {repo.topics && repo.topics.length > 0 && (
          <View style={styles.topicsRow}>
            {repo.topics.slice(0, 3).map((topic) => (
              <View
                key={topic}
                style={[styles.topicTag, { backgroundColor: theme.colors.surfaceVariant }]}
              >
                <Text style={[styles.topicText, { color: theme.colors.text }]} numberOfLines={1}>
                  {topic}
                </Text>
              </View>
            ))}
            {repo.topics.length > 3 && (
              <Text style={[styles.moreTopics, { color: theme.colors.textSecondary }]}>
                +{repo.topics.length - 3}
              </Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function formatStarCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    Java: '#b07219',
    Go: '#00ADD8',
    Rust: '#dea584',
    Ruby: '#701516',
    Swift: '#ffac45',
    Kotlin: '#A97BFF',
    'C++': '#f34b7d',
    C: '#555555',
    PHP: '#4F5D95',
    Shell: '#89e051',
  };
  return colors[language] || '#8b949e';
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ownerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  repoInfo: {
    flex: 1,
  },
  repoName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  ownerName: {
    fontSize: 13,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  metadata: {},
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  languageTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  languageText: {
    fontSize: 12,
  },
  starCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  starText: {
    fontSize: 12,
  },
  topicsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
    flexWrap: 'wrap',
  },
  topicTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: 120,
  },
  topicText: {
    fontSize: 11,
    fontWeight: '500',
  },
  moreTopics: {
    fontSize: 11,
    marginLeft: 4,
  },
});
