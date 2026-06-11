/**
 * TrailFeedCard — the trail analog of {@link RepoFeedCard}.
 *
 * A full-bleed, feed-style card fronted by a File City of the trail's
 * primary repo, with the trail's stop files highlighted. Above/below the
 * city it answers "what trail is this" at a glance: purpose chip, title,
 * author/age, and the repos + stop count it covers.
 *
 * Deliberately lightweight — it does not render the full route. Tapping
 * the card navigates to `TrailDetail`, where `TrailBriefCard` shows the
 * stops, notes, and sign-offs.
 *
 * Multi-repo trails: the card shows ONE city — the trail's "primary" repo
 * (the repo with the most stops, tie-broken by `repoNames` order) — and
 * highlights only that repo's stops.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useTheme } from '@principal-ade/industry-theme';
import type {
  CityData,
  HighlightLayer,
  FileTypeIconConfig,
} from '@principal-ai/file-city-builder';
import { createFileHighlightLayers } from '@principal-ai/file-city-builder';
import type { TrailPurpose } from '../../types/Trail';
import { getFileCityData } from '../../services/FileCityService';
import { FileCityCanvas } from '../FileCity/FileCityCanvas';
import { Logo } from '../Logo';
import { IndustryMarkdownInline } from '../IndustryMarkdown';
import { getTrailEyebrow } from './TrailBriefCard';

/** A single trail stop, reduced to what the card needs to highlight it. */
export interface TrailFeedCardStop {
  /** Repo-relative path of the file the stop pins. */
  sourcePath: string;
  /** "owner/repo" this stop's file lives in. Omit for single-repo trails. */
  repo?: string;
}

export interface TrailFeedCardTrail {
  /** Trail id — used to navigate to TrailDetail. */
  id: string;
  title: string;
  /** State-of-being tag; drives the eyebrow chip. Defaults to 'investigation'. */
  purpose?: TrailPurpose;
  /** Display name of the author. */
  author?: string;
  /** ISO 8601 timestamp; rendered as a relative age. */
  createdAt?: string;
  /** Repos the trail touches (e.g. ['owner/repo']). Used to pick the primary repo. */
  repoNames?: string[];
  /** The trail's stops (path + repo) — drives the File City highlights. */
  stops?: TrailFeedCardStop[];
  /** Fallback stop count when `stops` isn't supplied. */
  stopCount?: number;
  /** The trail's overview/summary — markdown, rendered (clipped) beneath the title. */
  overview?: string;
  /** Reviewer sign-off count — promotes an informative trail to "Verified". */
  signOffCount?: number;
}

export interface TrailFeedCardProps {
  trail: TrailFeedCardTrail;
  /** Optional eyebrow label shown above the card (e.g. "Good Morning"). */
  hourLabel?: string;
  /** Skip top safe-area inset (use when the parent already handles it). */
  skipTopInset?: boolean;
  /** Skip bottom safe-area inset (use when embedded above a tab bar). */
  skipBottomInset?: boolean;
  /** Overrides the default navigate-to-TrailDetail tap behavior. */
  onPress?: () => void;
}

