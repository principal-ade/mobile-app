/**
 * RecentTrailsCardFeed — the "cards" view mode for the Recent tab.
 *
 * A vertically-paged feed of full-bleed {@link TrailFeedCard}s, one per
 * recently-visited trail. `TrailRecentlyVisitedEntry` carries no stops, so
 * each card lazily fetches its trail payload (via getTrailById) once it
 * becomes visible, then maps the payload's markers onto the card's stop
 * highlights. Until then the card renders from the entry alone (File City
 * of the repo, no per-stop highlights).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  type LayoutChangeEvent,
  type ViewToken,
} from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';
import {
  getTrailById,
  type TrailRecentlyVisitedEntry,
} from '../../services/TrailsApiService';
import type { TrailPayload } from '../../types/Trail';
import { TrailFeedCard, type TrailFeedCardTrail } from './TrailFeedCard';

interface RecentTrailsCardFeedProps {
  entries: TrailRecentlyVisitedEntry[];
  token?: string;
}

/** Build the card's trail props from the recently-visited entry alone. */
function entryToTrail(entry: TrailRecentlyVisitedEntry): TrailFeedCardTrail {
  return {
    id: entry.id,
    title: entry.title,
    author: entry.createdByLogin,
    createdAt: entry.updatedAt,
    repoNames: [`${entry.owner}/${entry.repo}`],
  };
}

/** Enrich the entry-derived trail with payload data (stops, purpose, summary). */
function enrichTrail(
  base: TrailFeedCardTrail,
  payload: TrailPayload,
  repoFullName: string,
): TrailFeedCardTrail {
  // Recent entries are single-repo, so treat every marker's file as living in
  // the entry's repo — no Purl resolution needed.
  const stops = payload.markers
    .map((m) => m.sourcePath)
    .filter((p): p is string => !!p)
    .map((sourcePath) => ({ sourcePath }));

  return {
    ...base,
    title: payload.title ?? base.title,
    purpose: payload.purpose,
    author: payload.author ?? base.author,
    createdAt: payload.createdAt ?? base.createdAt,
    repoNames: [repoFullName],
    stops,
    overview: payload.summary,
    signOffCount: payload.signOffs?.length ?? 0,
  };
}

const RecentTrailCardItem: React.FC<{
  entry: TrailRecentlyVisitedEntry;
  height: number;
  active: boolean;
  token?: string;
}> = ({ entry, height, active, token }) => {
  const [trail, setTrail] = useState<TrailFeedCardTrail>(() => entryToTrail(entry));
  const [enriched, setEnriched] = useState(false);

  // Fetch the payload the first time the card becomes visible.
  useEffect(() => {
    if (!active || enriched) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await getTrailById(entry.id, token);
        if (cancelled) return;
        setTrail((base) =>
          enrichTrail(base, res.payload, `${res.owner}/${res.repo}`),
        );
        setEnriched(true);
      } catch (err) {
        // Leave the entry-derived card in place; it still shows the repo city.
        console.warn('[RecentTrailsCardFeed] Failed to load trail payload:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, enriched, entry.id, token]);

  return (
    <View style={{ height }}>
      <TrailFeedCard trail={trail} skipTopInset skipBottomInset />
    </View>
  );
};

export function RecentTrailsCardFeed({ entries, token }: RecentTrailsCardFeedProps) {
  const { theme } = useTheme();
  const [pageHeight, setPageHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setPageHeight(e.nativeEvent.layout.height);
  }, []);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index != null) setActiveIndex(first.index);
    },
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const renderItem = useCallback(
    ({ item, index }: { item: TrailRecentlyVisitedEntry; index: number }) => (
      <RecentTrailCardItem
        entry={item}
        height={pageHeight}
        active={index === activeIndex}
        token={token}
      />
    ),
    [pageHeight, activeIndex, token],
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      onLayout={onLayout}
    >
      {pageHeight > 0 && (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={pageHeight}
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: pageHeight,
            offset: pageHeight * index,
            index,
          })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default RecentTrailsCardFeed;
