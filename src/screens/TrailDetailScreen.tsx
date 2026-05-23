/**
 * Screen that resolves a trail share id to its payload and renders the
 * brief card. Reached from the Search tab's clipboard double-tap when
 * the clipboard contains a `…/trail/<uuid>` URL, or from the Trails tab's
 * inbox / recently-visited row taps.
 *
 * Layout: the card's route list lives in a flex ScrollView that fills the
 * screen at rest. When the reader selects a row, the SelectedStopPanel
 * pins to the bottom 30% of the screen — the ScrollView compresses to
 * the remaining 70% and the route stays scrollable above the panel.
 */

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import type { StackScreenProps } from '@react-navigation/stack';
import { useTheme } from '@principal-ade/industry-theme';

import {
  getTrailEyebrowColor,
  SelectedStopPanel,
  TrailBriefCard,
  type TrailBriefSelection,
} from '../components/Trails/TrailBriefCard';
import { trailPayloadToBriefProps } from '../components/Trails/trailBriefAdapter';
import { useAuth } from '../hooks/useAuth';
import {
  getTrailById,
  recordTrailVisit,
  TrailsApiError,
} from '../services/TrailsApiService';
import { starTrail, unstarTrail } from '../services/StarsApiService';
import type { SearchStackParamList } from '../navigation/types';
import type { TrailFetchResponse } from '../services/TrailsApiService';

type Props = StackScreenProps<SearchStackParamList, 'TrailDetail'>;

export const TrailDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { trailId } = route.params;
  const { theme } = useTheme();
  const { token } = useAuth();
  const [state, setState] = React.useState<
    | { status: 'loading' }
    | { status: 'ok'; data: TrailFetchResponse }
    | { status: 'error'; message: string }
  >({ status: 'loading' });
  const [selection, setSelection] = React.useState<TrailBriefSelection>(null);
  // Tracks an in-flight star/unstar so the toggle can't double-fire while
  // the optimistic update is reconciling.
  const [starInFlight, setStarInFlight] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    setSelection(null);
    getTrailById(trailId, token ?? undefined)
      .then((data) => {
        if (cancelled) return;
        setState({ status: 'ok', data });
        // Fire-and-forget visit recording so the user's "recently
        // visited" list reflects this open. Anonymous viewers (no
        // token) are tracked separately on the server via a cookie
        // that mobile won't have — skip the call rather than send a
        // request the server will reject.
        if (token) {
          void recordTrailVisit(trailId, token).catch(() => {
            // Non-critical — silently ignore so a flaky visits write
            // never blocks the brief from rendering.
          });
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof TrailsApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Unable to load trail';
        setState({ status: 'error', message });
      });
    return () => {
      cancelled = true;
    };
  }, [trailId, token]);

  const isStarred = state.status === 'ok' ? state.data.starred : false;
  const canStar = state.status === 'ok' && !!token;

  const toggleStar = React.useCallback(async () => {
    if (state.status !== 'ok' || !token || starInFlight) return;
    const previous = state.data.starred;
    // Optimistic flip — revert on failure. The toggle is idempotent on the
    // server side; a failed call leaves the index untouched.
    setState({ status: 'ok', data: { ...state.data, starred: !previous } });
    setStarInFlight(true);
    try {
      if (previous) {
        await unstarTrail(trailId, token);
      } else {
        await starTrail(trailId, token);
      }
    } catch {
      setState((s) =>
        s.status === 'ok'
          ? { status: 'ok', data: { ...s.data, starred: previous } }
          : s,
      );
    } finally {
      setStarInFlight(false);
    }
  }, [state, token, trailId, starInFlight]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        canStar ? (
          <Pressable
            onPress={() => void toggleStar()}
            hitSlop={12}
            disabled={starInFlight}
            style={({ pressed }) => [
              styles.headerButton,
              { opacity: pressed || starInFlight ? 0.5 : 1 },
            ]}
            accessibilityLabel={isStarred ? 'Unstar trail' : 'Star trail'}
            accessibilityRole="button"
          >
            <StarIcon
              size={22}
              color={
                isStarred ? theme.colors.accent : theme.colors.textSecondary
              }
              filled={isStarred}
            />
          </Pressable>
        ) : undefined,
    });
  }, [
    navigation,
    canStar,
    isStarred,
    starInFlight,
    toggleStar,
    theme.colors.accent,
    theme.colors.textSecondary,
  ]);

  if (state.status === 'loading') {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator color={theme.colors.text} />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: theme.colors.background, padding: 24 },
        ]}
      >
        <Text
          style={{
            color: theme.colors.text,
            fontFamily: theme.fonts.body,
            fontSize: theme.fontSizes[2],
            textAlign: 'center',
          }}
        >
          {state.message}
        </Text>
      </View>
    );
  }

  const { payload } = state.data;
  const briefProps = trailPayloadToBriefProps(payload);
  const eyebrowColor = getTrailEyebrowColor(
    theme,
    briefProps.purpose,
    briefProps.signOffs?.length ?? 0,
  );

  // Resolve what the bottom panel should render based on the card's
  // current selection. Null when nothing is picked — in that state the
  // panel is hidden and the route gets the full screen.
  const panelContent = (() => {
    if (selection?.kind === 'overview') {
      return {
        description: briefProps.body,
        sourcePath: undefined as string | undefined,
      };
    }
    if (selection?.kind === 'stop') {
      const stop = briefProps.stops?.[selection.index];
      if (!stop) return null;
      return {
        description: stop.description,
        sourcePath: stop.sourcePath,
      };
    }
    return null;
  })();

  return (
    <View
      style={[styles.root, { backgroundColor: theme.colors.background }]}
    >
      {/* Route + cohort strips. The card owns its own internal scroll
          in screen mode, so we mount it directly in the flex root —
          wrapping in a ScrollView here would re-introduce the
          nested-virtualization warning and let the header scroll too. */}
      <View style={styles.cardWrap}>
        <TrailBriefCard
          {...briefProps}
          presentation="screen"
          hideSelectedPanel
          onSelectionChange={setSelection}
        />
      </View>

      {panelContent ? (
        <View style={styles.pinnedPanel}>
          <SelectedStopPanel
            theme={theme}
            eyebrowColor={eyebrowColor}
            sourcePath={panelContent.sourcePath}
            description={panelContent.description}
          />
        </View>
      ) : null}
    </View>
  );
};

/**
 * Header star icon — supports a filled state, which the shared `LucideIcon`
 * doesn't (it hardcodes `fill: 'none'`). Same path as the Lucide Star, just
 * with a togglable fill so the active state reads at a glance.
 */
const STAR_POINTS =
  '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2';

const StarIcon: React.FC<{ size: number; color: string; filled: boolean }> = ({
  size,
  color,
  filled,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Polygon
      points={STAR_POINTS}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={filled ? color : 'none'}
    />
  </Svg>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  cardWrap: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinnedPanel: {
    // Fixed slice of screen height; the ScrollView above flexes to
    // fill the remaining ~70%. The panel handles its own internal
    // scroll for the description text.
    height: '30%',
  },
  headerButton: {
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
});