function formatRelative(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 45) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.round(day / 7);
  if (wk < 5) return `${wk}w ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.round(day / 365);
  return `${yr}y ago`;
}

const FILE_CITY_BORDER = 2; // top + bottom border

export function TrailFeedCard({
  trail,
  hourLabel,
  skipTopInset = false,
  skipBottomInset = false,
  onPress,
}: TrailFeedCardProps) {
  const { theme } = useTheme();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<NavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const topInset = skipTopInset ? 0 : insets.top;
  const bottomInset = skipBottomInset ? 0 : insets.bottom;

  const [containerWidth, setContainerWidth] = useState(375);
  const [containerHeight, setContainerHeight] = useState(667);

  // City data state
  const [cityData, setCityData] = useState<CityData | null>(null);
  const [baseHighlightLayers, setBaseHighlightLayers] = useState<HighlightLayer[]>([]);
  const [iconMap, setIconMap] = useState<Map<string, FileTypeIconConfig>>(new Map());
  const [fileCityLoaded, setFileCityLoaded] = useState(false);
  const [fileCityError, setFileCityError] = useState(false);

  const eyebrow = getTrailEyebrow(theme, trail.purpose, trail.signOffCount ?? 0);
  const relative = formatRelative(trail.createdAt);

  // Pick the primary repo: the repo with the most stops, tie-broken by repoNames order.
  const primaryRepo = useMemo<string | null>(() => {
    const counts = new Map<string, number>();
    for (const s of trail.stops ?? []) {
      if (s.repo) counts.set(s.repo, (counts.get(s.repo) ?? 0) + 1);
    }
    if (counts.size === 0) return trail.repoNames?.[0] ?? null;
    // Candidate order: repoNames first (stable tie-break), then any remaining.
    const ordered = [
      ...(trail.repoNames ?? []),
      ...[...counts.keys()].filter((k) => !(trail.repoNames ?? []).includes(k)),
    ];
    let best: string | null = null;
    let bestN = -1;
    for (const name of ordered) {
      const n = counts.get(name) ?? 0;
      if (n > bestN) {
        best = name;
        bestN = n;
      }
    }
    return best;
  }, [trail.stops, trail.repoNames]);

  const [primaryOwner, primaryName] = useMemo(() => {
    if (!primaryRepo) return [undefined, undefined] as const;
    const idx = primaryRepo.indexOf('/');
    if (idx === -1) return [undefined, undefined] as const;
    return [primaryRepo.slice(0, idx), primaryRepo.slice(idx + 1)] as const;
  }, [primaryRepo]);

  // Stops belonging to the primary repo (or repo-less stops on a single-repo trail).
  const primaryStops = useMemo<TrailFeedCardStop[]>(() => {
    const stops = trail.stops ?? [];
    const singleRepo = (trail.repoNames?.length ?? 0) <= 1;
    return stops.filter(
      (s) => s.sourcePath && (s.repo === primaryRepo || (!s.repo && singleRepo)),
    );
  }, [trail.stops, primaryRepo, trail.repoNames]);

  const onContainerLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
    setContainerHeight(event.nativeEvent.layout.height);
  }, []);

  // Square city, capped so header + body still fit.
  const fileCitySize = Math.max(0, Math.min(containerWidth, containerHeight * 0.45));

  // Fetch city data for the primary repo.
  useEffect(() => {
    if (!primaryOwner || !primaryName) {
      setFileCityError(true);
      return;
    }
    let cancelled = false;
    setFileCityLoaded(false);
    setFileCityError(false);

    async function loadCityData(owner: string, repo: string) {
      try {
        const result = await getFileCityData(owner, repo);
        if (cancelled) return;
        setCityData(result.cityData);
        setFileCityLoaded(true);

        const files = result.cityData.buildings.map((b) => ({ path: b.path }));
        const { highlightLayers, iconMap: fileIconMap } = createFileHighlightLayers(files);
        // Dull file-type layers so the trail-stop highlights stand out.
        setBaseHighlightLayers(highlightLayers.map((layer) => ({ ...layer, opacity: 0.15 })));
        setIconMap(fileIconMap);
      } catch (err) {
        console.error('[TrailFeedCard] Failed to load city data:', err);
        if (!cancelled) setFileCityError(true);
      }
    }

    loadCityData(primaryOwner, primaryName);
    return () => {
      cancelled = true;
    };
  }, [primaryOwner, primaryName]);

  // Highlight layer for the trail's stop files.
  const stopHighlightLayers = useMemo<HighlightLayer[]>(() => {
    if (!cityData || primaryStops.length === 0) return [];
    return [
      {
        id: `trail-stops-${trail.id}`,
        name: 'Trail Stops',
        color: eyebrow.color,
        opacity: 0.85,
        enabled: true,
        priority: 102,
        items: primaryStops.map((s) => ({
          path: s.sourcePath,
          type: 'file' as const,
          renderStrategy: 'fill' as const,
        })),
      },
    ];
  }, [cityData, primaryStops, trail.id, eyebrow.color]);

  const allHighlightLayers = useMemo(
    () => [...baseHighlightLayers, ...stopHighlightLayers],
    [baseHighlightLayers, stopHighlightLayers],
  );

  const stopCount = trail.stops?.length ?? trail.stopCount;
  const repoLabel = trail.repoNames?.length ? trail.repoNames.join(', ') : null;
  const stopLabel =
    stopCount != null ? `${stopCount} stop${stopCount === 1 ? '' : 's'}` : null;
  const metaParts = [repoLabel, stopLabel].filter(Boolean) as string[];

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
      return;
    }
    navigation.navigate('TrailDetail', { trailId: trail.id });
  }, [onPress, navigation, trail.id]);

  return (
    <Pressable
      onPress={handlePress}
      onLayout={onContainerLayout}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.colors.background, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {hourLabel && (
        <View style={[styles.hourLabelContainer, { paddingTop: topInset + 16 }]}>
          <Text style={[styles.hourLabel, { color: theme.colors.textSecondary }]}>
            {hourLabel}
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={[styles.header, !hourLabel && { paddingTop: topInset + 16 }]}>
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={3}>
          {trail.title}
        </Text>
        {(trail.author || relative) && (
          <Text style={[styles.byline, { color: theme.colors.textSecondary }]}>
            {trail.author ?? 'Unknown'}
            {relative ? `  ·  ${relative}` : ''}
          </Text>
        )}
      </View>

      {/* File City Canvas */}
      <View
        style={[
          styles.fileCityContainer,
          {
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border,
            height: fileCitySize + FILE_CITY_BORDER,
          },
        ]}
      >
        {!fileCityLoaded && !fileCityError && (
          <View style={styles.fileCityPlaceholder}>
            <Logo width={120} height={120} color={theme.colors.textSecondary} opacity={0.6} />
          </View>
        )}
        {fileCityError ? (
          <View style={styles.fileCityPlaceholder}>
            <Logo width={80} height={80} color={theme.colors.textSecondary} opacity={0.4} />
          </View>
        ) : cityData ? (
          <View style={{ width: fileCitySize, height: fileCitySize }}>
            <FileCityCanvas
              cityData={cityData}
              highlightLayers={allHighlightLayers}
              iconMap={iconMap}
              showFileTypeIcons={true}
              backgroundColor="transparent"
              defaultDistrictColor="#4B5155"
              buildingBorderRadius={0}
              showDirectoryLabels={false}
              enableZoom={false}
              enablePan={false}
            />
          </View>
        ) : null}
      </View>

      {/* Body */}
      <View style={[styles.body, { paddingBottom: bottomInset + 16 }]}>
        {trail.overview ? (
          <View style={styles.overviewClip}>
            <IndustryMarkdownInline>{trail.overview}</IndustryMarkdownInline>
          </View>
        ) : null}
        {metaParts.length > 0 && (
          <Text style={[styles.meta, { color: theme.colors.textTertiary }]} numberOfLines={1}>
            {metaParts.join('  ·  ')}
          </Text>
        )}
        <Text style={[styles.cta, { color: eyebrow.color }]}>View trail →</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  hourLabelContainer: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  hourLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  byline: {
    fontSize: 13,
  },
  fileCityContainer: {
    width: '100%',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fileCityPlaceholder: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  overviewClip: {
    flex: 1,
    overflow: 'hidden',
  },
  meta: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
  cta: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 'auto',
  },
});

export default TrailFeedCard;
