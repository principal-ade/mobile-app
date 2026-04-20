/**
 * TabletRepoCard - Repository card with File City visualization for tablet layouts
 * Mirrors the desktop app's RepoCard design with horizontal layout
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';
import { LucideIcon } from './LucideIcon';
import { FileCityCanvas } from './FileCity/FileCityCanvas';
import type { CityData, HighlightLayer, FileTypeIconConfig } from '@principal-ai/file-city-builder';
import { getFileCityForRepo } from '../services/FileCityService';

export interface TabletRepoCardProps {
  owner: string;
  name: string;
  fullName: string;
  description?: string | null;
  language?: string | null;
  stars?: number;
  updatedAt?: string;
  createdAt?: string;
  isPinned?: boolean;
  onPress?: () => void;
}

/**
 * Format number with k/m suffix
 */
function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(num);
}

/**
 * Format last updated time
 */
function formatUpdatedTime(updatedAt: string): string {
  const updated = new Date(updatedAt);
  const now = new Date();
  const diffMs = now.getTime() - updated.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffYears > 0) {
    return `Updated ${diffYears}y ago`;
  }
  if (diffMonths > 0) {
    return `Updated ${diffMonths}mo ago`;
  }
  if (diffDays > 0) {
    return `Updated ${diffDays}d ago`;
  }
  return 'Updated recently';
}

/**
 * Format project age from creation date
 */
function formatProjectAge(createdAt: string): string {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffYears = Math.floor(diffDays / 365);

  if (diffYears > 0) {
    return `${diffYears}y old`;
  }
  if (diffDays > 0) {
    return `${diffDays}d old`;
  }
  return 'New';
}

/**
 * Get language color (simplified version)
 */
function getLanguageColor(language: string | null | undefined): string {
  const colors: Record<string, string> = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    Python: '#3572A5',
    Rust: '#dea584',
    Go: '#00ADD8',
    Java: '#b07219',
    'C++': '#f34b7d',
    C: '#555555',
    Ruby: '#701516',
    PHP: '#4F5D95',
    Swift: '#ffac45',
    Kotlin: '#A97BFF',
    Dart: '#00B4AB',
    CSS: '#563d7c',
    HTML: '#e34c26',
  };

  return colors[language || ''] || '#888888';
}

export function TabletRepoCard({
  owner,
  name,
  fullName,
  description,
  language,
  stars,
  updatedAt,
  createdAt,
  isPinned = false,
  onPress,
}: TabletRepoCardProps) {
  const { theme } = useTheme();
  const [cityData, setCityData] = useState<CityData | null>(null);
  const [highlightLayers, setHighlightLayers] = useState<HighlightLayer[]>([]);
  const [iconMap, setIconMap] = useState<Map<string, FileTypeIconConfig>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const languageColor = useMemo(() => getLanguageColor(language), [language]);

  // Fetch file tree and build city data
  useEffect(() => {
    let cancelled = false;

    const loadCityData = async () => {
      console.log(`[TabletRepoCard] Loading city data for ${fullName}...`);
      setLoading(true);
      setError(false);

      try {
        const result = await getFileCityForRepo(owner, name);

        if (!cancelled) {
          console.log(`[TabletRepoCard] Successfully loaded city data for ${fullName}`);
          setCityData(result.cityData);
          setHighlightLayers(result.highlightLayers);
          setIconMap(result.iconMap);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn(`[TabletRepoCard] Failed to load city data for ${fullName}:`, err);
          setError(true);
          setLoading(false);
        }
      }
    };

    loadCityData();

    return () => {
      cancelled = true;
    };
  }, [owner, name, fullName]);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Horizontal layout: File City left, content right */}
      <View style={styles.cardContent}>
        {/* File City - left side (square) */}
        <View style={[styles.cityContainer, { backgroundColor: theme.colors.background, borderRightColor: theme.colors.border }]}>
          {loading ? (
            <View style={styles.cityPlaceholder}>
              <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            </View>
          ) : error || !cityData ? (
            <View style={styles.cityPlaceholder}>
              <LucideIcon name="FolderGit2" size={48} color={theme.colors.textTertiary} style={{ opacity: 0.3 }} />
            </View>
          ) : (
            <View style={styles.cityWrapper}>
              <FileCityCanvas
                cityData={cityData}
                highlightLayers={highlightLayers}
                backgroundColor={theme.colors.background}
                showFileTypeIcons={true}
                iconMap={iconMap}
                enableZoom={false}
                enablePan={false}
              />
            </View>
          )}
        </View>

        {/* Repository info - right side */}
        <View style={styles.infoContainer}>
          {/* Repository name with pin indicator */}
          <View style={styles.repoNameRow}>
            <Text style={[styles.repoName, { color: theme.colors.text }]} numberOfLines={1}>
              {name}
            </Text>
            {isPinned && (
              <LucideIcon name="Pin" size={16} color={theme.colors.accent} />
            )}
          </View>

          {/* Timestamps */}
          {(updatedAt || createdAt) && (
            <Text style={[styles.timestamps, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {updatedAt && formatUpdatedTime(updatedAt)}
              {updatedAt && createdAt && ' • '}
              {createdAt && formatProjectAge(createdAt)}
            </Text>
          )}

          {/* Description */}
          {description && (
            <Text style={[styles.description, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {description}
            </Text>
          )}

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Bottom metadata */}
          <View style={styles.metadata}>
            {/* Language */}
            {language && (
              <View style={styles.metadataItem}>
                <View style={[styles.languageDot, { backgroundColor: languageColor }]} />
                <Text style={[styles.metadataText, { color: theme.colors.textTertiary }]}>{language}</Text>
              </View>
            )}

            {/* Stars */}
            {stars !== undefined && stars > 0 && (
              <View style={styles.metadataItem}>
                <Text style={styles.starEmoji}>⭐</Text>
                <Text style={[styles.metadataText, { color: theme.colors.textTertiary }]}>{formatNumber(stars)}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    minHeight: 180,
  },
  cityContainer: {
    width: 180,
    height: 180,
    borderRightWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cityPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityWrapper: {
    width: 180,
    height: 180,
  },
  infoContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-start',
  },
  repoNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  repoName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  timestamps: {
    fontSize: 12,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  spacer: {
    flex: 1,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  languageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  metadataText: {
    fontSize: 12,
  },
  starEmoji: {
    fontSize: 12,
  },
});
