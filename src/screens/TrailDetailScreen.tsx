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
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import type { SearchStackParamList } from '../navigation/types';
import type { TrailFetchResponse } from '../services/TrailsApiService';

type Props = StackScreenProps<SearchStackParamList, 'TrailDetail'>;

export const TrailDetailScreen: React.FC<Props> = ({ route }) => {
  const { trailId } = route.params;
  const { theme } = useTheme();
  const { token } = useAuth();
  const [state, setState] = React.useState<
    | { status: 'loading' }
    | { status: 'ok'; data: TrailFetchResponse }
    | { status: 'error'; message: string }
  >({ status: 'loading' });
  const [selection, setSelection] = React.useState<TrailBriefSelection>(null);

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
});
